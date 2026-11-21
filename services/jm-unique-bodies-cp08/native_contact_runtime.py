"""CP06 REAL native donor source -> explicit adapter -> persisted Atlas MCP tool route.
    Original source SHA pinned; no external processes beyond fixed Node binary/script.
    No network or physical Android original-source claims.
"""
import json, subprocess, hashlib, pathlib, shutil, re
import contact_runtime

ROOT=pathlib.Path(__file__).resolve().parent
NODE=ROOT/'native_donor_exec.mjs'
BID='jm.contact.cp04'; APP='jm.cp04.app'; AI='jm.cp04.ai'
PINS={'field-primitives-native.mjs':'ed63ceeb77ba88395eda7aa9f753eddf75e7bf34de5107321dc94e8b068f21c2',
      'native-core.mjs':'b794c4612a7ef69751270b7ea223894526216233414ef70c3845229d043d44a4',
      'native-corpus.mjs':'287f92439d34b71f2e1487ee2b96af069c7542b32397b99a0065463bc0f8fc07'}
def canon(v):return json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def sha(v):return hashlib.sha256(v.encode() if isinstance(v,str) else v).hexdigest()
def pinned():
    for file,digest in PINS.items():
        p=ROOT/'vendor'/'jm-sovereign-batch-three'/file
        if not p.is_file() or sha(p.read_bytes())!=digest:raise ValueError('SOURCE_INTEGRITY_HOLD:'+file)
    if not NODE.is_file():raise ValueError('NATIVE_RUNNER_MISSING')

def initialize(atlas):
    with atlas.connection() as c:
        c.execute('''CREATE TABLE IF NOT EXISTS native_contact_runs (
           run_key TEXT PRIMARY KEY, run_data TEXT NOT NULL, receipt_hash TEXT NOT NULL)''')

def seed(atlas):
    # Must match inherited CP05 one-time identity byte-for-byte when it exists.
    body={'id':BID,'name':'JM CP04 Contact Field','kind':'BODY',
      'description':'One-time identity demonstration for typed projection transport; not an external source donor',
      'capabilities':['event.handle','state.persist'],
      'interfaces':[{'name':'port','direction':'bidirectional','signal_type':'jm.cp04.signal.v1'}],
      'source':{'label':'CP04 local contact test declaration'}}
    atlas.register(body,True)
    for sid,name in [('jm.cp04.outer','APP Outer O'),('jm.cp04.inner','AI Inner O')]:atlas.define_scope(sid,name,BID,True)
    for pid,sid,kind,role in [(APP,'jm.cp04.outer','APP','interface'),(AI,'jm.cp04.inner','AI','receiver')]:
        atlas.project(pid,BID,sid,kind,'MCP Contact Lab',role,'BOTH','jm.cp04.signal.v1','jm.cp04.signal.v1',True)
    return atlas.pair_projections(APP,AI,'INPUT_OUTPUT',True)['pair']['id']

