"""JM Unique Bodies CP07: original donor execution followed by one atomic Atlas batch.

The donor source and CP06 remain inherited and untouched. SQLite transactions
cover CP07 donor delivery, recipient state, audit trace and immutable receipt.
This is not cryptographically attested remote execution or physical Fold proof.
"""
import json, re, shutil, subprocess
import contact_runtime as contact
import native_contact_runtime as native

BID=native.BID
APP=native.APP
AI=native.AI
SCHEMA='JM.UniqueBodies.AtomicToAtlas/0.7'

def init(atlas):
    contact.initialize(atlas)
    with atlas.connection() as db:
        db.execute('''CREATE TABLE IF NOT EXISTS atomic_contact_runs (
          run_key TEXT PRIMARY KEY,
          run_data TEXT NOT NULL,
          receipt_hash TEXT NOT NULL)''')

def _invoke(mode,pressure,glyph):
    native.pinned()
    if shutil.which('node') is None: raise ValueError('NODE_RUNTIME_UNAVAILABLE')
    try:
        proc=subprocess.run(['node',str(native.NODE)],
            input=native.canon({'mode':mode,'pressure':pressure,'glyph':glyph}),
            text=True,capture_output=True,timeout=6,cwd=native.ROOT)
    except subprocess.TimeoutExpired: raise ValueError('NATIVE_TIMEOUT_HOLD')
    if proc.returncode: raise ValueError('NATIVE_DONOR_HOLD:'+proc.stderr[-280:])
    try: source=json.loads(proc.stdout)
    except (json.JSONDecodeError,TypeError): raise ValueError('NATIVE_RECEIPT_NOT_JSON')
    if source.get('schema')!='JM.UniqueBodies.NativeDonor/0.6' or source.get('sourceSha256')!=native.PINS:
        raise ValueError('DONOR_PROVENANCE_MISMATCH')
    expected=['FORWARD','INVERSE'] if mode=='BOTH' else [mode]
    if [e.get('direction') for e in source.get('executions',[])]!=expected:
        raise ValueError('DONOR_DIRECTIONS_MISMATCH')
    if source.get('stage')!='EXECUTED_NATIVE':return source,None
    for e in source['executions']:
        env=e.get('typedEnvelope') or {}
        if env.get('schema')!='jm.unique-bodies.native-typed/0.6':raise ValueError('DONOR_ENVELOPE_SCHEMA_HOLD')
        if e['direction']=='FORWARD':
            if env.get('type')!='jm.glyph.symbol.v1' or env.get('value') not in ('!','?') or e.get('consequence') not in ('door.open','door.inspect'):
                raise ValueError('DONOR_FORWARD_CONSEQUENCE_HOLD')
        else:
            if env.get('type')!='jm.contact.pressure.v1' or env.get('value') not in (2,5) or e.get('consequence') not in ('inspect','open'):
                raise ValueError('DONOR_INVERSE_CONSEQUENCE_HOLD')
        if not all(k in (e.get('donorReceipts') or {}) for k in ('ContactBand','GlyphBody')):
            raise ValueError('DONOR_RECEIPTS_MISSING')
    return source,expected

