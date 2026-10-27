'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const gate=require('../gong_ci_cp03.js');
function git(dir,...args){return cp.execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim()}
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-gong-cp03-'));
 git(dir,'init','-q');git(dir,'config','user.name','JM CP03 Test');git(dir,'config','user.email','jm@example.invalid');
 fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="style.css"><script src="app.js"></script>');
 fs.writeFileSync(path.join(dir,'style.css'),'body { color: black; }\n');
 fs.writeFileSync(path.join(dir,'app.js'),'document.title = "JM";\n');
 git(dir,'add','.');git(dir,'commit','-qm','original');const base=git(dir,'rev-parse','HEAD');
 const commit=(label)=>{git(dir,'add','-A');git(dir,'commit','-qm',label);return git(dir,'rev-parse','HEAD')};
 return {dir,base,commit,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
function withF(cb){const f=fixture();try{cb(f)}finally{f.cleanup()}}
function change(f,p,body){fs.writeFileSync(path.join(f.dir,p),body);return f.commit('changed '+p)}
test('source name classification keeps .html/.js/.gd; ignores images',()=>{
 assert.equal(gate.isSource('apps/a.html'),true);assert.equal(gate.isSource('games/a.gd'),true);assert.equal(gate.isSource('art/portrait.png'),false)
});
test('read-only CSS change advises local check, not Fold pass',()=>withF(f=>{
 const head=change(f,'style.css','body { color: red; }\n');const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'LOCAL_CHECK');assert.equal(r.changedFiles[0].priority,'LOCAL_CHECK');assert.equal(r.governance.ownerDevicePassClaimed,false);assert.equal(r.governance.autoInheritanceGranted,false);
}));
test('JS touch handler triggers changed-scope direct check',()=>withF(f=>{
 const head=change(f,'app.js','window.addEventListener("touchstart",()=>{});\n');const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'DIRECT_CHANGED_SCOPE');assert.ok(r.changedFiles[0].changes.includes('touch_routing'));
}));
test('JS ordinary logic change produces local check, no magic proof',()=>withF(f=>{
 const head=change(f,'app.js','document.title = "JMGONG";\n');const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'LOCAL_CHECK');assert.equal(r.changedFiles[0].changes.includes('script_logic'),true)
}));
test('unrecognized runtime source holds for triage',()=>withF(f=>{
 fs.writeFileSync(path.join(f.dir,'game.gd'),'extends Node\n');const h1=f.commit('new native game');
 fs.writeFileSync(path.join(f.dir,'game.gd'),'extends CharacterBody2D\n');const h2=f.commit('changed native game');
 const r=gate.report({base:h1,head:h2,cwd:f.dir});assert.equal(r.overall,'HOLD_TRIAGE');
}));
test('added JS escalates rather than inheriting old file proof',()=>withF(f=>{
 const head=change(f,'new.js','document.title="extra"');const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'DIRECT_CHANGED_SCOPE');assert.ok(r.changedFiles[0].changes.includes('major_structure'));
}));
test('deleted HTML escalates',()=>withF(f=>{
 fs.unlinkSync(path.join(f.dir,'index.html'));const head=f.commit('deleted entry');const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'DIRECT_CHANGED_SCOPE');
}));
test('symlink in committed source is not followed or falsely deemed safe',()=>withF(f=>{
 fs.symlinkSync('style.css',path.join(f.dir,'untrusted.js'));const head=f.commit('symlink');const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'HOLD_TRIAGE');assert.ok(r.changedFiles[0].changes.includes('unknown_high_risk'));
}));
test('non-code change does not imply a new Fold test',()=>withF(f=>{
 const head=change(f,'picture.png','image not real, irrelevant to classifier');const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'NO_APPLICABLE_CODE_CHANGE');assert.equal(r.governance.devicePassClaimed,undefined);
}));
test('content hash and receipt digest remain deterministic',()=>withF(f=>{
 const head=change(f,'style.css','body{margin:3px}');const a=gate.report({base:f.base,head,cwd:f.dir}),b=gate.report({base:f.base,head,cwd:f.dir});
 assert.deepEqual(a,b);assert.match(a.digest,/^[0-9a-f]{64}$/);
}));
test('ref input injection rejected without touching git',()=>withF(f=>{
 assert.throws(()=>gate.report({base:'HEAD;touch /tmp/stop',head:f.base,cwd:f.dir}),/BAD_REVISION/);
}));
test('CLI writes JSON and Markdown with no device PASS',()=>withF(f=>{
 const head=change(f,'style.css','body { color: teal; }');const dest=path.join(f.dir,'receipts');
 gate.main(['--base',f.base,'--head',head,'--cwd',f.dir,'--json',path.join(dest,'receipt.json'),'--markdown',path.join(dest,'summary.md')]);
 const r=JSON.parse(fs.readFileSync(path.join(dest,'receipt.json'))),m=fs.readFileSync(path.join(dest,'summary.md'),'utf8');
 assert.equal(r.governance.physicalFoldTestPerformed,false);assert.match(m,/GONG CP03/);assert.match(m,/LOCAL_CHECK/)
}));
test('unchanged snapshot does not conjure actual physical proof',()=>withF(f=>{
 const r=gate.report({base:f.base,head:f.base,cwd:f.dir});assert.equal(r.overall,'NO_APPLICABLE_CODE_CHANGE');assert.equal(r.governance.ownerDevicePassClaimed,false)
}));
test('CI workflow YAML delta becomes triage rather than exempt',()=>withF(f=>{
 fs.mkdirSync(path.join(f.dir,'.github','workflows'),{recursive:true});
 fs.writeFileSync(path.join(f.dir,'.github','workflows','ci.yml'),'name: A\n');
 const b=f.commit('workflow baseline');
 fs.writeFileSync(path.join(f.dir,'.github','workflows','ci.yml'),'name: B\n');
 const h=f.commit('workflow changed');const r=gate.report({base:b,head:h,cwd:f.dir});
 assert.equal(r.overall,'HOLD_TRIAGE');assert.equal(r.changedFiles[0].path,'.github/workflows/ci.yml');
}));
test('mode-only change is structural, not falsely identical',()=>withF(f=>{
 fs.chmodSync(path.join(f.dir,'app.js'),0o755);const head=f.commit('executable mode change');
 const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'DIRECT_CHANGED_SCOPE');assert.equal(r.changedFiles[0].modeBefore,'100644');assert.equal(r.changedFiles[0].modeAfter,'100755');
}));
test('multi-file changes escalate to highest priority without deleting lesser recommendations',()=>withF(f=>{
 fs.writeFileSync(path.join(f.dir,'style.css'),'body{padding:8px}');
 fs.writeFileSync(path.join(f.dir,'app.js'),'addEventListener("touchstart",()=>{});');
 const h=f.commit('css and sensitive JS');const r=gate.report({base:f.base,head:h,cwd:f.dir});
 assert.equal(r.overall,'DIRECT_CHANGED_SCOPE');assert.equal(r.changedFileCount,2);assert.ok(r.changedFiles.some(x=>x.priority==='LOCAL_CHECK'));
}));
test('changed CSS touch-action escalates to direct rather than routine styling',()=>withF(f=>{
 const head=change(f,'style.css','body { touch-action: none; }\n');const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'DIRECT_CHANGED_SCOPE');assert.ok(r.changedFiles[0].changes.includes('touch_routing'));
}));
test('new CSS from remote import receives direct third-party caution',()=>withF(f=>{
 const head=change(f,'style.css','@import url("https://cdn.example.invalid/unsafe.css");\n');const r=gate.report({base:f.base,head,cwd:f.dir});
 assert.equal(r.overall,'DIRECT_CHANGED_SCOPE');assert.ok(r.changedFiles[0].changes.includes('third_party'));
}));