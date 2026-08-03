import {cp,mkdir,rm} from 'node:fs/promises';

const files=['index.html','styles.css','jm-core.js','visual-runtime.js','app.js','visual-lab.cading','manifest.webmanifest','icon.svg','sw.js','00_OPEN_FIRST.html','registry.json','ANDROID_STATUS.json'];
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of files) await cp(file,`dist/${file}`);
console.log(`JM Visual Lab OneBody delivery: ${files.length} files copied to dist/`);
