#!/usr/bin/env python3
"""JM Unique Bodies Atlas MCP v0.5.0 — independent identity, contact and becoming.
Zero third-party dependencies; local SQLite; stdio and stateless Streamable HTTP.
This is a separate body, not the JM Build Mesh / Workshop.
"""
from __future__ import annotations
import argparse, hashlib, json, math, os, re, sqlite3, sys, threading
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from pathlib import Path
from typing import Any

NAME = 'JM Unique Bodies Atlas'
VERSION = '0.7.0'
LEGACY = '2025-11-25'
MODERN = '2026-07-28'
SCHEMA = 'JM.UniqueBodies/0.4'
KIND = ('BODY','APP','AI','AGENT','GAME','API','MCP','DEVICE','SERVICE','KNOWLEDGE','TOOL','OTHER')
EVIDENCE = ('EXECUTION','TYPED_TRANSPORT','NATIVE_CONSEQUENCE','OWNER_CONTACT')
INVERSE_AXES = ('CONTAINS_CONTAINED','INPUT_OUTPUT','SOURCE_RECIPIENT','PRODUCER_CONSUMER','OBSERVER_OBSERVED','DRIVER_DRIVEN','CUSTOM')
INTENTS = ('uses','connects','adapts','inherits_capability','exposes_to','cooperates','descends_from')
VERSIONED = {LEGACY, MODERN, '2025-06-18', '2025-03-26'}
DB_DEFAULT = os.environ.get('JM_BODIES_DB', str(Path.home() / '.jm-unique-bodies' / 'atlas.sqlite3'))
ALLOWED_ID = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,127}$')

def canon(x: Any) -> str: return json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
def sha(x: Any) -> str: return hashlib.sha256((x if isinstance(x, bytes) else canon(x).encode())).hexdigest()
def failure(reason: str) -> ValueError: return ValueError(reason)
def required_text(value: Any, name: str, limit: int=256) -> str:
    if not isinstance(value, str) or not value.strip() or len(value)>limit: raise failure(f'{name}: expected non-empty string up to {limit} characters')
    return value.strip()
def identifier(value: Any, name='id') -> str:
    value=required_text(value, name, 128)
    if not ALLOWED_ID.fullmatch(value): raise failure(f'{name}: invalid identifier')
    return value

def check_port(p: dict) -> dict:
    if not isinstance(p,dict): raise failure('interface must be object')
    return {'name': identifier(p.get('name'),'interface.name'),
            'direction': p.get('direction') if p.get('direction') in ('in','out','bidirectional') else (_ for _ in ()).throw(failure('interface.direction must be in/out/bidirectional')),
            'signal_type': identifier(p.get('signal_type'),'interface.signal_type')}

def validate_body(b: Any) -> dict:
    if not isinstance(b, dict): raise failure('body must be object')
    caps=b.get('capabilities',[]); ports=b.get('interfaces',[])
    if not isinstance(caps,list) or len(caps)>60 or any(not isinstance(c,str) for c in caps): raise failure('capabilities: expected up to 60 strings')
    if not isinstance(ports,list) or len(ports)>60: raise failure('interfaces: expected up to 60 ports')
    src=b.get('source',{})
    if not isinstance(src,dict): raise failure('source must be object')
    src_label=required_text(src.get('label','owner description'),'source.label',500)
    digest=src.get('sha256')
    if digest is not None and (not isinstance(digest,str) or not re.fullmatch(r'[0-9a-fA-F]{64}',digest)):
        raise failure('source.sha256 must be a 64-character SHA-256 digest')
    kind=b.get('kind','BODY')
    if kind not in KIND: raise failure('invalid body.kind')
    out={'id':identifier(b.get('id')),'name':required_text(b.get('name'),'name'),
         'kind':kind,'description':required_text(b.get('description'),'description',2000),
         'capabilities':sorted(set(identifier(c,'capability') for c in caps)),
         'interfaces':[check_port(p) for p in ports],
         'source':{'label':src_label,'sha256':digest.lower() if digest else None},
         'authority':'DECLARED_NOT_VERIFIED'}
    if 'identity_key' in b: out['identity_key']=identifier(b['identity_key'],'identity_key')
    if len({p['name'] for p in out['interfaces']}) != len(out['interfaces']): raise failure('duplicate interface port name')
    return out

