// Local, explicit owner-choice return checkpoint for JM Estate Native Operator.
// Scoped to same-origin browser storage. SHA-256 detects accidental mismatch; it
// is not an authentication signature or a substitute for durable cloud custody.
export const RETURN_SLOT='JM_ESTATE_NATIVE_OPERATOR_RETURN_v02';
const encoder=new TextEncoder();
async function sha256(text,subtle){
  const bytes=new Uint8Array(await subtle.digest('SHA-256',encoder.encode(text)));
  return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function validate(value) {
  if(!value||value.schema!=='jm.estate.operator.local-return/0.2')throw Error('RETURN_SCHEMA_HOLD');
  if(!['scene','route','compile-js','compile-rust','gamecore','os','embodied'].includes(value.mode))throw Error('RETURN_MODE_HOLD');
  if(typeof value.summary!=='string'||!value.summary||value.summary.length>26000)throw Error('RETURN_SUMMARY_HOLD');
  if(typeof value.input!=='string'||value.input.length>2000)throw Error('RETURN_INPUT_HOLD');
  if(value.mode==='scene'&&(typeof value.scene!=='string'||!value.scene.startsWith('<!doctype html>')))throw Error('RETURN_SCENE_HOLD');
  return value;
}
export async function recoverLocalReturn(store,subtle=crypto.subtle) {
  const packed=store.getItem(RETURN_SLOT);
  if(!packed)throw Error('LOCAL_RETURN_ABSENT');
  let data;
  try{data=JSON.parse(packed)}catch{throw Error('LOCAL_RETURN_INVALID_JSON')}
  if(data?.schema!=='jm.estate.operator.local-envelope/0.2'||typeof data.body!=='string'||!/^[a-f0-9]{64}$/.test(data.sha256||''))throw Error('LOCAL_ENVELOPE_HOLD');
  if(await sha256(data.body,subtle)!==data.sha256)throw Error('LOCAL_RETURN_HASH_MISMATCH');
  let value;try{value=JSON.parse(data.body)}catch{throw Error('LOCAL_RETURN_INVALID_BODY')}
  validate(value);
  return {state:'LOCAL_RETURN_READBACK_VERIFIED',value,sha256:data.sha256};
}
export async function saveLocalReturn(store,value,subtle=crypto.subtle) {
  validate(value);
  const body=JSON.stringify(value);
  if(encoder.encode(body).length>100000)throw Error('LOCAL_RETURN_TOO_LARGE');
  const sum=await sha256(body,subtle);
  store.setItem(RETURN_SLOT,JSON.stringify({schema:'jm.estate.operator.local-envelope/0.2',sha256:sum,body}));
  const read=await recoverLocalReturn(store,subtle);
  if(read.sha256!==sum||read.value.mode!==value.mode)throw Error('LOCAL_RETURN_READBACK_HOLD');
  return read;
}