def run(atlas, run_key, mode='BOTH', pressure=5, glyph='?', apply=False):
    initialize(atlas)
    if not isinstance(run_key,str) or not re.fullmatch(r'[A-Za-z0-9][\w.:-]{2,110}',run_key):raise ValueError('INVALID_RUN_KEY')
    if mode not in ('BOTH','FORWARD','INVERSE'):raise ValueError('INVALID_MODE')
    if type(pressure)!=int or pressure not in range(11):raise ValueError('INVALID_PRESSURE')
    if not isinstance(glyph,str) or glyph not in ('!','?','~'):raise ValueError('INVALID_GLYPH')
    if not apply:return {'state':'PLAN_ONLY','run_key':run_key,'donor_executed':False,'body_registration_delta':0}
    with atlas.lock:
        with atlas.connection() as c:
            row=c.execute('SELECT run_data,receipt_hash FROM native_contact_runs WHERE run_key=?',(run_key,)).fetchone()
        if row:
            result=json.loads(row[0])
            if result['request']!={'mode':mode,'pressure':pressure,'glyph':glyph}:raise ValueError('IMMUTABLE_RUN_KEY_CONFLICT')
            if sha(row[0])!=row[1]:raise ValueError('NATIVE_RECEIPT_TAMPER')
            return {**result,'state':'ALREADY_PROVEN_REPLAY','native_executed_now':False}
        pinned()
        if shutil.which('node') is None:raise ValueError('NODE_RUNTIME_UNAVAILABLE')
        command=['node',str(NODE)]
        try:
            p=subprocess.run(command,input=canon({'mode':mode,'pressure':pressure,'glyph':glyph}),text=True,capture_output=True,timeout=6,cwd=ROOT)
        except subprocess.TimeoutExpired:raise ValueError('NATIVE_TIMEOUT_HOLD')
        if p.returncode!=0:raise ValueError('NATIVE_DONOR_HOLD:'+p.stderr[-280:].strip())
        try:r=json.loads(p.stdout)
        except json.JSONDecodeError:raise ValueError('INVALID_NATIVE_RECEIPT')
        if r.get('stage')!='EXECUTED_NATIVE' or r.get('sourceSha256')!=PINS:
            return {'state':'NATIVE_HOLD_NO_ATLAS_WRITES','native_donor':r,'body_registration_delta':0}
        if len(r['executions'])!=(2 if mode=='BOTH' else 1):raise ValueError('NATIVE_EXECUTION_COUNT_MISMATCH')
        if [x['direction'] for x in r['executions']] != ([mode] if mode!='BOTH' else ['FORWARD','INVERSE']):raise ValueError('NATIVE_DIRECTION_MISMATCH')
        pair=seed(atlas)
        transports=[]
        for i,e in enumerate(r['executions']):
            origin=APP if e['direction']=='FORWARD' else AI
            event_key='cp06.'+run_key+'.'+str(i)
            packet=contact_runtime.signal(atlas,pair,origin,e['consequence'],event_key,True)
            if packet['write']['state'] not in ('DELIVERED_IN_ATLAS','ALREADY_DELIVERED'):raise ValueError('ATLAS_TRANSPORT_HOLD')
            transports.append({'direction':e['direction'],'consequence':e['consequence'],
              'event_key':event_key,'sequence':packet['write']['sequence'],
              'event_hash':packet['write']['hash'],'recipient':packet['contact']['to_projection']})
        with atlas.connection() as c: count=c.execute('SELECT COUNT(*) FROM bodies').fetchone()[0]
        result={'schema':'JM.UniqueBodies.NativeToAtlas/0.6','state':'NATIVE_DONOR_TO_MCP_PERSISTED',
                'request':{'mode':mode,'pressure':pressure,'glyph':glyph},
                'run_key':run_key,'registration_count':count,'body_registration_delta':0,
                'native_donor':r,'typed_delivery':transports,
                'native_executed_now':True,
                'proof':['original source imports verified by exact SHA256','ContactBand and GlyphBody executed in Node runtime','typed consequences delivered to Atlas Python MCP tool','SQLite recipient state and hash-chained contacts'],
                'hold':['physical Fold native donor execution not tested','external ChatGPT/Gemini remote MCP access not tested']}
        s=canon(result)
        with atlas.connection() as c:c.execute('INSERT INTO native_contact_runs VALUES(?,?,?)',(run_key,s,sha(s)))
        return result

def history(atlas):
    initialize(atlas)
    with atlas.connection() as c:rows=c.execute('SELECT run_key,run_data,receipt_hash FROM native_contact_runs ORDER BY rowid').fetchall()
    verified=True;out=[]
    for k,s,h in rows:
        if sha(s)!=h:verified=False
        try:v=json.loads(s);out.append({'run_key':k,'state':v['state'],'receipt_hash':h,'transports':v.get('typed_delivery',[])})
        except Exception:verified=False
    contact=contact_runtime.verify(atlas)
    return {'schema':'JM.UniqueBodies.NativeHistory/0.6','runs':out,'run_count':len(out),'native_receipts_valid':verified,
            'contact_chain_valid':contact['hash_chain_valid'],'registered_body_count':contact['registered_body_count'],
            'total_atlas_contact_events':contact['contact_events'],'proven':'Native donor to Atlas server contact tested locally',
            'unproven':'Owner Fold server execution and remote client contact'}
TOOLS=[
 ('native_contact_execute','Execute exact pinned original JM ContactBand/GlyphBody Node source; typed adapter consequences sent to actual Atlas MCP persistence. apply=true writes.',
    {'type':'object','properties':{'run_key':{'type':'string'},'mode':{'type':'string','enum':['BOTH','FORWARD','INVERSE']},'pressure':{'type':'integer'},'glyph':{'type':'string'},'apply':{'type':'boolean'}},'required':['run_key']}),
 ('native_contact_history','Verify original native-execution receipts and Atlas typed contact history against durable SQLite state',{'type':'object','properties':{}})
]
def call(atlas,name,a):
    if name=='native_contact_execute':return run(atlas,a['run_key'],a.get('mode','BOTH'),a.get('pressure',5),a.get('glyph','?'),a.get('apply',False))
    if name=='native_contact_history':return history(atlas)
    raise ValueError('UNKNOWN_NATIVE_TOOL')