class Atlas:
    def __init__(self, db_path: str):
        self.db_path=str(db_path)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self.lock=threading.RLock()
        with self.connection() as c:
            c.executescript('''CREATE TABLE IF NOT EXISTS bodies(id TEXT PRIMARY KEY, data TEXT NOT NULL, fingerprint TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS evidence(id TEXT PRIMARY KEY, body_id TEXT NOT NULL, data TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, fingerprint TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS identity_keys(canonical TEXT PRIMARY KEY,body_id TEXT UNIQUE NOT NULL);
                CREATE TABLE IF NOT EXISTS scopes(id TEXT PRIMARY KEY, data TEXT NOT NULL, fingerprint TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS enclosures(id TEXT PRIMARY KEY, parent_id TEXT NOT NULL, child_id TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(parent_id, child_id));
                CREATE INDEX IF NOT EXISTS idx_enclosures_child ON enclosures(child_id);
                CREATE TABLE IF NOT EXISTS uses(seq INTEGER PRIMARY KEY AUTOINCREMENT, usage_id TEXT UNIQUE,
                    body_id TEXT NOT NULL, scope_id TEXT NOT NULL, data TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS idx_uses_body ON uses(body_id);
                CREATE INDEX IF NOT EXISTS idx_uses_scope ON uses(scope_id);
                CREATE TABLE IF NOT EXISTS projections(id TEXT PRIMARY KEY, body_id TEXT NOT NULL, scope_id TEXT NOT NULL, data TEXT NOT NULL, fingerprint TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS idx_projection_body ON projections(body_id);
                CREATE TABLE IF NOT EXISTS projection_pairs(id TEXT PRIMARY KEY, from_id TEXT NOT NULL, to_id TEXT NOT NULL, data TEXT NOT NULL, fingerprint TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS idx_pairs_from ON projection_pairs(from_id);
                CREATE INDEX IF NOT EXISTS idx_pairs_to ON projection_pairs(to_id);''')
            # Backfill one-time durable identity keys for v0.1 registrations.
            # Default key is original ID; explicit keys guard alternate IDs.
            for bid,serialized in c.execute('SELECT id,data FROM bodies'):
                b=json.loads(serialized)
                key=b.get('identity_key',bid)
                c.execute('INSERT OR IGNORE INTO identity_keys(canonical,body_id) VALUES (?,?)',(key,bid))
    @contextmanager
    def connection(self):
        c=sqlite3.connect(self.db_path,timeout=10)
        try:
            yield c
            c.commit()
        except BaseException:
            c.rollback()
            raise
        finally:
            c.close()
    def _get(self, table: str, ident: str):
        with self.connection() as c:
            x=c.execute(f'SELECT data FROM {table} WHERE id=?',(ident,)).fetchone()
        return json.loads(x[0]) if x else None
    def get(self, ident: str) -> dict:
        b=self._get('bodies',identifier(ident));
        if b is None: raise failure('UNKNOWN_BODY: '+ident)
        return b
    def _write(self, table: str, data: dict, action: str) -> dict:
        with self.lock, self.connection() as c:
            c.execute('BEGIN IMMEDIATE')  # atomic identity key uniqueness across processes
            ident=data['id']; serial=canon(data)
            existed=c.execute(f'SELECT data FROM {table} WHERE id=?',(ident,)).fetchone()
            if existed:
                if existed[0]!=serial: raise failure(f'IMMUTABLE_ID_CONFLICT: {ident} already exists with different content')
                return {'state':'ALREADY_PRESENT','id':ident,'fingerprint':sha(serial.encode())}
            if table=='bodies':
                identity=data.get('identity_key',ident)
                existing=c.execute('SELECT body_id FROM identity_keys WHERE canonical=?',(identity,)).fetchone()
                if existing and existing[0]!=ident:
                    raise failure(f'IDENTITY_REGISTERED_ONCE: {identity} already belongs to {existing[0]}')
                c.execute('INSERT INTO bodies VALUES(?,?,?)',(ident,serial,sha(serial.encode())))
                c.execute('INSERT INTO identity_keys(canonical,body_id) VALUES(?,?)',(identity,ident))
            else: c.execute(f'INSERT INTO {table} VALUES(?,?,?)',(ident,data.get('kind','EVIDENCE'),serial) if table=='proposals' else (ident,data['body_id'],serial))
            c.execute('INSERT INTO audit(action,fingerprint) VALUES(?,?)',(action,sha(serial.encode())))
        return {'state':'RECORDED_DECLARATION','id':ident,'fingerprint':sha(serial.encode())}
    def register(self, body: Any, apply: bool=False):
        b=validate_body(body)
        return {'body':b,'contact':'NO_EXECUTION_PROVEN', 'write':self._write('bodies',b,'body_register') if apply else {'state':'PLAN_ONLY'}}
    def inspect(self, body_id: str):
        b=self.get(body_id)
        with self.connection() as c:
            ev=[json.loads(r[0]) for r in c.execute('SELECT data FROM evidence WHERE body_id=? ORDER BY id',(body_id,))]
            links=[json.loads(r[0]) for r in c.execute('SELECT data FROM proposals WHERE kind=? ORDER BY id',('connection',))]
            morphs=[json.loads(r[0]) for r in c.execute('SELECT data FROM proposals WHERE kind=? ORDER BY id',('transformation',))]
        related=[p for p in links if p['from_id']==body_id or p.get('to_id')==body_id]
        projected=self.projections(body_id,limit=100)
        with self.connection() as c:usage_count=c.execute('SELECT COUNT(*) FROM uses WHERE body_id=?',(body_id,)).fetchone()[0]
        return {'body':b,'receipts':ev, 'connections':related,'descendant_plans':[x for x in morphs if x['parent_id']==body_id],
                'scope_perspectives':self.traverse(body_id=body_id)['perspectives'],
                'manifestations':projected['projections'],
                'manifestation_count':projected['total'],'manifestation_count_limited':projected['limited'],
                'paired_perspectives':projected['inversive_pairs'],'usage_occurrences':usage_count,
                'proof_state':{'evidence_items':len(ev),'verified_executions':0,'reason':'Recorded receipts are claims, not independently verified proof. No implied Ding.'}}
    def search(self, query: str='', kind: str='', limit: int=20):
        if kind and kind not in KIND: raise failure('invalid kind')
        lim=max(1,min(int(limit),100)); q=query.casefold()
        with self.connection() as c: allb=[json.loads(x[0]) for x in c.execute('SELECT data FROM bodies ORDER BY id')]
        matches=[b for b in allb if (not kind or b['kind']==kind) and (not q or q in canon(b).casefold())]
        return {'matches':matches[:lim],'total':len(matches),'boundary':'Local explicitly registered declarations, not Estate census/current authority'}
    def suggest(self, body_id: str, limit: int=10):
        b=self.get(body_id); caps=set(b['capabilities'])
        targets={
          'APP':(['ui.render','input.capture','state.persist'],'Phone/desktop application surface'),
          'AI':(['knowledge.query','reason.explain','tool.invoke'],'AI-callable knowledge and tool surface'),
          'AGENT':(['goal.plan','tool.invoke','state.persist'],'Governed autonomous assistant'),
          'MCP':(['tool.invoke','schema.expose'],'Cross-client MCP service interface'),
          'GAME':(['render.scene','input.capture','state.simulate'],'Interactive playable manifestation'),
          'API':(['schema.expose','event.handle'],'Typed remote capability endpoint'),
          'DEVICE':(['input.capture','device.bridge'],'Physical-device interaction'),
          'KNOWLEDGE':(['knowledge.query','source.trace'],'Traceable knowledge body'),
          'SERVICE':(['event.handle','state.persist'],'Hosted service'),
        }
        results=[]
        for kind,(required,meaning) in targets.items():
            matched=sorted(caps & set(required)); missing=sorted(set(required)-caps)
            results.append({'kind':kind,'potential':'CANDIDATE_ONLY','basis':meaning,'matched':matched,'missing':missing,'score_heuristic':round(len(matched)/len(required),3),'identity_rule':'A form is a USE of the same body until an independently authored body is separately established; source identity persists.'})
        return {'source':body_id,'forms':sorted(results,key=lambda r:(-r['score_heuristic'],r['kind']))[:max(1,min(10,int(limit)))],
                'rule':'Scores are compatibility prompts, not evidence, code generation or proof of functionality.'}
    def _match_ports(self,a:dict,b:dict):
        return [{'from':x['name'],'to':y['name'],'signal_type':x['signal_type']} for x in a['interfaces'] for y in b['interfaces']
                if x['signal_type']==y['signal_type'] and x['direction'] in ('out','bidirectional') and y['direction'] in ('in','bidirectional')]
    def connect(self, from_id: str, to: str, target_kind: str='BODY', relation: str='connects', apply: bool=False):
        source=self.get(from_id)
        if target_kind not in KIND: raise failure('invalid target_kind')
        if relation not in INTENTS: raise failure('invalid relation')
        target=required_text(to,'to',256)
        if target==from_id: raise failure('self-connections require distinct manifestations')
        recipient=self._get('bodies',target)
        if target_kind=='BODY' and recipient is None: raise failure('A BODY target must be registered or use an external target_kind')
        if recipient and target_kind!=recipient['kind']: raise failure('target_kind conflicts with registered body')
        matched=self._match_ports(source,recipient) if recipient else []
        packet={'kind':'connection','from_id':from_id,'from_fingerprint':sha(source),
                'to_id':target if recipient else None,'to_external':None if recipient else target,'target_kind':target_kind,
                'relation':relation,'typed_port_matches':matched,'status':'PLAN_ONLY',
                'boundaries':['No target execution','No typed transport until tested','No native consequence','No owner contact']}
        packet['id']='link.'+sha(packet)[:20]
        return {'plan':packet,'write':self._write('proposals',packet,'body_connect_plan') if apply else {'state':'PLAN_ONLY'}}
    def transform(self, body_id: str, new_kind: str, proposed_name: str, apply: bool=False):
        parent=self.get(body_id)
        if new_kind not in KIND: raise failure('invalid new_kind')
        name=required_text(proposed_name,'proposed_name')
        child_id=body_id+'.form.'+sha([new_kind,name])[:12]
        packet={'kind':'transformation','parent_id':body_id,'parent_fingerprint':sha(parent),
                'proposed_child_id':child_id,'proposed_name':name,'proposed_kind':new_kind,
                'new_body_registration':'NOT_IMPLIED_BY_MANIFESTATION', 'original_body_id':body_id,
                'status':'DESIGN_ONLY','inheritance':'CAPABILITY_REFERENCE_NOT_IDENTITY_REPLACEMENT',
                'gates':['New source artifact required','Explicit interfaces and runtime','Actual execution receipt','Typed transport evidence if connected','Native consequence when applicable','Owner-device contact when applicable']}
        packet['id']='morph.'+sha(packet)[:20]
        return {'proposal':packet,'write':self._write('proposals',packet,'body_transform_plan') if apply else {'state':'PLAN_ONLY'}}
    def evidence(self, body_id: str, stage: str, receipt: str, source: str, apply: bool=False):
        self.get(body_id)
        if stage not in EVIDENCE: raise failure('invalid evidence stage')
        packet={'body_id':body_id,'stage':stage,'receipt':required_text(receipt,'receipt',3000),'source':required_text(source,'source',500),
                'verification':'ASSERTED_UNVERIFIED','interpretation':'Receipt recorded; no independent verification or automatic promotion'}
        packet['id']='receipt.'+sha(packet)[:20]
        return {'receipt':packet,'write':self._write('evidence',packet,'body_evidence_claim') if apply else {'state':'PLAN_ONLY'}}
    def handoff(self, body_id: str, target: str, action: str='inspect'):
        b=self.get(body_id)
        dest=required_text(target,'target'); operation=required_text(action,'action')
        envelope={'schema':'JM.UniqueBodies.Handoff/0.1','source_body':body_id,'body_fingerprint':sha(b),
                  'target':dest,'requested_action':operation,'allowed_effect':'PLAN_ONLY','source_authority':'LOCAL_DECLARATION',
                  'required_return':['executor','actual_operations','typed_messages','native_effects','device_contact','receipt_sources'],
                  'laws':['MESH_NOT_MERGE','CONTACT_BEFORE_CROWN','NO_DING_NO_CLAIM','INTEGRATION_NOT_REPLACEMENT']}
        envelope['handoff_id']='handoff.'+sha(envelope)[:20]
        return envelope
    # v0.2 dual-O doctrine: the original body registers once. A scope is a
    # reusable place of operation, NOT an independently registered body.
    # Parent/child nesting is acyclic; USE events can repeat without limit.
    def define_scope(self, scope_id: str, name: str, anchor_body_id: str='', apply: bool=False, relative_scale=None):
        scope_id=identifier(scope_id,'scope_id')
        name=required_text(name,'scope name')
        if anchor_body_id: self.get(anchor_body_id)
        if relative_scale is not None:
            if isinstance(relative_scale,bool) or not isinstance(relative_scale,(int,float)) or not math.isfinite(relative_scale) or relative_scale<=0:
                raise failure('relative_scale must be a finite positive number')
        packet={'id':scope_id,'name':name,'anchor_body_id':anchor_body_id or None,
                'kind':'SCOPE','not_a_body_registration':True,
                'authority':'DECLARED_NOT_EXECUTED'}
        if relative_scale is not None:packet['relative_scale']=float(relative_scale)
        if not apply: return {'scope':packet,'write':{'state':'PLAN_ONLY'}}
        serial=canon(packet)
        with self.lock,self.connection() as c:
            c.execute('BEGIN IMMEDIATE')
            old=c.execute('SELECT data FROM scopes WHERE id=?',(scope_id,)).fetchone()
            if old:
                if old[0]!=serial: raise failure('IMMUTABLE_SCOPE_CONFLICT: '+scope_id)
                state='ALREADY_PRESENT'
            else:
                c.execute('INSERT INTO scopes VALUES(?,?,?)',(scope_id,serial,sha(serial.encode())))
                c.execute('INSERT INTO audit(action,fingerprint) VALUES (?,?)',('scope_define',sha(serial.encode())))
                state='SCOPE_DECLARED'
        return {'scope':packet,'write':{'state':state,'fingerprint':sha(serial.encode())}}

    def scope_get(self, scope_id: str):
        scope_id=identifier(scope_id,'scope_id')
        with self.connection() as c:
            x=c.execute('SELECT data FROM scopes WHERE id=?',(scope_id,)).fetchone()
        if not x: raise failure('UNKNOWN_SCOPE: '+scope_id)
        return json.loads(x[0])

    def enclose(self, parent_id: str, child_id: str, apply: bool=False, reference_mode: str='AUTO'):
        parent_id=identifier(parent_id,'parent_scope')
        child_id=identifier(child_id,'child_scope')
        if parent_id==child_id: raise failure('ENCLOSURE_CYCLE: scope cannot contain itself')
        if reference_mode not in ('AUTO','ORDINARY','INVERSIVE','OPEN'):
            raise failure('reference_mode must be AUTO/ORDINARY/INVERSIVE/OPEN')
        # Enforcement is under an SQLite write lock: concurrent requests must
        # never race a cycle into the hierarchy.
        with self.lock,self.connection() as c:
            c.execute('BEGIN IMMEDIATE')  # serialize cycle checks and insertion
            for name in (parent_id,child_id):
                if not c.execute('SELECT 1 FROM scopes WHERE id=?',(name,)).fetchone():
                    raise failure('UNKNOWN_SCOPE: '+name)
            record_parent=json.loads(c.execute('SELECT data FROM scopes WHERE id=?',(parent_id,)).fetchone()[0])
            record_child=json.loads(c.execute('SELECT data FROM scopes WHERE id=?',(child_id,)).fetchone()[0])
            pscale=record_parent.get('relative_scale');cscale=record_child.get('relative_scale')
            measured=('ENCLOSER_SMALLER' if pscale<cscale else ('ENCLOSER_LARGER' if pscale>cscale else 'EQUAL')) if pscale is not None and cscale is not None else 'UNSPECIFIED'
            inferred={'ENCLOSER_SMALLER':'INVERSIVE','ENCLOSER_LARGER':'ORDINARY','EQUAL':'OPEN','UNSPECIFIED':'OPEN'}[measured]
            mode=inferred if reference_mode=='AUTO' else reference_mode
            adjacency={}
            for parent,child in c.execute('SELECT parent_id,child_id FROM enclosures'):
                adjacency.setdefault(parent,set()).add(child)
            def reaches(start,goal):
                stack=[start];seen=set()
                while stack:
                    n=stack.pop()
                    if n==goal:return True
                    if n in seen:continue
                    seen.add(n);stack.extend(adjacency.get(n,()))
                return False
            if reaches(child_id,parent_id): raise failure('ENCLOSURE_CYCLE: reverse link would create a recursive identity trap')
            packet={'parent_scope':parent_id,'child_scope':child_id,
                    'meaning':'SCOPE_CONTAINS_SCOPE','reference_mode':mode,
                    'scale_order':measured,'encloser_relative_scale':pscale,'enclosed_relative_scale':cscale,
                    'reversible_view':True,
                    'body_registration_delta':0,'evidence':'DECLARED_RELATION_ONLY',
                'note':'Parent/child means containment role, not necessarily greater/smaller measured circle. INVERSIVE may place a larger represented O inside a smaller enclosing O.'}
            packet['id']='enclosure.'+sha([parent_id,child_id])[:20]
            if not apply:return {'enclosure':packet,'write':{'state':'PLAN_ONLY'}}
            serial=canon(packet)
            old=c.execute('SELECT data FROM enclosures WHERE id=?',(packet['id'],)).fetchone()
            if old:
                if old[0]!=serial:raise failure('ENCLOSURE_ID_CONFLICT')
                state='ALREADY_PRESENT'
            else:
                c.execute('INSERT INTO enclosures VALUES(?,?,?,?)',(packet['id'],parent_id,child_id,serial))
                c.execute('INSERT INTO audit(action,fingerprint) VALUES(?,?)',('scope_enclose',sha(packet)))
                state='ENCLOSURE_DECLARED'
        return {'enclosure':packet,'write':{'state':state}}

    def use_body(self, body_id: str, scope_id: str, role: str='operates_in',
                 direction: str='BOTH', note: str='', usage_key: str='', apply: bool=False, projection_id: str=''):
        body=self.get(body_id)
        scope=self.scope_get(scope_id)
        role=required_text(role,'role',128)
        if direction not in ('INWARD','OUTWARD','BOTH','CROSS'):
            raise failure('direction must be INWARD/OUTWARD/BOTH/CROSS')
        if not isinstance(note,str) or len(note)>1000: raise failure('note must be <=1000 characters')
        if usage_key:usage_key=identifier(usage_key,'usage_key')
        packet={'body_id':body_id,'body_fingerprint':sha(body),'scope_id':scope_id,
                'role':role,'direction':direction,'note':note,
                'source_anchor':scope['anchor_body_id'],
                'status':'USAGE_DECLARED_NOT_EXECUTED','new_body_registration':False,
                'proof':'Recording a usage is not proof that the underlying body executed'}
        if projection_id:
            projection=self.projection_get(projection_id)
            if projection['body_id']!=body_id or projection['scope_id']!=scope_id:
                raise failure('PROJECTION_BINDING_MISMATCH')
            packet['projection_id']=projection_id
        if not apply:return {'usage':{**packet,'usage_id':usage_key or 'ASSIGNED_WHEN_APPLIED'},'write':{'state':'PLAN_ONLY'}}
        with self.lock,self.connection() as c:
            c.execute('BEGIN IMMEDIATE')
            if usage_key:
                old=c.execute('SELECT data FROM uses WHERE usage_id=?',(usage_key,)).fetchone()
                if old:
                    prior=json.loads(old[0]);candidate={**packet,'usage_id':usage_key}
                    if prior!=candidate:raise failure('IMMUTABLE_USAGE_KEY_CONFLICT: '+usage_key)
                    return {'usage':prior,'write':{'state':'ALREADY_PRESENT'}}
            # A generated key identifies a distinct occurrence even if the
            # same body performs the same role in the same scope repeatedly.
            if usage_key:
                packet['usage_id']=usage_key
                c.execute('INSERT INTO uses (usage_id,body_id,scope_id,data) VALUES (?,?,?,?)',
                          (usage_key,body_id,scope_id,canon(packet)))
            else:
                cur=c.execute('INSERT INTO uses (usage_id,body_id,scope_id,data) VALUES (?,?,?,?)',
                              (None,body_id,scope_id,'{}'))
                usage_key='use.'+str(cur.lastrowid)
                packet['usage_id']=usage_key
                c.execute('UPDATE uses SET usage_id=?,data=? WHERE seq=?',
                          (usage_key,canon(packet),cur.lastrowid))
            c.execute('INSERT INTO audit(action,fingerprint) VALUES(?,?)',('body_use',sha(packet)))
        return {'usage':packet,'write':{'state':'USAGE_RECORDED','body_registration_delta':0}}

    def scopes(self):
        with self.connection() as c:
            spaces=[json.loads(x[0]) for x in c.execute('SELECT data FROM scopes ORDER BY id')]
            links=[json.loads(x[0]) for x in c.execute('SELECT data FROM enclosures ORDER BY parent_id,child_id')]
            usages=[json.loads(x[0]) for x in c.execute('SELECT data FROM uses ORDER BY seq DESC LIMIT 25')]
            total=c.execute('SELECT COUNT(*) FROM uses').fetchone()[0]
        return {'scopes':spaces,'enclosures':links,'latest_usages':usages,
                'usage_count':total,'usage_limit':'No architectural count ceiling; finite machine storage and read paging still apply',
                'body_registration_rule':'Scopes and usage records never register another body'}

    def traverse(self, body_id: str='', scope_id: str='', direction: str='BOTH', max_depth: int=16):
        if direction not in ('INWARD','OUTWARD','BOTH'):
            raise failure('direction must be INWARD/OUTWARD/BOTH')
        depth=max(0,min(64,int(max_depth)))
        if not (body_id or scope_id):raise failure('body_id or scope_id required')
        if body_id:self.get(body_id)
        if scope_id:self.scope_get(scope_id)
        with self.connection() as c:
            spaces={x['id']:x for x in (json.loads(r[0]) for r in c.execute('SELECT data FROM scopes'))}
            enclosures=[json.loads(r[0]) for r in c.execute('SELECT data FROM enclosures')]
            edges=[(e['parent_scope'],e['child_scope']) for e in enclosures]
            uses=c.execute('SELECT scope_id,COUNT(*) FROM uses WHERE body_id=? GROUP BY scope_id',(body_id,)).fetchall() if body_id else []
        anchored=[s['id'] for s in spaces.values() if s['anchor_body_id']==body_id] if body_id else []
        occupied=[s for s,_ in uses] if body_id else []
        starts=[scope_id] if scope_id else sorted(set(anchored+occupied))
        parents={};children={}
        for p,ch in edges:
            parents.setdefault(ch,set()).add(p);children.setdefault(p,set()).add(ch)
        def visit(start,mapping):
            paths=[];seen={start};front=[(start,[start])]
            while front:
                node,path=front.pop(0)
                if len(path)-1>=depth:continue
                for next_id in sorted(mapping.get(node,())):
                    # Distinct paths can lead to the same scope, but an acyclic
                    # graph makes each path finite. Each response is bounded.
                    q=path+[next_id];paths.append(q)
                    if len(paths)>=200:return paths,True
                    if next_id not in seen:
                        seen.add(next_id);front.append((next_id,q))
            return paths,False
        result=[]
        for sid in starts:
            if sid not in spaces:continue
            outer,otr=visit(sid,parents) if direction in ('OUTWARD','BOTH') else ([],False)
            inner,itr=visit(sid,children) if direction in ('INWARD','BOTH') else ([],False)
            result.append({'pivot_scope':sid,'anchored_here':sid in anchored,
                           'usage_occurrences_here':dict(uses).get(sid,0),
                           'OUTWARD_contained_by':outer, 'INWARD_contains':inner,
                           'OUTWARD_direct_relations':[e for e in enclosures if e['child_scope']==sid],
                           'INWARD_direct_relations':[e for e in enclosures if e['parent_scope']==sid],
                           'truncated':otr or itr})
        return {'body_id':body_id or None,'direction':direction,'perspectives':result,
                'registered_body_count_increased':False,
                'reading':'The same O can be INSIDE a larger OR smaller O, and contain another O. Enclosure and relative size are independent. Both traversal directions are relative to its pivot.',
                'note':'Inversive scale-containment is explicitly representable; viewpoint reversal does not itself prove causal, mathematical, or runtime inversion.'}

    # v0.3: A projection is an expression or carrier of a ONE-TIME registered
    # body. It is not itself a registered body. Two projections may be inversive
    # views of a shared root, without proving source execution or effects.
    def project(self, projection_id: str, body_id: str, scope_id: str, form_kind: str,
                carrier: str, role: str, direction: str='BOTH',
                input_signal: str='', output_signal: str='', apply: bool=False):
        pid=identifier(projection_id,'projection_id')
        body=self.get(body_id);scope=self.scope_get(scope_id)
        if form_kind not in KIND:raise failure('Invalid projection form_kind')
        carrier=required_text(carrier,'carrier',256)
        role=required_text(role,'role',128)
        if direction not in ('INWARD','OUTWARD','BOTH','CROSS'):raise failure('Invalid direction')
        if input_signal:input_signal=identifier(input_signal,'input_signal')
        if output_signal:output_signal=identifier(output_signal,'output_signal')
        packet={'id':pid,'body_id':body_id,'body_fingerprint':sha(body),
            'scope_id':scope_id,'scope_fingerprint':sha(scope),
            'form_kind':form_kind,'carrier':carrier,'role':role,'direction':direction,
            'input_signal':input_signal or None,'output_signal':output_signal or None,
            'stage':'DECLARED_PROJECTION_NOT_EXECUTED','identity_relation':'SAME_ORIGINAL_BODY',
            'not_new_registration':True,
            'proof_boundary':'Manifestation planning does not prove an app, agent, MCP or game actually executed'}
        if not apply:return {'projection':packet,'write':{'state':'PLAN_ONLY'}}
        serialized=canon(packet)
        with self.lock,self.connection() as c:
            c.execute('BEGIN IMMEDIATE')
            old=c.execute('SELECT data FROM projections WHERE id=?',(pid,)).fetchone()
            if old:
                if old[0]!=serialized:raise failure('IMMUTABLE_PROJECTION_CONFLICT: '+pid)
                state='ALREADY_PRESENT'
            else:
                c.execute('INSERT INTO projections VALUES(?,?,?,?,?)',(pid,body_id,scope_id,serialized,sha(serialized.encode())))
                c.execute('INSERT INTO audit(action,fingerprint) VALUES(?,?)',('body_project',sha(serialized.encode())))
                state='PROJECTION_DECLARED'
        return {'projection':packet,'write':{'state':state,'body_registration_delta':0}}

    def projection_get(self, projection_id: str):
        p=self._get('projections',identifier(projection_id,'projection_id'))
        if p is None:raise failure('UNKNOWN_PROJECTION: '+projection_id)
        return p

    def projections(self, body_id: str='', limit: int=100):
        if body_id:self.get(body_id)
        limit=max(1,min(1000,int(limit)))
        with self.connection() as c:
            if body_id:
                rows=c.execute('SELECT data FROM projections WHERE body_id=? ORDER BY id LIMIT ?',(body_id,limit)).fetchall()
            else:rows=c.execute('SELECT data FROM projections ORDER BY id LIMIT ?',(limit,)).fetchall()
            pairs=[json.loads(r[0]) for r in c.execute('SELECT data FROM projection_pairs ORDER BY id')]
            count=c.execute('SELECT COUNT(*) FROM projections WHERE body_id=?',(body_id,)).fetchone()[0] if body_id else c.execute('SELECT COUNT(*) FROM projections').fetchone()[0]
        values=[json.loads(row[0]) for row in rows]
        selected={p['id'] for p in values}
        return {'body_id':body_id or None,'projections':values,'total':count,'limited':len(values)<count,
            'inversive_pairs':[x for x in pairs if x['from_id'] in selected or x['to_id'] in selected],
            'body_registration_delta':0,'boundary':'Projections are descriptions of uses/carriers, not independent identities or executed apps'}

    def pair_projections(self, from_id: str, to_id: str, axis: str='CONTAINS_CONTAINED', apply: bool=False):
        if from_id==to_id:raise failure('Distinct projection positions required')
        # Reverse-order requests represent the same pair: no duplicate pair creation.
        from_id,to_id=sorted((from_id,to_id))
        a=self.projection_get(from_id);b=self.projection_get(to_id)
        if a['body_id']!=b['body_id']:raise failure('CROSS_IDENTITY_PAIR_REJECTED: use body_connect for distinct bodies')
        if axis not in INVERSE_AXES:raise failure('Unknown inverse axis')
        fwd=bool(a['output_signal'] and b['input_signal'] and a['output_signal']==b['input_signal'])
        reverse=bool(b['output_signal'] and a['input_signal'] and b['output_signal']==a['input_signal'])
        # These are *declarations* of paired perspectives, not proof of physical
        # or causal inversion. Missing signals require a real adapter or new work.
        packet={'from_id':from_id,'to_id':to_id,'original_body_id':a['body_id'],
                'axis':axis,'relationship':'PAIRED_VIEWS',
                'semantic_role_pair':{'CONTAINS_CONTAINED':['contains','is_contained_by'],'INPUT_OUTPUT':['output_to','input_from'],'SOURCE_RECIPIENT':['provides_to','receives_from'],'PRODUCER_CONSUMER':['produces_for','consumes_from'],'OBSERVER_OBSERVED':['observes','is_observed_by'],'DRIVER_DRIVEN':['drives','is_driven_by'],'CUSTOM':['relates_to','relates_from']}[axis],
                'forward_read':{'source':from_id,'recipient':to_id,'type_match':fwd},
                'inverse_read':{'source':to_id,'recipient':from_id,'type_match':reverse},
                'typed_gaps':([] if fwd else ['FORWARD_TYPED_ADAPTER_REQUIRED'])+([] if reverse else ['REVERSE_TYPED_ADAPTER_REQUIRED']),
                'mechanism':'REVERSIBLE_PERSPECTIVE_ONLY',
                'no_claims':['ACTUAL_TRANSPORT','CAUSAL_INVERSION','NATIVE_EXECUTION','OWNER_CONTACT'],
                'body_registration_delta':0}
        packet['id']='pair.'+sha([from_id,to_id,axis])[:20]
        if not apply:return {'pair':packet,'write':{'state':'PLAN_ONLY'}}
        serial=canon(packet)
        with self.lock,self.connection() as c:
            c.execute('BEGIN IMMEDIATE')
            old=c.execute('SELECT data FROM projection_pairs WHERE id=?',(packet['id'],)).fetchone()
            if old:
                if old[0]!=serial:raise failure('IMMUTABLE_PAIR_CONFLICT')
                state='ALREADY_PRESENT'
            else:
                c.execute('INSERT INTO projection_pairs VALUES(?,?,?,?,?)',(packet['id'],from_id,to_id,serial,sha(serial.encode())))
                c.execute('INSERT INTO audit(action,fingerprint) VALUES(?,?)',('projection_pair',sha(serial.encode())))
                state='PERSPECTIVES_PAIRED'
        return {'pair':packet,'write':{'state':state,'body_registration_delta':0}}

    def invert_pair(self, pair_id: str, side: str='INVERSE'):
        p=self._get('projection_pairs',identifier(pair_id,'pair_id'))
        if p is None:raise failure('UNKNOWN_PAIR: '+pair_id)
        if side not in ('FORWARD','INVERSE','BOTH'):raise failure('side must be FORWARD, INVERSE or BOTH')
        selected=[('FORWARD',p['forward_read']),('INVERSE',p['inverse_read'])]
        values=[{'perspective':key,**val,'semantic_role':p['semantic_role_pair'][0 if key=='FORWARD' else 1], 'requires_adapter':not val['type_match']} for key,val in selected if side in (key,'BOTH')]
        return {'pair_id':pair_id,'original_body_id':p['original_body_id'],'axis':p['axis'],
                'views':values,'mutation':False,'body_registration_delta':0,
                'interpretation':'Inversion here changes interpretive orientation and relation role, not the immutable source or executed causal direction.'}

    def use_projection(self, projection_id: str, role: str='', note: str='', usage_key: str='', apply: bool=False):
        p=self.projection_get(projection_id)
        return self.use_body(p['body_id'],p['scope_id'],role or p['role'],p['direction'],note,usage_key,apply,projection_id=projection_id)

    def graph(self):
        with self.connection() as c:
            bs=[json.loads(r[0]) for r in c.execute('SELECT data FROM bodies ORDER BY id')]
            plans=[json.loads(r[0]) for r in c.execute('SELECT data FROM proposals ORDER BY id')]
        nested=self.scopes()
        projected=self.projections(limit=1000)
        return {'nodes':[{'id':b['id'],'kind':b['kind'],'name':b['name']} for b in bs]+[{'id':s['id'],'kind':'SCOPE','name':s['name'],'anchor_body_id':s['anchor_body_id']} for s in nested['scopes']]+[{'id':p['id'],'kind':'PROJECTION','name':p['role'],'original_body_id':p['body_id']} for p in projected['projections']],
                'links':[{'id':p['id'],'kind':p['kind'],'from':p.get('from_id',p.get('parent_id')),
                          'to':p.get('to_id') or p.get('to_external') or p.get('proposed_child_id'),'state':p['status']} for p in plans]+[{'id':x['id'],'kind':'enclosure','from':x['parent_scope'],'to':x['child_scope'],'state':'DECLARED'} for x in nested['enclosures']]+[{'id':'parent.'+p['id'],'kind':'body_projection','from':p['body_id'],'to':p['id'],'state':p['stage']} for p in projected['projections']]+[{'id':v['id'],'kind':'paired_perspectives','from':v['from_id'],'to':v['to_id'],'state':v['mechanism']} for v in projected['inversive_pairs']],
                'usage_count':nested['usage_count'],'graph_projection_truncated':projected['limited'],'statement':'Containment scopes are declarations, not execution proof. One body, many uses; no auto-merges or re-registrations.'}
    def status(self):
        with self.connection() as c:
            counts={t:c.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0] for t in ('bodies','proposals','evidence','audit','scopes','enclosures','uses','projections','projection_pairs')}
        return {'name':NAME,'version':VERSION,'schema':SCHEMA,'transport':['stdio','stateless_streamable_http'],
                'jurisdiction':'Local one-time body declarations, unbounded usage instances, inversive nested scopes and reversible projection views',
                'doctrine':'REGISTER_ONCE_USE_UNBOUNDED_BOTH_DIRECTIONS_MANY_CARRIERS_REVERSIBLE_VIEWS',
                'counts':counts,'connections_to_existing':['JM Build Mesh — discovery/authority upstream, no automatic data access',
                'JM MCP Workshop — separate compose/test authority, no automatic execution'],
                'proof':'Atlas server execution can be tested locally; no JM body/runtime integration asserted by mere registration'}

