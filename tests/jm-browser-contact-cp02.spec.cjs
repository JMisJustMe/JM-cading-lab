const { chromium } = require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true});
const results=[];
try{for(const v of [{name:"fold-portrait",width:360,height:780},{name:"desktop",width:1366,height:900}]){
const context=await browser.newContext({viewport:v,permissions:["clipboard-read","clipboard-write"]}),page=await context.newPage(),err=[];let requests=0;
page.on("pageerror",e=>err.push(String(e)));page.on("request",r=>{if(r.url().startsWith("https://api.github.com/"))requests++});
await page.goto("http://127.0.0.1:4187/access/browser-contact.html",{waitUntil:"domcontentloaded"});
assert.equal(await page.locator("#cp02net").innerText(),"OPEN");assert.equal(await page.locator("#cp02mcp").innerText(),"HOLD");
await page.locator("#cp02probe").click();
await page.waitForFunction(()=>!document.querySelector("#cp02probe").disabled,null,{timeout:20000});
const n=await page.locator("#cp02net").innerText(),p=await page.locator("#cp02pin").innerText();
const receipt=JSON.parse(await page.locator("#cp02trace").textContent());
assert.equal(n,"PASS","must contact actual GitHub HTTP source, details="+JSON.stringify(receipt.remote));
assert.equal(p,"PASS","pinned SHA must match");
assert.equal(receipt.proof,"PASS_EXACT_GITHUB_BLOB");assert.equal(receipt.source_blob_observed,receipt.source_blob_expected);
assert.equal(receipt.mcp_transport,"UNPROVEN_REQUIRES_CONNECTED_MCP_INVOCATION");
assert.equal(await page.locator("#cp02mcp").innerText(),"HOLD","never invent an MCP success");
assert.equal(requests,1,"exactly one remote network source request");
await page.locator("#cp02copy").click();
const copied=await page.evaluate(()=>navigator.clipboard.readText());
assert.match(copied,/JM CP02 MCP HANDOFF/);
assert.match(copied,/JM.BrowserContact.McpHandoff\/2/);
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
assert.ok(overflow<=1,"no horizontal overflow");
assert.equal(err.length,0,err.join("|"));
results.push({viewport:v.name,source:"PASS",pin:"PASS",http_requests:requests,clipboard:"PASS",mcp:"HOLD_EXPECTED"});await context.close();
}
console.log(JSON.stringify({status:"PASS",results},null,2));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