def execute(atlas,run_key,mode='BOTH',pressure=5,glyph='?',apply=False,_fault_at=0):
    if not isinstance(run_key,str) or not re.fullmatch(r'[A-Za-z0-9][\w.:-]{2,110}',run_key):raise ValueError('INVALID_RUN_KEY')
    if mode not in ('BOTH','FORWARD','INVERSE'):raise ValueError('INVALID_MODE')
    if type(pressure)!=int or pressure not in range(11):raise ValueError('INVALID_PRESSURE')
    if not isinstance(glyph,str) or glyph not in ('!','?','~'):raise ValueError('INVALID_GLYPH')
    request={'mode':mode,'pressure':pressure,'glyph':glyph}
    if not apply:return {'schema':SCHEMA,'state':'PLAN_ONLY','run_key':run_key,'donor_executed':False,'writes':0}
    init(atlas)
    with atlas.lock:
        with atlas.connection() as db:
            old=db.execute('SELECT run_data,receipt_hash FROM atomic_contact_runs WHERE run_key=?',(run_key,)).fetchone()
        if old:
            if native.sha(old[0])!=old[1]:raise ValueError('CP07_RECEIPT_TAMPER')
            receipt=json.loads(old[0])
            if receipt['request']!=request:raise ValueError('IMMUTABLE_RUN_KEY_CONFLICT')
            integrity=history(atlas)
            if not integrity['integrity_valid']:raise ValueError('CP07_HISTORY_INTEGRITY_HOLD')
            return {**receipt,'state':'ALREADY_PROVEN_REPLAY','donor_executed_now':False,'writes_now':0}
        source,expected=_invoke(mode,pressure,glyph)
        if expected is None:
            return {'schema':SCHEMA,'run_key':run_key,'state':'DONOR_HOLD_NO_WRITE',
                'native_donor':source,'writes':0,'registered_body_delta':0}
        pair=native.seed(atlas) # inherited immutable original one-body registration; occurs before transaction
        prepared=[]
        for i,e in enumerate(source['executions']):
            origin=APP if e['direction']=='FORWARD' else AI
            event_key='cp07.'+run_key+'.'+str(i)
            plan=contact.signal(atlas,pair,origin,e['consequence'],event_key,False)['plan']
            prepared.append((i,e,plan))
        deliveries=[]
        # One commit or zero contact events, zero recipient changes, zero CP07 receipt.
        with atlas.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            if db.execute('SELECT 1 FROM atomic_contact_runs WHERE run_key=?',(run_key,)).fetchone():
                raise ValueError('CONCURRENT_RUN_KEY_HOLD')
            for i,e,plan in prepared:
                if db.execute('SELECT 1 FROM contact_events WHERE event_key=?',(plan['event_key'],)).fetchone():
                    raise ValueError('EVENT_KEY_ALREADY_USED_HOLD')
                prev=db.execute('SELECT event_hash FROM contact_events ORDER BY seq DESC LIMIT 1').fetchone()
                previous=prev[0] if prev else 'GENESIS'
                event_hash=contact.sha({'previous':previous,'event':plan})
                db.execute('INSERT INTO contact_events(event_key,event_data,previous_hash,event_hash) VALUES(?,?,?,?)',
                    (plan['event_key'],contact.canon(plan),previous,event_hash))
                sequence=db.execute('SELECT last_insert_rowid()').fetchone()[0]
                db.execute('INSERT INTO contact_state(projection_id,event_seq,signal_type,value_data) VALUES(?,?,?,?) '
                    'ON CONFLICT(projection_id) DO UPDATE SET event_seq=excluded.event_seq,signal_type=excluded.signal_type,value_data=excluded.value_data',
                    (plan['to_projection'],sequence,plan['signal_type'],contact.canon(plan['value'])))
                db.execute('INSERT INTO audit(action,fingerprint) VALUES(?,?)',('projection_signal',event_hash))
                deliveries.append({'direction':e['direction'],'atlas_direction':plan['direction'],'consequence':plan['value'],
                    'event_key':plan['event_key'],'sequence':sequence,'event_hash':event_hash,
                    'from_projection':plan['from_projection'],'recipient':plan['to_projection'],
                    'signal_type':plan['signal_type']})
                if _fault_at==i+1:raise ValueError('INJECTED_TRANSACTION_FAILURE')
            count=db.execute('SELECT COUNT(*) FROM bodies').fetchone()[0]
            if count!=1:raise ValueError('ONE_BODY_IDENTITY_HOLD')
            receipt={'schema':SCHEMA,'state':'ATOMIC_NATIVE_TO_ATLAS_PERSISTED',
                'run_key':run_key,'request':request,'native_donor':source,
                'typed_delivery':deliveries,'registration_count':count,'registered_body_delta':0,
                'donor_executed_now':True,'writes':len(deliveries),
                'transaction':'SQLITE_SINGLE_ATOMIC_COMMIT',
                'boundary':'Original donor Node execution + local atomic Atlas SQLite; physical Fold and cross-AI remote not tested'}
            serial=native.canon(receipt)
            if _fault_at==99:raise ValueError('INJECTED_TRANSACTION_FAILURE')
            db.execute('INSERT INTO atomic_contact_runs VALUES(?,?,?)',(run_key,serial,native.sha(serial)))
        return receipt