TOOLS = [
 ('atlas_status','Report Atlas status and evidence boundary',{'type':'object','properties':{}}),
 ('body_register','Describe a unique body without equating description to executed source; apply=true saves locally',{'type':'object','properties':{'body':{'type':'object'},'apply':{'type':'boolean','default':False}},'required':['body']}),
 ('body_inspect','Inspect one body, proposed connections, descendants, and declared receipts',{'type':'object','properties':{'body_id':{'type':'string'}},'required':['body_id']}),
 ('body_search','Search explicitly registered unique bodies (not the whole JM Estate)',{'type':'object','properties':{'query':{'type':'string'},'kind':{'type':'string'},'limit':{'type':'integer'} }}),
 ('body_potential','Evaluate hypothetical APP AI MCP GAME DEVICE and other manifestations, showing missing mechanisms',{'type':'object','properties':{'body_id':{'type':'string'},'limit':{'type':'integer'}},'required':['body_id']}),
 ('body_connect','Plan a typed BODY↔BODY or external APP/AI/MCP connection; never execute it',{'type':'object','properties':{'from_id':{'type':'string'},'to':{'type':'string'},'target_kind':{'type':'string'},'relation':{'type':'string'},'apply':{'type':'boolean'}},'required':['from_id','to']}),
 ('body_transform','Plan a new manifestation with distinct identity, immutable parent, and explicit proof gates',{'type':'object','properties':{'body_id':{'type':'string'},'new_kind':{'type':'string'},'proposed_name':{'type':'string'},'apply':{'type':'boolean'}},'required':['body_id','new_kind','proposed_name']}),
 ('body_evidence','Record separately sourced claim of execution, typed transport, native consequence or owner contact; recording is not verification',{'type':'object','properties':{'body_id':{'type':'string'},'stage':{'type':'string'},'receipt':{'type':'string'},'source':{'type':'string'},'apply':{'type':'boolean'}},'required':['body_id','stage','receipt','source']}),
 ('body_handoff','Create provenance-bound PLAN_ONLY contract to other AI, app, MCP or runtime',{'type':'object','properties':{'body_id':{'type':'string'},'target':{'type':'string'},'action':{'type':'string'}},'required':['body_id','target']}),
 ('body_graph','Return a machine-readable body/connection/transformation design graph',{'type':'object','properties':{}}),
 ('scope_define','Declare a reusable O/scope; optionally anchor an existing body. NEVER re-registers a body.',{'type':'object','properties':{'scope_id':{'type':'string'},'name':{'type':'string'},'anchor_body_id':{'type':'string'},'relative_scale':{'type':'number'},'apply':{'type':'boolean'}},'required':['scope_id','name']}),
 ('scope_enclose','Declare O within O regardless of relative size: ORDINARY or INVERSIVE. Protects against cycles and duplicate registration.',{'type':'object','properties':{'parent_scope':{'type':'string'},'child_scope':{'type':'string'},'reference_mode':{'type':'string','enum':['AUTO','ORDINARY','INVERSIVE','OPEN']},'apply':{'type':'boolean'}},'required':['parent_scope','child_scope']}),
 ('body_use','Record another occurrence of the SAME registered body in any O with direction/role. Replay-safe with usage_key.',{'type':'object','properties':{'body_id':{'type':'string'},'scope_id':{'type':'string'},'role':{'type':'string'},'direction':{'type':'string','enum':['INWARD','OUTWARD','BOTH','CROSS']},'note':{'type':'string'},'usage_key':{'type':'string'},'apply':{'type':'boolean'}},'required':['body_id','scope_id']}),
 ('scope_list','List O scopes, containment edges and most recent usage records.',{'type':'object','properties':{}}),
 ('scope_traverse','From a registered body or O, navigate BOTH inward toward smaller circles and outward toward larger circles.',{'type':'object','properties':{'body_id':{'type':'string'},'scope_id':{'type':'string'},'direction':{'type':'string','enum':['INWARD','OUTWARD','BOTH']},'max_depth':{'type':'integer'} }}),
 ('body_project','Describe a carrier/role/manifestation of the SAME one-time registered body; does not create another body',{'type':'object','properties':{'projection_id':{'type':'string'},'body_id':{'type':'string'},'scope_id':{'type':'string'},'form_kind':{'type':'string'},'carrier':{'type':'string'},'role':{'type':'string'},'direction':{'type':'string','enum':['INWARD','OUTWARD','BOTH','CROSS']},'input_signal':{'type':'string'},'output_signal':{'type':'string'},'apply':{'type':'boolean'}},'required':['projection_id','body_id','scope_id','form_kind','carrier','role']}),
 ('body_projections','Inspect all declared manifestations of one body without re-registering or executing them',{'type':'object','properties':{'body_id':{'type':'string'},'limit':{'type':'integer'}}}),
 ('projection_pair','Pair two projections of SAME body as reversible perspectives, returning two separately evaluated typed adapter directions',{'type':'object','properties':{'from_id':{'type':'string'},'to_id':{'type':'string'},'axis':{'type':'string','enum':list(INVERSE_AXES)},'apply':{'type':'boolean'}},'required':['from_id','to_id']}),
 ('projection_invert','Read saved projection pair forward/inverse views without mutating or claiming physical inversion',{'type':'object','properties':{'pair_id':{'type':'string'},'side':{'type':'string','enum':['FORWARD','INVERSE','BOTH']}},'required':['pair_id']}),
 ('projection_use','Append a usage of an existing projection, keeping original body registration fixed; repeat with distinct usage keys',{'type':'object','properties':{'projection_id':{'type':'string'},'role':{'type':'string'},'note':{'type':'string'},'usage_key':{'type':'string'},'apply':{'type':'boolean'}},'required':['projection_id']}),

]

