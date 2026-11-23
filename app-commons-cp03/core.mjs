/* JM APP//COMMONS CP02 — portable descendant mechanism, independently implemented
   from JMOriginalStructures.java; original Android source is not altered.
   No network, account data, project writes, or AI-generated content. */
export const SCHEMA = 'JM.OriginalStructures/0.1';
export const CAPSULE_SCHEMA = 'JM.AppCommons.Capsule/0.1';
export const MAX_CHARS = 10000, MAX_DIFF_LINES = 160, MAX_CAPSULE_BYTES = 200000;
export function checked(text) {
  if(typeof text !== 'string' || text.length > MAX_CHARS || text.includes('\u0000'))
    throw new Error('HOLD: source must be text, at most 10,000 UTF-16 units, without NUL.');
  // UTF-8 / Java parity is asserted only for well-formed Unicode.
  for(let i=0;i<text.length;i++){
    const c=text.charCodeAt(i);
    if(c>=0xD800&&c<=0xDBFF){
      if(i+1>=text.length||text.charCodeAt(i+1)<0xDC00||text.charCodeAt(i+1)>0xDFFF)
        throw new Error('HOLD: unpaired Unicode surrogate; preserve source outside this portability boundary.');
      i++;
    }else if(c>=0xDC00&&c<=0xDFFF)
      throw new Error('HOLD: unpaired Unicode surrogate; preserve source outside this portability boundary.');
  }
  return text;
}
export function sha256(source) {
  const bytes = new TextEncoder().encode(source); // standard UTF-8, matches Java organ
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l=bytes.length, padded=Math.ceil((l+9)/64)*64, buf=new Uint8Array(padded); buf.set(bytes); buf[l]=0x80;
  const bitCount=BigInt(l)*8n;
  for(let j=0;j<8;j++)buf[padded-1-j]=Number((bitCount>>BigInt(8*j))&255n);
  const rotr=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let at=0;at<padded;at+=64){
    const w=new Uint32Array(64);
    for(let j=0;j<16;j++){let k=at+4*j; w[j]=((buf[k]<<24)|(buf[k+1]<<16)|(buf[k+2]<<8)|buf[k+3])>>>0;}
    for(let j=16;j<64;j++){
      let a=w[j-15], b=w[j-2];
      let s0=rotr(a,7)^rotr(a,18)^(a>>>3),s1=rotr(b,17)^rotr(b,19)^(b>>>10);
      w[j]=(w[j-16]+s0+w[j-7]+s1)>>>0;
    }
    let [a,b,c,d,e,f,g,hh]=h;
    for(let j=0;j<64;j++){
      const s1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^(~e&g);
      const t1=(hh+s1+ch+K[j]+w[j])>>>0;
      const s0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b)^(a&c)^(b&c);
      const t2=(s0+maj)>>>0;
      hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    [a,b,c,d,e,f,g,hh].forEach((x,i)=>{h[i]=(h[i]+x)>>>0;});
  }
  return h.map(x=>x.toString(16).padStart(8,'0')).join('');
}
export function inspect(source){
  const s=checked(source), lines=s.length?s.split('\n'):[];
  const matches=s.match(/[\p{L}\p{N}]+/gu)||[];
  let headings=0,tasks=0,httpsLinks=0,outline='',todo='';
  for(const line of lines){
    const h=line.match(/^#{1,6}[ \t]+(.+)$/),t=line.match(/^\s*(?:[-*][ \t]+)?(?:\[ \]|TODO:?)[ \t]*(.+)$/i);
    if(h){headings++;if(outline.length<2500)outline+='• '+h[1].trim()+'\n';}
    if(t){tasks++;if(todo.length<2500)todo+='☐ '+t[1].trim()+'\n';}
    httpsLinks += (line.match(/https:\/\/[^\s<>()]+/g)||[]).length;
  }
  return {schema:SCHEMA,chars:s.length,bytes:new TextEncoder().encode(s).length,lines:lines.length,words:matches.length,unique:new Set(matches.map(w=>w.toLowerCase())).size,headings,tasks,httpsLinks,hash:sha256(s),outline:outline.trim()||'(No Markdown headings)',todo:todo.trim()||'(No open task markers)'};
}
export function compare(before,after){
  const a=checked(before),b=checked(after),x=a? a.split('\n'):[],y=b?b.split('\n'):[];
  if(x.length>MAX_DIFF_LINES||y.length>MAX_DIFF_LINES)throw new Error('HOLD: exact diff exceeds 160 lines; preserve and split comparison.');
  const n=x.length,m=y.length,lcs=Array.from({length:n+1},()=>new Int32Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)lcs[i][j]=x[i]===y[j]?1+lcs[i+1][j+1]:Math.max(lcs[i+1][j],lcs[i][j+1]);
  let i=0,j=0,added=0,removed=0,unchanged=0,patch='';
  while(i<n||j<m){
    let kind,line;
    if(i<n&&j<m&&x[i]===y[j]){kind=' ';line=x[i++];j++;unchanged++;}
    else if(j<m&&(i===n||lcs[i][j+1]>=lcs[i+1][j])){kind='+';line=y[j++];added++;}
    else{kind='-';line=x[i++];removed++;}
    if(patch.length<6000)patch+=kind+' '+line+'\n';
  }
  return {schema:'JM.OriginalStructures.Difference/0.1',added,removed,unchanged,beforeHash:sha256(a),afterHash:sha256(b),patch:patch.slice(0,6000)||'(Both sources empty)'};
}
export function stableJSON(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stableJSON).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJSON(value[k])).join(',')+'}';
}
export function createCapsule(state){
  const name=typeof state.name==='string'?state.name.trim():'';
  if(!name||name.length>80)throw new Error('HOLD: project name must be 1–80 characters.');
  checked(name);
  const source=checked(state.source||''),snapshots=state.snapshots||[];
  if(!Array.isArray(snapshots)||snapshots.length>12)throw new Error('HOLD: at most 12 local snapshots.');
  const records=snapshots.map((s,i)=>{
    const text=checked(s.text),hash=sha256(text);
    if(s.hash!==hash)throw new Error('HOLD: snapshot #'+(i+1)+' digest mismatch.');
    const created=String(s.created||''),label=String(s.label||'');
    if(created.length>64||label.length>80)throw new Error('HOLD: snapshot metadata exceeds portable bounds.');
    checked(created);checked(label);
    return {text,hash,created,label};
  });
  const payload={schema:CAPSULE_SCHEMA,name,source,sourceHash:sha256(source),snapshots:records,origin:'JM APP//COMMONS · LOCAL ONLY',authority:'OWNER_REVIEW_REQUIRED',revision:1};
  const capsule={payload,checksum:sha256(stableJSON(payload))};
  const portableBytes=new TextEncoder().encode(stableJSON(capsule)).length;
  if(portableBytes>MAX_CAPSULE_BYTES)throw new Error('HOLD: capsule exceeds 200,000 UTF-8 bytes accepted by the native receiver; original source and snapshots remain intact.');
  return capsule;
}
/** CP03 cross-language intake. Reject duplicate object keys and non-integer JSON
 * before ordinary JSON.parse can silently discard input evidence. Mirrors
 * JMAppCommonsCapsule.Json's meaningful number/key constraints. */
