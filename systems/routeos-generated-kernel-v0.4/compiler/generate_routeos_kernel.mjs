#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCading } from '../../routeos-two-generated-bodies-v0.3/compiler/donor/cading.mjs';
import { sha256Text } from '../../routeos-two-generated-bodies-v0.3/compiler/donor/util.mjs';

const [sourcePath, outputDir] = process.argv.slice(2);
if (!sourcePath || !outputDir) { console.error('usage: generate_routeos_kernel.mjs SOURCE OUTPUT_DIR'); process.exit(2); }
const REQUIRED_OFFICES = ['IGNITIONBODY','CORESTATE','MEMORYBODY','INTERRUPTBODY','ROUTESCHEDULER','PERMISSIONGATE','FAULTHOLD','RECOVERYBODY'];
const REQUIRED_EXPECTATIONS = ['GENERATED_BOOT_ASSEMBLY','GENERATED_KERNEL_C','GENERATED_LINKER_LAYOUT','TWO_GENERATED_USER_BODIES','GRUB_QEMU_MACHINE_RECEIPT'];
const numberValue = (value,label) => { const n=/^0x/i.test(value)?Number.parseInt(value,16):Number.parseInt(value,10); if(!Number.isSafeInteger(n)||n<0)throw new Error(`Invalid ${label}: ${value}`); return n; };
const hex = value => `0x${value.toString(16).toUpperCase()}`;
function replaceAll(text,replacements){let out=text;for(const [k,v] of Object.entries(replacements))out=out.split(k).join(String(v));const left=out.match(/__[A-Z0-9_]+__/g);if(left)throw new Error(`Unresolved placeholders: ${[...new Set(left)].join(', ')}`);return out;}
const source=await readFile(sourcePath,'utf8'); const templateDir=new URL('./templates/', import.meta.url); const BOOT_TEMPLATE=await readFile(new URL('boot.S.in',templateDir),'utf8'); const KERNEL_TEMPLATE=await readFile(new URL('routeos_kernel.c.in',templateDir),'utf8'); const LINKER_TEMPLATE=await readFile(new URL('linker.ld.in',templateDir),'utf8'); const model=parseCading(source,sourcePath); const kernelFn=model.functions.find(fn=>fn.name==='kernel'); if(!kernelFn)throw new Error('Kernel Source Gate HOLD: func kernel required');
const offices={},devices={},memory={},timer={},syscalls={},slots={},expectations=[];let sealed=false;
for(const ins of kernelFn.instructions){
  if(ins.kind==='expect'){expectations.push(ins.value.trim());continue;}
  if(ins.kind==='return'){sealed=ins.value.trim().toUpperCase()==='SEALED';continue;}
  if(ins.kind!=='emit')throw new Error(`Unsupported kernel instruction: ${ins.kind}`);
  const parts=ins.value.trim().split(/\s+/); const kind=parts.shift()?.toUpperCase();
  if(kind==='OFFICE'){const name=parts.shift()?.toUpperCase();if(!name||!parts.length)throw new Error(`Malformed OFFICE: ${ins.value}`);offices[name]=parts.join('_').toUpperCase();}
  else if(kind==='DEVICE'){const type=parts.shift()?.toUpperCase(),name=parts.shift()?.toUpperCase(),address=parts.shift();if(type!=='SERIAL'||name!=='COM1'||!address)throw new Error(`Unsupported DEVICE: ${ins.value}`);devices.COM1=numberValue(address,'COM1');}
  else if(kind==='MEMORY'){const name=parts.shift()?.toUpperCase();memory[name]=numberValue(parts.shift(),name);}
  else if(kind==='TIMER'){const name=parts.shift()?.toUpperCase();timer[name]=numberValue(parts.shift(),name);}
  else if(kind==='SYSCALL'){const name=parts.shift()?.toUpperCase();syscalls[name]=numberValue(parts.shift(),name);}
  else if(kind==='USER_SLOT'){const id=numberValue(parts.shift(),'body id');if(id!==1&&id!==2)throw new Error(`Unsupported user slot: ${id}`);slots[id]={code:numberValue(parts.shift(),`body ${id} code`),stackPage:numberValue(parts.shift(),`body ${id} stack page`),stackTop:numberValue(parts.shift(),`body ${id} stack top`)};}
  else throw new Error(`Unsupported kernel emit: ${ins.value}`);
}
const missingOffices=REQUIRED_OFFICES.filter(x=>!offices[x]); if(missingOffices.length)throw new Error(`Kernel Source Gate HOLD: missing offices: ${missingOffices.join(', ')}`);
const missingExpectations=REQUIRED_EXPECTATIONS.filter(x=>!expectations.includes(x)); if(missingExpectations.length)throw new Error(`Kernel Source Gate HOLD: missing expectations: ${missingExpectations.join(', ')}`);
if(!sealed)throw new Error('Kernel Source Gate HOLD: return SEALED required');
for(const k of ['HEAP_BLOCKS','HEAP_BLOCK_SIZE'])if(!memory[k])throw new Error(`missing ${k}`);for(const k of ['PIT_HZ','TRACE_QUANTUM'])if(!timer[k])throw new Error(`missing ${k}`);for(const k of ['TRACE_READ','YIELD','ROUTE_STATE'])if(!syscalls[k])throw new Error(`missing syscall ${k}`);if(!devices.COM1||!slots[1]||!slots[2])throw new Error('device or slots missing');if(new Set(Object.values(syscalls)).size!==3)throw new Error('syscalls must be distinct');
const blueprintSha=sha256Text(source); const irCore={schema:'jm.onebody.routeos-kernel/v1',identity:{module:model.module,family:model.family,owner:model.owner,version:model.version},compiler:{frontend:'JM Android Forge v1.1 Cading parser',ir:'Kernel OneBody IR',backend:'RouteOS Native Kernel Backend v0.4',targets:['x86_64 boot assembly','freestanding kernel C','ELF linker layout']},offices,devices:{serial:{name:'COM1',address:devices.COM1}},memory,timer,syscalls,userSlots:slots,expectations,routes:model.routes,maps:model.maps,declarations:model.declarations,provenance:{source:path.basename(sourcePath),sourceSha256:blueprintSha,authority:'Theodore Benjamin Scott / JM / JMISJUSTME; AI-assisted backend implementation'}};
const irCoreText=`${JSON.stringify(irCore,null,2)}\n`; const irSha=sha256Text(irCoreText); const ir={...irCore,provenance:{...irCore.provenance,kernelIrSha256:irSha}};
const r={'__KERNEL_BLUEPRINT_SHA__':blueprintSha,'__KERNEL_IR_SHA__':irSha,'__COM1__':hex(devices.COM1),'__HEAP_BLOCKS__':memory.HEAP_BLOCKS,'__HEAP_BLOCK_SIZE__':memory.HEAP_BLOCK_SIZE,'__PIT_HZ__':timer.PIT_HZ,'__TRACE_QUANTUM__':timer.TRACE_QUANTUM,'__SYS_TRACE_READ__':syscalls.TRACE_READ,'__SYS_YIELD__':syscalls.YIELD,'__SYS_ROUTE_STATE__':syscalls.ROUTE_STATE,'__USER1_CODE__':hex(slots[1].code),'__USER1_STACK_PAGE__':hex(slots[1].stackPage),'__USER1_STACK_TOP__':hex(slots[1].stackTop),'__USER2_CODE__':hex(slots[2].code),'__USER2_STACK_PAGE__':hex(slots[2].stackPage),'__USER2_STACK_TOP__':hex(slots[2].stackTop)};
const boot=replaceAll(BOOT_TEMPLATE,r),kernel=replaceAll(KERNEL_TEMPLATE,r),linker=replaceAll(LINKER_TEMPLATE,r);await mkdir(outputDir,{recursive:true});
await writeFile(path.join(outputDir,'boot.S'),boot);await writeFile(path.join(outputDir,'routeos_kernel.c'),kernel);await writeFile(path.join(outputDir,'linker.ld'),linker);await writeFile(path.join(outputDir,'routeos_kernel.onebody.json'),`${JSON.stringify(ir,null,2)}\n`);
const receipt={status:'KERNEL LOWERING PASS',source:path.basename(sourcePath),blueprintSha256:blueprintSha,kernelIrSha256:irSha,bootAssemblySha256:sha256Text(boot),kernelCSha256:sha256Text(kernel),linkerSha256:sha256Text(linker),generatedTargets:['boot.S','routeos_kernel.c','linker.ld'],offices:REQUIRED_OFFICES,sourceMaintainedTargets:false};await writeFile(path.join(outputDir,'routeos_kernel.lowering_receipt.json'),`${JSON.stringify(receipt,null,2)}\n`);
console.log('JM_KERNEL_BLUEPRINT_PARSE PASS');console.log('KERNEL_ONEBODY_IR PASS');console.log('GENERATED_BOOT_ASSEMBLY PASS');console.log('GENERATED_KERNEL_C PASS');console.log('GENERATED_LINKER_LAYOUT PASS');console.log(`BLUEPRINT_SHA256 ${blueprintSha}`);console.log(`KERNEL_IR_SHA256 ${irSha}`);console.log(`BOOT_ASSEMBLY_SHA256 ${receipt.bootAssemblySha256}`);console.log(`KERNEL_C_SHA256 ${receipt.kernelCSha256}`);console.log(`LINKER_SHA256 ${receipt.linkerSha256}`);
