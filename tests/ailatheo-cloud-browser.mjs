import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {onRequest} from '../functions/api/estate-contact.js';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.JM_NODE_MODULES||'C:/Users/theod/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const root=process.cwd(),out=path.resolve('../../outputs');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer(async(q,r)=>{
 try{
  const url=new URL(q.url,'http://127.0.0.1:4177');
  if(url.pathname==='/api/estate-contact'){
    const chunks=[];for await(const chunk of q)chunks.push(chunk);
    const response=await onRequest({request:new Request(url,{method:q.method,headers:q.headers,body:q.method==='POST'?Buffer.concat(chunks):undefined})});
    r.writeHead(response.status,Object.fromEntries(response.headers));return r.end(await response.text());
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});r.end(fs.readFileSync(file));
 }catch(e){r.writeHead(500);r.end('test host error')}
});
await new Promise(r=>server.listen(4177,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
const tests=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:4177/unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html');
 await page.locator('#contact').fill('Mission 002 browser synthetic source contact. Verify RouteVault consequence and return.');
 await page.locator('#proofBtn').click();
 await page.locator('#cloudHandle').fill('M002_UI_'+crypto.randomUUID().replaceAll('-','').slice(0,10));
 await page.locator('#cloudConnect').click();
 await page.locator('#cloudStatus').filter({hasText:'Connection created'}).waitFor({timeout:60000});
 await page.locator('#cloudSave').click();
 await page.locator('#cloudStatus').filter({hasText:'CLOUD READBACK VERIFIED'}).waitFor({timeout:60000});
 tests.push('actual-Federation-button-to-existing-live-cloud','signature-and-target-state-return');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#cloudExport').click()]);
 const privateFile=path.resolve('../contact-state/browser-private-recovery.json');await download.saveAs(privateFile);
 const recovery=JSON.parse(fs.readFileSync(privateFile,'utf8'));assert.equal(recovery.checkpoint.state,'VERIFIED');
 await page.reload();await page.locator('#proofBtn').click();await page.locator('#cloudRecover').click();
 await page.locator('#cloudStatus').filter({hasText:'CLOUD RECOVERY VERIFIED'}).waitFor({timeout:60000});tests.push('page-reload-recovery');
 await page.screenshot({path:path.join(out,'ailatheo-cloud-return.png'),fullPage:true});
 const fresh=await browser.newContext({viewport:{width:1366,height:900}}),other=await fresh.newPage();
 await other.goto(page.url());await other.locator('#proofBtn').click();await other.locator('#cloudImport').setInputFiles(privateFile);
 await other.locator('#cloudStatus').filter({hasText:'IMPORTED RECOVERY VERIFIED'}).waitFor({timeout:60000});tests.push('clean-browser-context-private-file-import-and-live-recovery');
 await fresh.setOffline(true);await other.locator('#cloudRecover').click();await other.locator('#cloudStatus').filter({hasText:'HOLD'}).waitFor();tests.push('offline-hold-no-false-success');
 await fresh.setOffline(false);await other.locator('#cloudRecover').click();await other.locator('#cloudStatus').filter({hasText:'CLOUD RECOVERY VERIFIED'}).waitFor({timeout:60000});tests.push('online-recovery-after-offline');
 const proof={at:new Date().toISOString(),state:'PASS',tests,checkpoint:recovery.checkpoint,boundary:'Real Edge browser on laptop, local Estate backend relay, existing live Render target. Canonical Cloudflare deployment and physical Android not claimed.'};
 fs.writeFileSync(path.join(out,'browser-live-contact-proof.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r))}