import contact_runtime, native_contact_runtime, cp07_atomic_runtime
TOOLS.extend(contact_runtime.TOOLS)
TOOLS.extend(native_contact_runtime.TOOLS)
TOOLS.extend(cp07_atomic_runtime.TOOLS)

def call(atlas:Atlas,name:str,a:dict):
    if not isinstance(a,dict): raise failure('tool arguments must be object')
    if name in ('atomic_contact_execute','atomic_contact_history'):
        return cp07_atomic_runtime.call(atlas,name,a)
    if name in ('native_contact_execute','native_contact_history'):
        return native_contact_runtime.call(atlas,name,a)
    if name in ('projection_signal','contact_history','contact_verify'):
        return contact_runtime.call(atlas,name,a)
    match name:
        case 'atlas_status': return atlas.status()
        case 'body_register': return atlas.register(a['body'],a.get('apply',False))
        case 'body_inspect': return atlas.inspect(a['body_id'])
        case 'body_search': return atlas.search(a.get('query',''),a.get('kind',''),a.get('limit',20))
        case 'body_potential': return atlas.suggest(a['body_id'],a.get('limit',10))
        case 'body_connect': return atlas.connect(a['from_id'],a['to'],a.get('target_kind','BODY'),a.get('relation','connects'),a.get('apply',False))
        case 'body_transform': return atlas.transform(a['body_id'],a['new_kind'],a['proposed_name'],a.get('apply',False))
        case 'body_evidence': return atlas.evidence(a['body_id'],a['stage'],a['receipt'],a['source'],a.get('apply',False))
        case 'body_handoff': return atlas.handoff(a['body_id'],a['target'],a.get('action','inspect'))
        case 'scope_define': return atlas.define_scope(a['scope_id'],a['name'],a.get('anchor_body_id',''),a.get('apply',False),a.get('relative_scale'))
        case 'scope_enclose': return atlas.enclose(a['parent_scope'],a['child_scope'],a.get('apply',False),a.get('reference_mode','AUTO'))
        case 'body_use': return atlas.use_body(a['body_id'],a['scope_id'],a.get('role','operates_in'),a.get('direction','BOTH'),a.get('note',''),a.get('usage_key',''),a.get('apply',False))
        case 'scope_list': return atlas.scopes()
        case 'scope_traverse': return atlas.traverse(a.get('body_id',''),a.get('scope_id',''),a.get('direction','BOTH'),a.get('max_depth',16))
        case 'body_project': return atlas.project(a['projection_id'],a['body_id'],a['scope_id'],a['form_kind'],a['carrier'],a['role'],a.get('direction','BOTH'),a.get('input_signal',''),a.get('output_signal',''),a.get('apply',False))
        case 'body_projections': return atlas.projections(a.get('body_id',''),a.get('limit',100))
        case 'projection_pair': return atlas.pair_projections(a['from_id'],a['to_id'],a.get('axis','CONTAINS_CONTAINED'),a.get('apply',False))
        case 'projection_invert': return atlas.invert_pair(a['pair_id'],a.get('side','INVERSE'))
        case 'projection_use': return atlas.use_projection(a['projection_id'],a.get('role',''),a.get('note',''),a.get('usage_key',''),a.get('apply',False))
        case 'body_graph': return atlas.graph()
        case _: raise failure('Unknown tool: '+name)

