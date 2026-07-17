import {digest} from './native-core.mjs';
export const checks=[];
export function check(name,fn){try{const value=fn();checks.push({name,passed:true,digest:digest(value)});}catch(error){checks.push({name,passed:false,error:{name:error.name,code:error.code,message:error.message}});}}
export function expect(c,m){if(!c)throw new Error(m);}
export function rejects(fn,code){let e;try{fn();}catch(x){e=x;}expect(e,`Expected ${code}`);expect(e.code===code,`Expected ${code}, got ${e.code}`);return e.code;}