def history(atlas):
    init(atlas)
    results=[];ok=True;reasons=[];receipt_event_keys=set()
    with atlas.connection() as db:
        rows=db.execute('SELECT run_key,run_data,receipt_hash FROM atomic_contact_runs ORDER BY rowid').fetchall()
        for key,raw,digest in rows:
            good=native.sha(raw)==digest
            try:
                data=json.loads(raw)
                good &= data['run_key']==key and data['schema']==SCHEMA
                good &= data['state']=='ATOMIC_NATIVE_TO_ATLAS_PERSISTED'
                for d in data['typed_delivery']:
                    receipt_event_keys.add(d['event_key'])
                    actual=db.execute('SELECT seq,event_data,event_hash FROM contact_events WHERE event_key=?',(d['event_key'],)).fetchone()
                    good &= actual is not None
                    if actual:
                        event=json.loads(actual[1]); good &= (actual[0]==d['sequence'] and actual[2]==d['event_hash']
                            and event['value']==d['consequence'] and event['direction']==d['atlas_direction']
                            and event['to_projection']==d['recipient'] and event['from_projection']==d['from_projection']
                            and event['signal_type']==d['signal_type'])
                results.append({'run_key':key,'valid':bool(good),'event_count':len(data['typed_delivery']),
                    'receipt_hash':digest,'event_hashes':[x['event_hash'] for x in data['typed_delivery']]})
            except (KeyError,TypeError,ValueError,json.JSONDecodeError):good=False
            if not good:ok=False;reasons.append('RUN_RECEIPT_OR_EVENT:'+key)
        # Verify no CP07 event exists without its committed atomic receipt.
        latest_recipients={};stored_keys=set()
        for seq,evraw,event_key in db.execute('SELECT seq,event_data,event_key FROM contact_events ORDER BY seq'):
            try:
                event=json.loads(evraw);latest_recipients[event['to_projection']]=seq
            except (KeyError,ValueError,TypeError):ok=False;reasons.append('EVENT_DATA_PARSE_HOLD:'+event_key)
            if event_key.startswith('cp07.'):
                stored_keys.add(event_key)
        if stored_keys!=receipt_event_keys:
            ok=False;reasons.append('ORPHAN_OR_MISSING_CP07_EVENTS')
        # Verify each recipient's current state corresponds to its latest event, including inherited CP06 events.
        states=db.execute('SELECT projection_id,event_seq,signal_type,value_data FROM contact_state').fetchall()
        for recipient,seq,signal_type,value in states:
            event=db.execute('SELECT event_data FROM contact_events WHERE seq=?',(seq,)).fetchone()
            if not event:
                ok=False;reasons.append('MISSING_RECIPIENT_EVENT:'+recipient);continue
            try:
                v=json.loads(event[0]);valid=(v['to_projection']==recipient and v['signal_type']==signal_type and v['value']==json.loads(value))
                if not valid or latest_recipients.get(recipient)!=seq:
                    ok=False;reasons.append('RECIPIENT_STATE_MISMATCH:'+recipient)
            except (KeyError,ValueError):ok=False;reasons.append('RECIPIENT_PARSE_HOLD:'+recipient)
        if set(latest_recipients)!=set(k for k,_,_,_ in states):
            ok=False;reasons.append('MISSING_RECIPIENT_STATE')
        bodies=db.execute('SELECT COUNT(*) FROM bodies').fetchone()[0]
        count=db.execute('SELECT COUNT(*) FROM contact_events').fetchone()[0]
    chain=contact.history(atlas)
    if not chain['hash_chain_valid']:reasons.append('CONTACT_HASH_CHAIN_INVALID')
    if bodies not in (0,1):reasons.append('BODY_COUNT_INVALID')
    integrity=ok and chain['hash_chain_valid'] and bodies in (0,1)
    return {'schema':'JM.UniqueBodies.AtomicHistory/0.7','integrity_valid':integrity,
        'receipt_integrity_valid':ok,'contact_chain_valid':chain['hash_chain_valid'],
        'run_count':len(rows),'registered_body_count':bodies,'total_atlas_contact_events':count,
        'runs':results,'holds':reasons,
        'scope':'Local durable SQLite verification only, no external attestation or device claim'}

TOOLS=[
 ('atomic_contact_execute','CP07 execute SHA-pinned ORIGINAL ContactBand/GlyphBody in Node and atomically commit all typed consequences + receipts in one SQLite transaction; apply=true writes.',
    {'type':'object','properties':{'run_key':{'type':'string'},'mode':{'type':'string','enum':['BOTH','FORWARD','INVERSE']},'pressure':{'type':'integer'},'glyph':{'type':'string'},'apply':{'type':'boolean'}},'required':['run_key']}),
 ('atomic_contact_history','CP07 validate receipts, linked contact consequences, hash chain and recipient SQLite state',
    {'type':'object','properties':{}}),
]
def call(atlas,name,args):
    if name=='atomic_contact_execute':return execute(atlas,args['run_key'],args.get('mode','BOTH'),args.get('pressure',5),args.get('glyph','?'),args.get('apply',False))
    if name=='atomic_contact_history':return history(atlas)
    raise ValueError('UNKNOWN_ATOMIC_TOOL')
