export const nowIso=()=>new Date().toISOString();
export const randomId=(p)=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
export const clean=(v)=>String(v??'').trim();
export const key=(v)=>clean(v).toLocaleLowerCase();
export const clone=(v)=>structuredClone(v);
export const assert=(c,m)=>{if(!c)throw new Error(m)};
const stable=(v)=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'
  ?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
export const canonicalJson=(v)=>JSON.stringify(stable(v));
export function normalizeScope(scope='root'){
  const p=clean(scope).replaceAll('\\','/').replaceAll('.','/').replace(/\/+/g,'/')
    .split('/').map(x=>x.trim().toLocaleLowerCase()).filter(Boolean);
  return p.length?p.join('/'):'root';
}
export function scopeContains(parent,child){
  const a=normalizeScope(parent).split('/'),b=normalizeScope(child).split('/');
  if(a[0]==='*')return true;if(a.length>b.length)return false;
  return a.every((s,i)=>s==='*'||s===b[i]);
}
export const scopesOverlap=(a,b)=>scopeContains(a,b)||scopeContains(b,a);
export const scopeSpecificity=(s)=>normalizeScope(s).split('/').filter(x=>x!=='*').length;
export function directivesConflict(a,b){
  const x=clean(a).toUpperCase(),y=clean(b).toUpperCase();
  if(x===y)return false;if(x==='HOLD'||y==='HOLD')return true;
  return x==='FORBID'||y==='FORBID';
}
const vector=(p)=>[Number(p.boundaryRank||0),Number(p.authorityRank||0),scopeSpecificity(p.scope),p.sourceVerified?1:0,-new Date(p.createdAt).getTime()];
export function comparePriority(a,b){
  const x=vector(a),y=vector(b);for(let i=0;i<x.length;i++){if(x[i]>y[i])return 1;if(x[i]<y[i])return-1}return 0;
}
