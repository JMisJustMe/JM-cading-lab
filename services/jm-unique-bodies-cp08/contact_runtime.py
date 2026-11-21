"""JM Unique Bodies CP04: a real, persistent typed projection message rail.

This does not execute external JM donor code. Native ContactBand/GlyphBody
execution is independently proven in draft PR #505; this rail proves transport
inside Atlas, not that the two systems have yet been joined.
"""
import json,hashlib

def canon(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def sha(x):return hashlib.sha256((x if isinstance(x,bytes) else canon(x).encode())).hexdigest()

def initialize(atlas):
    with atlas.connection() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS contact_events(
          seq INTEGER PRIMARY KEY AUTOINCREMENT,
          event_key TEXT NOT NULL UNIQUE,
          event_data TEXT NOT NULL,
          previous_hash TEXT NOT NULL,
          event_hash TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS contact_state(
          projection_id TEXT PRIMARY KEY,
          event_seq INTEGER NOT NULL,
          signal_type TEXT NOT NULL,
          value_data TEXT NOT NULL);
        ''')

def signal(atlas, pair_id, from_projection, value, event_key, apply=False):
    initialize(atlas)
    pair_id=atlas_identifier(pair_id); from_projection=atlas_identifier(from_projection)
    event_key=atlas_identifier(event_key)
    pair=atlas._get('projection_pairs',pair_id)
    if pair is None:raise ValueError('UNKNOWN_PAIR')
    a=atlas.projection_get(from_projection)
    if from_projection not in (pair['from_id'],pair['to_id']):raise ValueError('SOURCE_OUTSIDE_PAIR')
    target_id=pair['to_id'] if from_projection==pair['from_id'] else pair['from_id']
    b=atlas.projection_get(target_id)
    if a['body_id']!=b['body_id'] or a['body_id']!=pair['original_body_id']:
        raise ValueError('BODY_IDENTITY_MISMATCH')
    signal_type=a.get('output_signal')
    if not signal_type or signal_type!=b.get('input_signal'):
        raise ValueError('TYPED_DELIVERY_HOLD: source output and recipient input do not match')
    if type(value) not in (str,int,float,bool) and value is not None:
        raise ValueError('PAYLOAD_TYPE_HOLD: use scalar JSON value')
    if len(canon(value))>1024:raise ValueError('PAYLOAD_TOO_LARGE')
    event={'schema':'JM.UniqueBodies.Contact/0.4','event_key':event_key,'pair_id':pair_id,
           'body_id':a['body_id'],'from_projection':a['id'],'to_projection':b['id'],
           'signal_type':signal_type,'value':value,'direction':'FORWARD' if from_projection==pair['from_id'] else 'INVERSE',
           'result':'DELIVERED_IN_ATLAS_ONLY','original_body_registration_delta':0}
    if not apply:return {'plan':event,'write':{'state':'PLAN_ONLY'},'native_donor_executed':False}
    with atlas.lock,atlas.connection() as c:
        c.execute('BEGIN IMMEDIATE')
        old=c.execute('SELECT seq,event_data,event_hash FROM contact_events WHERE event_key=?',(event_key,)).fetchone()
        if old:
            original=json.loads(old[1]);
            if original!=event:raise ValueError('EVENT_KEY_CONFLICT')
            return {'contact':original,'write':{'state':'ALREADY_DELIVERED','sequence':old[0],'hash':old[2]},'native_donor_executed':False}
        last=c.execute('SELECT event_hash FROM contact_events ORDER BY seq DESC LIMIT 1').fetchone()
        previous=last[0] if last else 'GENESIS'
        digest=sha({'previous':previous,'event':event})
        c.execute('INSERT INTO contact_events(event_key,event_data,previous_hash,event_hash) VALUES(?,?,?,?)',
                  (event_key,canon(event),previous,digest))
        seq=c.execute('SELECT last_insert_rowid()').fetchone()[0]
        c.execute('INSERT INTO contact_state(projection_id,event_seq,signal_type,value_data) VALUES(?,?,?,?) '
                  'ON CONFLICT(projection_id) DO UPDATE SET event_seq=excluded.event_seq,signal_type=excluded.signal_type,value_data=excluded.value_data',
                  (b['id'],seq,signal_type,canon(value)))
        c.execute('INSERT INTO audit(action,fingerprint) VALUES(?,?)',('projection_signal',digest))
    return {'contact':event,'write':{'state':'DELIVERED_IN_ATLAS','sequence':seq,'hash':digest},'native_donor_executed':False}

def atlas_identifier(x):
    import re
    if not isinstance(x,str) or not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,127}',x):raise ValueError('Invalid identifier')
    return x

def history(atlas, body_id='',limit=100):
    initialize(atlas)
    if body_id:atlas.get(body_id)
    lim=max(1,min(int(limit),1000)); result=[]; ok=True; prev='GENESIS'; count=0
    with atlas.connection() as c:
        for seq,s,h,old in c.execute('SELECT seq,event_data,event_hash,previous_hash FROM contact_events ORDER BY seq'):
            data=json.loads(s)
            if old!=prev or h!=sha({'previous':old,'event':data}):ok=False
            prev=h;count+=1
            if not body_id or data['body_id']==body_id:result.append({'sequence':seq,'contact':data,'event_hash':h})
        states=[{'projection_id':row[0],'sequence':row[1],'signal_type':row[2],'value':json.loads(row[3])}
                for row in c.execute('SELECT projection_id,event_seq,signal_type,value_data FROM contact_state ORDER BY projection_id')]
    if body_id:
        states=[x for x in states if atlas.projection_get(x['projection_id'])['body_id']==body_id]
    return {'schema':'JM.UniqueBodies.ContactHistory/0.4','registered_bodies_affected':0,
            'events':result[-lim:],'selected_event_count':len(result),'global_event_count':count,
            'states':states,'hash_chain_valid':ok,'last_event_hash':prev,
            'boundary':'Atlas-local typed delivery and SQLite consequence only; independent JM donor native proof remains separate'}

def verify(atlas):
    r=history(atlas)
    with atlas.connection() as c: bodies=c.execute('SELECT COUNT(*) FROM bodies').fetchone()[0]
    return {'contact_events':r['global_event_count'],'hash_chain_valid':r['hash_chain_valid'],
            'registered_body_count':bodies,'projections_with_state':len(r['states']),
            'proof':['Atlas native Python execution','typed projection routing inside one MCP','durable SQLite state and hash-chain validation'],
            'not_proven':['external donor executed by Atlas','remote cross-app MCP transport','physical device owner contact']}

def call(atlas,name,a):
    initialize(atlas)
    if name=='projection_signal':return signal(atlas,a['pair_id'],a['from_projection'],a['value'],a['event_key'],a.get('apply',False))
    if name=='contact_history':return history(atlas,a.get('body_id',''),a.get('limit',100))
    if name=='contact_verify':return verify(atlas)
    raise ValueError('Unknown contact tool')

TOOLS=[
 ('projection_signal','Execute an actual typed and durable Atlas-local delivery between SAME-BODY projections; no external donor execution',{'type':'object','properties':{'pair_id':{'type':'string'},'from_projection':{'type':'string'},'value':{'type':['string','number','boolean','null']},'event_key':{'type':'string'},'apply':{'type':'boolean'}},'required':['pair_id','from_projection','event_key','value']}),
 ('contact_history','Read persisted typed contacts, recipient state and verify the full event hash chain',{'type':'object','properties':{'body_id':{'type':'string'},'limit':{'type':'integer'}}}),
 ('contact_verify','Check independently persisted Atlas contacts and preservation of body identity',{'type':'object','properties':{}}),
]