def dispatch(atlas:Atlas,req:dict):
    if not isinstance(req,dict) or req.get('jsonrpc')!='2.0': return {'jsonrpc':'2.0','id':req.get('id') if isinstance(req,dict) else None,'error':{'code':-32600,'message':'Invalid Request'}}
    method=req.get('method'); params=req.get('params') or {}
    if 'id' not in req: return None
    ident=req['id']; version=(params.get('_meta') or {}).get('io.modelcontextprotocol/protocolVersion') if isinstance(params,dict) else None
    meta={'io.modelcontextprotocol/serverInfo':{'name':NAME,'version':VERSION}} if version==MODERN else {}
    try:
        if method=='initialize':
            client_version=params.get('protocolVersion',LEGACY)
            result={'protocolVersion':client_version if client_version in (LEGACY,'2025-06-18','2025-03-26') else LEGACY,'capabilities':{'tools':{'listChanged':False}},'serverInfo':{'name':NAME,'version':VERSION},'instructions':'Independent identity, safe plans; nothing inferred as execution.'}
        elif method=='server/discover':
            result={'supportedVersions':[MODERN],'capabilities':{'tools':{}},'instructions':'JM Unique Bodies discovery. All writes explicit; all proofs separate.','cacheScope':'private','ttlMs':60000}
        elif method=='ping': result={}
        elif method=='tools/list': result={'tools':[{'name':n,'description':d,'inputSchema':s} for n,d,s in TOOLS]}
        elif method=='tools/call':
            val=call(atlas,params['name'],params.get('arguments',{}))
            result={'content':[{'type':'text','text':canon(val)}],'structuredContent':val,'isError':False}
        else: return {'jsonrpc':'2.0','id':ident,'error':{'code':-32601,'message':'Method not found'}}
        if meta:
            result['resultType']='complete'
            result['_meta']=meta
        return {'jsonrpc':'2.0','id':ident,'result':result}
    except (ValueError, KeyError, TypeError) as e:
        if method=='tools/call': return {'jsonrpc':'2.0','id':ident,'result':{'content':[{'type':'text','text':str(e)}],'isError':True}}
        return {'jsonrpc':'2.0','id':ident,'error':{'code':-32602,'message':str(e)}}

