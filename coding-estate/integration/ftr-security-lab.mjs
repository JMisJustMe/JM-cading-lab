/**
 * FTR authorised security lab CP02 — separate Parrot, NetHunter and Shodan contact.
 * Tested only on an isolated GitHub Actions loopback service + stubbed Shodan response.
 * No scanning of third-party hosts, exploitation, credentials harvesting or external API claims.
 */
import {isIP} from 'node:net';
const need=(condition,code)=>{if(!condition)throw Object.assign(new Error(code),{code});};
export async function auditOwnedLoopback({url,authorised=false,fetchImpl=fetch}){
 need(authorised===true,'LOCAL_AUTH_REQUIRED');
 const target=new URL(url);
 need(target.protocol==='http:'&&['127.0.0.1','[::1]'].includes(target.hostname),'NOT_LOOPBACK_HTTP');
 need(target.username===''&&target.password==='','CREDENTIALS_IN_URL_REFUSED');
 // All redirects are manual: no unapproved target crossing.
 const response=await fetchImpl(target.toString(),{method:'GET',redirect:'manual',signal:AbortSignal.timeout(5000)});
 const headers=['content-type','x-content-type-options','content-security-policy','server'].reduce((acc,key)=>{
  const value=response.headers.get(key); if(value!==null)acc[key]=value.slice(0,240);return acc;
 },{});
 return {schema:'jm.ftr.authorised-loopback/1',target:'LOOPBACK_ONLY',status:response.status,redirectRefused:response.status>=300&&response.status<400,
 headers,findings:[
  ...(headers['x-content-type-options']===undefined?['MISSING_X_CONTENT_TYPE_OPTIONS']:[]),
  ...(headers['content-security-policy']===undefined?['MISSING_CONTENT_SECURITY_POLICY']:[])
 ],severity:'CONFIGURATION_REVIEW_NOT_VULNERABILITY_PROOF',performed:'live-own-loopback-http-get',exploited:false};
}
export async function reviewOwnedShodanHost({ip,ownedIPs,authorised=false,apiKey,fetchImpl=fetch}){
 need(authorised===true,'SHODAN_AUTH_REQUIRED');
 need(isIP(ip)!==0&&Array.isArray(ownedIPs)&&ownedIPs.includes(ip),'SHODAN_UNOWNED_OR_INVALID_IP');
 need(typeof apiKey==='string'&&apiKey.length>0,'SHODAN_API_KEY_REQUIRED');
 const endpoint=new URL('https://api.shodan.io/shodan/host/'+encodeURIComponent(ip));
 endpoint.searchParams.set('key',apiKey);
 const response=await fetchImpl(endpoint.toString(),{method:'GET',redirect:'error',signal:AbortSignal.timeout(6000)});
 need(response.ok,'SHODAN_RESPONSE_ERROR');
 const payload=await response.json();
 need(payload&&payload.ip_str===ip&&Array.isArray(payload.data),'SHODAN_PAYLOAD_SCOPE');
 const findings=payload.data.filter(x=>Number.isInteger(x.port)).map(x=>({
  port:x.port,transport:x.transport??'tcp',
  service:String(x._shodan?.module??x.product??'unknown').slice(0,80),
  review:[21,23,3389].includes(x.port)?'PRIORITY_PORT_REVIEW':'INVENTORY_REVIEW'
 }));
 return {schema:'jm.ftr.shodan-owned-passive/1',asset:ip,services:findings,
  resultsSource:'Shodan indexed response',activeProbe:false,apiCredentialRedacted:true,
  noClaimsOfVulnerability:true};
}
