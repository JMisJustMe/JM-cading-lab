(async()=>{
  const parts=['app.part1.txt','app.part2.txt','app.part3a.txt','app.part3b.txt','app.part4.txt'];
  const source=(await Promise.all(parts.map(async path=>{const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response.text()}))).join('');
  new Function(source)();
})().catch(error=>{const app=document.querySelector('#app');if(app)app.innerHTML=`<pre style="padding:20px;color:#ff557b;white-space:pre-wrap">GlyphForge load fault: ${String(error)}</pre>`;console.error(error)});
