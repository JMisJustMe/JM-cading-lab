import{readFileSync,writeFileSync}from'node:fs';
const template=readFileSync('workroom-cp03.template.html','utf8');
const core=readFileSync('core.mjs','utf8').replaceAll('export const ','const ').replaceAll('export function ','function ');
if(!template.includes('/*__CORE__*/'))throw Error('HOLD: missing core carrier seam');
const result=template.replace('/*__CORE__*/',core);
writeFileSync('JM_APP_COMMONS_CP03.html',result);
console.log('CP03 single-file generated:',Buffer.byteLength(result),'UTF-8 bytes');
