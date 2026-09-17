(async()=>{
  const parts=['app.part1.txt','app.part2.txt','app.part3.txt'];
  const source=(await Promise.all(parts.map(async path=>{
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.text();
  }))).join('');
  new Function(source)();
})().catch(error=>{
  const app=document.querySelector('#app');
  if(app) app.innerHTML=`<pre style="padding:20px;color:#ff6b78;white-space:pre-wrap">GameForge load fault: ${String(error)}</pre>`;
  console.error(error);
});