export function parseStrictJSON(raw,maxBytes=MAX_CAPSULE_BYTES){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>maxBytes)
    throw new Error('HOLD: JSON exceeds portable UTF-8 bound.');
  let at=0;
  const err=msg=>{throw new Error('HOLD: strict JSON '+msg+' at offset '+at);};
  const ws=()=>{while(at<raw.length&&/^[\t\n\r ]$/.test(raw[at]))at++;};
  function string(){
    if(raw[at]!=='"')err('string expected');
    const start=at++;
    while(at<raw.length){
      const c=raw.charCodeAt(at++);
      if(c===34)return JSON.parse(raw.slice(start,at));
      if(c<32)err('control byte');
      if(c===92){
        if(at>=raw.length)err('unfinished escape');
        const esc=raw[at++];
        if(esc==='u'){
          if(!/^[0-9a-fA-F]{4}$/.test(raw.slice(at,at+4)))err('Unicode escape');
          at+=4;
        }else if(!'"\\/bfnrt'.includes(esc))err('invalid escape');
      }
    }
    err('unterminated string');
  }
  function value(depth){
    if(depth>=24)err('nesting limit');ws();
    if(raw[at]==='{'){
      at++;ws();const names=new Set();if(raw[at]==='}'){at++;return;}
      while(true){ws();const name=string();if(names.has(name))err('duplicate key '+name);
        names.add(name);ws();if(raw[at++]!==':')err('colon expected');
        value(depth+1);ws();const sep=raw[at++];if(sep==='}')break;if(sep!==',')err('object comma expected');
      }return;
    }
    if(raw[at]==='['){
      at++;ws();if(raw[at]===']'){at++;return;}
      while(true){value(depth+1);ws();const sep=raw[at++];if(sep===']')break;if(sep!==',')err('array comma expected');}return;
    }
    if(raw[at]==='"'){string();return;}
    for(const literal of ['true','false','null'])if(raw.startsWith(literal,at)){
      at+=literal.length;return;
    }
    const match=/^-?(?:0|[1-9][0-9]*)/.exec(raw.slice(at));
    if(!match)err('value expected');
    at+=match[0].length;
    if(!Number.isInteger(Number(match[0]))||Number(match[0])<-2147483648||Number(match[0])>2147483647)
      err('integer outside native boundary');
    if(at<raw.length&&!/[,}\]\s]/.test(raw[at]))err('only integer numbers accepted');
  }
  value(0);ws();if(at!==raw.length)err('trailing data');
  return JSON.parse(raw);
}
export function receiveCapsuleJSON(raw){
  return validateCapsule(parseStrictJSON(raw));
}

export function validateCapsule(c){
  if(!c||Array.isArray(c)||typeof c!=='object'||!c.payload||typeof c.checksum!=='string')throw new Error('HOLD: invalid capsule envelope.');
  const p=c.payload;
  if(p.schema!==CAPSULE_SCHEMA||p.origin!=='JM APP//COMMONS · LOCAL ONLY'||p.authority!=='OWNER_REVIEW_REQUIRED'||p.revision!==1)throw new Error('HOLD: unsupported capsule schema or authority.');
  if(sha256(stableJSON(p))!==c.checksum)throw new Error('HOLD: payload checksum mismatch.');
  if(sha256(checked(p.source))!==p.sourceHash)throw new Error('HOLD: working source digest mismatch.');
  const renewed=createCapsule({name:p.name,source:p.source,snapshots:p.snapshots});
  if(stableJSON(renewed)!==stableJSON(c))throw new Error('HOLD: capsule contains invalid or unexpected structure.');
  return {name:p.name,source:p.source,snapshots:p.snapshots,checksum:c.checksum};
}