def serve_http(atlas:Atlas,host:str,port:int,token:str=''):
    if host not in ('127.0.0.1','::1','localhost') and not token:
        raise SystemExit('Refusing non-localhost binding without JM_BODIES_TOKEN')
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args): pass
        def respond(self,code,body=None):
            raw=canon(body).encode() if body is not None else b''
            self.send_response(code)
            if body is not None: self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(raw)))
            self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)
        def do_GET(self):
            if self.path in ('/atomic-field','/atomic-field/'):
                if host not in ('127.0.0.1','localhost','::1'): return self.respond(404,{'error':'Local UI only'})
                raw=Path(__file__).with_name('CONTACT_FIELD_CP07.html').read_bytes()
                self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw);return
            if self.path in ('/native-field','/native-field/'):
                if host not in ('127.0.0.1','localhost','::1'): return self.respond(404,{'error':'Local UI only'})
                raw=Path(__file__).with_name('CONTACT_FIELD_CP06.html').read_bytes()
                self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw);return
            if self.path in ('/contact-field','/contact-field/'):
                if host not in ('127.0.0.1','localhost','::1'): return self.respond(404,{'error':'Local UI only'})
                raw=Path(__file__).with_name('CONTACT_FIELD_CP05.html').read_bytes()
                self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw);return
            if self.path in ('/contact-lab','/contact-lab/'):
                if host not in ('127.0.0.1','localhost','::1'): return self.respond(404,{'error':'Local UI only'})
                raw=Path(__file__).with_name('CONTACT_LAB_v0_4.html').read_bytes()
                self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
            if self.path in ('/ui','/ui/'):
                # Inspection UI is intentionally enabled only for local-only hosting.
                if host not in ('127.0.0.1','localhost','::1'): return self.respond(404,{'error':'Local UI only'})
                raw=Path(__file__).with_name('ui.html').read_bytes()
                self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw);return
            if self.path=='/health': return self.respond(200,{'ok':True,'name':NAME,'version':VERSION})
            return self.respond(405,{'error':'POST /mcp required'})
        def do_POST(self):
            if urlparse(self.path).path!='/mcp': return self.respond(404,{'error':'Not found'})
            origin=self.headers.get('Origin','')
            if origin and origin not in ('http://127.0.0.1:'+str(port),'http://localhost:'+str(port)):
                return self.respond(403,{'error':'Origin not allowed'})
            if token and self.headers.get('Authorization')!='Bearer '+token: return self.respond(401,{'error':'Authorization required'})
            if self.headers.get('Content-Type','').split(';')[0].strip()!='application/json': return self.respond(415,{'error':'JSON required'})
            length=int(self.headers.get('Content-Length','0'))
            if length<1 or length>2_000_000: return self.respond(413,{'error':'Invalid body length'})
            try: req=json.loads(self.rfile.read(length))
            except (ValueError,UnicodeDecodeError): return self.respond(400,{'error':'Malformed JSON'})
            version=self.headers.get('MCP-Protocol-Version')
            if version==MODERN:
                accept=self.headers.get('Accept','')
                if 'application/json' not in accept or 'text/event-stream' not in accept: return self.respond(406,{'error':'Accept must include application/json and text/event-stream'})
                declared=((req.get('params') or {}).get('_meta') or {}).get('io.modelcontextprotocol/protocolVersion') if isinstance(req,dict) else None
                if declared!=version: return self.respond(400,{'error':'HeaderMismatch'})
                if self.headers.get('Mcp-Method')!=req.get('method'): return self.respond(400,{'error':'HeaderMismatch: Mcp-Method'})
                if req.get('method')=='tools/call' and self.headers.get('Mcp-Name')!=(req.get('params') or {}).get('name'): return self.respond(400,{'error':'HeaderMismatch: Mcp-Name'})
            elif version and version not in VERSIONED: return self.respond(400,{'error':'UnsupportedProtocolVersion','supported':[MODERN,LEGACY]})
            if isinstance(req,dict) and req.get('method')=='server/discover' and version!=MODERN:
                return self.respond(400,{'error':'Modern protocol version required'})
            response=dispatch(atlas,req)
            return self.respond(202 if response is None else 200,response)
    srv=ThreadingHTTPServer((host,port),Handler)
    print(f'{NAME} HTTP listening at http://{host}:{srv.server_address[1]}/mcp',file=sys.stderr,flush=True)
    srv.serve_forever()

def serve_stdio(atlas:Atlas):
    for line in sys.stdin:
        try: response=dispatch(atlas,json.loads(line))
        except Exception as e: response={'jsonrpc':'2.0','id':None,'error':{'code':-32700,'message':'Parse error'}}
        if response is not None: print(canon(response),flush=True)

def main():
    p=argparse.ArgumentParser(description=NAME)
    p.add_argument('--transport',choices=['stdio','http'],default='stdio')
    p.add_argument('--db',default=DB_DEFAULT)
    p.add_argument('--host',default='127.0.0.1')
    p.add_argument('--port',type=int,default=int(os.environ.get('PORT','8765')))
    x=p.parse_args(); atlas=Atlas(x.db)
    if x.transport=='stdio': serve_stdio(atlas)
    else: serve_http(atlas,x.host,x.port,os.environ.get('JM_BODIES_TOKEN',''))
if __name__=='__main__': main()
