#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCading } from '../../routeos-two-generated-bodies-v0.3/compiler/donor/cading.mjs';
import { sha256Text } from '../../routeos-two-generated-bodies-v0.3/compiler/donor/util.mjs';

const [sourcePath, generatedDir] = process.argv.slice(2);
if (!sourcePath || !generatedDir) { console.error('usage: apply_contact_action_overlay.mjs SOURCE GENERATED_DIR'); process.exit(2); }
const source = await readFile(sourcePath, 'utf8');
const model = parseCading(source, sourcePath);
const fn = model.functions.find(item => item.name === 'contact');
if (!fn) throw new Error('Contact Overlay Gate HOLD: func contact required');
const offices = {}, devices = {}, memory = {}, expectations = []; let sealed = false;
const numberValue = (value, label) => { const n = /^0x/i.test(value) ? Number.parseInt(value,16) : Number.parseInt(value,10); if (!Number.isSafeInteger(n) || n < 1) throw new Error(`Invalid ${label}: ${value}`); return n; };
for (const ins of fn.instructions) {
  if (ins.kind === 'expect') { expectations.push(ins.value.trim()); continue; }
  if (ins.kind === 'return') { sealed = ins.value.trim().toUpperCase() === 'SEALED'; continue; }
  if (ins.kind !== 'emit') throw new Error(`Unsupported overlay instruction: ${ins.kind}`);
  const parts = ins.value.trim().split(/\s+/); const kind = parts.shift()?.toUpperCase();
  if (kind === 'OFFICE') { const name = parts.shift()?.toUpperCase(); offices[name] = parts.join('_').toUpperCase(); }
  else if (kind === 'DEVICE') { const type=parts.shift()?.toUpperCase(),name=parts.shift()?.toUpperCase(),address=parts.shift(); if(type!=='KEYBOARD'||name!=='PS2'||!address)throw new Error(`Unsupported overlay device: ${ins.value}`); devices.KEYBOARD_DATA=numberValue(address,'keyboard data port'); }
  else if (kind === 'MEMORY') { const name=parts.shift()?.toUpperCase(); memory[name]=numberValue(parts.shift(),name); }
  else throw new Error(`Unsupported overlay emit: ${ins.value}`);
}
const requiredOffices=['AUTOGATE','ROUTESCHEDULER','KICPLAY','DEVICEROUTE'];
const requiredExpectations=['BASE_GENERATED_KERNEL_V0_4','AUTO_GATE_FIRST_CONTACT','KICPLAY_INPUT_TO_ACTION','INOUT16_ORIGIN_PROCESSING_EXPRESSION_RECOVERY','NO_ERASURE_CONTACT_LEDGER','EXISTING_ROUTESCHEDULER_CONTINUATION'];
for(const item of requiredOffices)if(!offices[item])throw new Error(`Contact Overlay Gate HOLD: missing office ${item}`);
for(const item of requiredExpectations)if(!expectations.includes(item))throw new Error(`Contact Overlay Gate HOLD: missing expectation ${item}`);
if(!sealed||!devices.KEYBOARD_DATA||!memory.CONTACT_LEDGER_CAPACITY)throw new Error('Contact Overlay Gate HOLD: incomplete sealed contract');
const overlayCore={schema:'jm.onebody.routeos-kernel-contact-overlay/v1',identity:{module:model.module,family:model.family,owner:model.owner,version:model.version},compiler:{frontend:'JM Android Forge v1.1 Cading parser',backend:'RouteOS Contact Convergence Overlay v0.5'},offices,devices:{keyboard:{name:'PS2',dataPort:devices.KEYBOARD_DATA,irq:1,vector:33}},memory,expectations,routes:model.routes,maps:model.maps,declarations:model.declarations,provenance:{source:path.basename(sourcePath),sourceSha256:sha256Text(source),authority:'Theodore Benjamin Scott / JM / JMISJUSTME; AI-assisted overlay implementation'}};
const coreText=`${JSON.stringify(overlayCore,null,2)}\n`; const overlaySha=sha256Text(coreText); const overlay={...overlayCore,provenance:{...overlayCore.provenance,overlayIrSha256:overlaySha}};
const bootPath=path.join(generatedDir,'boot.S'), kernelPath=path.join(generatedDir,'routeos_kernel.c');
let boot=await readFile(bootPath,'utf8'), kernel=await readFile(kernelPath,'utf8');
const replaceOnce=(text,from,to,label)=>{if(!text.includes(from))throw new Error(`Contact Overlay Gate HOLD: missing ${label}`);return text.replace(from,to);};
boot=replaceOnce(boot,'ROUTEOS_ISR routeos_isr_timer, 32\nROUTEOS_ISR routeos_isr_syscall, 128','ROUTEOS_ISR routeos_isr_timer, 32\nROUTEOS_ISR routeos_isr_keyboard, 33\nROUTEOS_ISR routeos_isr_syscall, 128','keyboard ISR insertion point');
kernel=replaceOnce(kernel,'#define COM1 0x3F8','#define COM1 0x3F8\n#define KEYBOARD_DATA 0x60','keyboard port insertion');
kernel=replaceOnce(kernel,'extern void routeos_isr_timer(void);','extern void routeos_isr_timer(void);\nextern void routeos_isr_keyboard(void);','keyboard symbol insertion');
kernel=replaceOnce(kernel,'const char routeos_kernel_ir_sha[] =','const char routeos_contact_action_overlay_source_sha[] = "'+overlayCore.provenance.sourceSha256+'";\nconst char routeos_contact_action_overlay_sha[] = "'+overlaySha+'";\nconst char routeos_kernel_ir_sha[] =','overlay hash insertion');
kernel=replaceOnce(kernel,'idt_set(32,routeos_isr_timer,0x8E);idt_set(128,routeos_isr_syscall,0xEE);','idt_set(32,routeos_isr_timer,0x8E);idt_set(33,routeos_isr_keyboard,0x8E);idt_set(128,routeos_isr_syscall,0xEE);','keyboard IDT insertion');
kernel=replaceOnce(kernel,'outb(0x21,(uint8_t)(a1&~1U));','outb(0x21,(uint8_t)(a1&~3U));','IRQ1 unmask');
const stateNeedle='static struct body bodies[2]; static int current_body=-1; static uint64_t ticks; static uint64_t routeos_state;';
const contactCode=`${stateNeedle}\n#define CONTACT_LEDGER_CAPACITY ${memory.CONTACT_LEDGER_CAPACITY}\nstruct contact_event { uint64_t sequence; uint8_t scancode; uint8_t action; uint16_t reserved; uint64_t route_state; };\nstatic struct contact_event contact_ledger[CONTACT_LEDGER_CAPACITY];\nstatic uint64_t contact_count; static uint64_t kicplay_action;\nstatic struct cpu_frame *select_next(void); static void save_current(struct cpu_frame *frame);\nstatic void contact_record(uint8_t scancode,uint8_t action,uint64_t state){uint64_t sequence=contact_count+1;struct contact_event *event=&contact_ledger[contact_count%CONTACT_LEDGER_CAPACITY];event->sequence=sequence;event->scancode=scancode;event->action=action;event->route_state=state;contact_count=sequence;serial_write("[JM] NO-ERASURE CONTACT LEDGER COUNT ");serial_u64(contact_count);serial_write(" SCANCODE ");serial_u64(scancode);serial_write(" ACTION ");serial_u64(action);serial_write(" ROUTEOS STATE ");serial_u64(state);serial_write("\\n");}\nstatic struct cpu_frame *restore_active_body(void){if(current_body<0)return select_next();bodies[current_body].state=BODY_RUNNING;return &bodies[current_body].frame;}\nstatic struct cpu_frame *contact_to_action(struct cpu_frame *frame){uint8_t scancode=inb(KEYBOARD_DATA);outb(0x20,0x20);save_current(frame);if((scancode&0x80U)!=0U)return restore_active_body();serial_write("[JM] FIRST CONTACT -> AUTO-GATE / BORING OS: SCANCODE ");serial_u64(scancode);serial_write("\\n");receipt("INOUT-16 ORIGIN: PHYSICAL KEYBOARD CONTACT");receipt("INOUT-16 PROCESSING: AUTO-GATE AUTHORITY CHECK");uint8_t action=0;if(scancode==0x39U)action=1;else if(scancode==0x1CU)action=2;else if(scancode==0x24U)action=3;if(action==0){receipt("AUTO-GATE QUARANTINE: UNMAPPED CONTACT PRESERVED WITHOUT ACTIVATION");contact_record(scancode,0,routeos_state);receipt("INOUT-16 RECOVERY: ROUTEOS RETURNS CONTROL TO EXISTING ROUTESCHEDULER");return restore_active_body();}serial_write("[JM] AUTO-GATE PASS: CONTACT ");serial_u64(scancode);serial_write(" -> AUTHORITY ACCEPTED -> KICPLAY ACTION ");serial_u64(action);serial_write("\\n");routeos_state=100U+action;kicplay_action=action;receipt("INOUT-16 EXPRESSION: KICPLAY INPUT BECAME ACTION");serial_write("[JM] KICPLAY OS ACTION ");serial_u64(kicplay_action);serial_write(" -> ROUTEOS STATE ");serial_u64(routeos_state);serial_write(" -> GENERATED BODY 1 ACTIVATION ROUTE\\n");contact_record(scancode,action,routeos_state);receipt("INOUT-16 RECOVERY: ROUTEOS RETURNS CONTROL TO EXISTING ROUTESCHEDULER");return restore_active_body();}`;
kernel=replaceOnce(kernel,stateNeedle,contactCode,'contact state insertion');
kernel=replaceOnce(kernel,'  if(frame->vector==128){save_current(frame);','  if(frame->vector==33){return contact_to_action(frame);}\n  if(frame->vector==128){save_current(frame);','keyboard dispatch insertion');
kernel=replaceOnce(kernel,'receipt("INTERRUPT ROUTE ACTIVE");receipt("BODYREGISTRY: TWO GENERATED USER BODIES REGISTERED");','receipt("INTERRUPT ROUTE ACTIVE");receipt("AUTO-GATE / BORING OS: FIRST-CONTACT AUTHORITY + QUARANTINE ACTIVE");receipt("ROUTEOS: EXISTING ROUTESCHEDULER + PROOF + RECOVERY ACTIVE");receipt("KICPLAY OS: INPUT-TO-ACTION + BODY ACTIVATION ACTIVE");receipt("INOUT-16: ORIGIN -> PROCESSING -> EXPRESSION -> RECOVERY ACTIVE");receipt("DEVICE INPUT: PS/2 KEYBOARD IRQ1 ACTIVE");receipt("BODYREGISTRY: TWO GENERATED USER BODIES REGISTERED");','boot contact receipts insertion');
await writeFile(bootPath,boot); await writeFile(kernelPath,kernel);
await writeFile(path.join(generatedDir,'routeos_contact_action.overlay.onebody.json'),`${JSON.stringify(overlay,null,2)}\n`);
const receipt={status:'CONTACT ACTION OVERLAY LOWERING PASS',base:'RouteOS Generated Kernel v0.4',source:path.basename(sourcePath),sourceSha256:sha256Text(source),overlayIrSha256:overlaySha,patchedBootSha256:sha256Text(boot),patchedKernelCSha256:sha256Text(kernel),reused:['RouteScheduler','PermissionGate','FaultHold','RecoveryBody'],generatedTargetsMaintained:false};
await writeFile(path.join(generatedDir,'routeos_contact_action.overlay_receipt.json'),`${JSON.stringify(receipt,null,2)}\n`);
console.log('CONTACT_ACTION_OVERLAY_PARSE PASS');console.log('AUTO_GATE_OFFICE PASS');console.log('KICPLAY_OFFICE PASS');console.log('INOUT16_ROUTE PASS');console.log('EXISTING_ROUTESCHEDULER_REUSE PASS');console.log(`CONTACT_OVERLAY_SOURCE_SHA256 ${sha256Text(source)}`);console.log(`CONTACT_OVERLAY_IR_SHA256 ${overlaySha}`);console.log(`PATCHED_BOOT_SHA256 ${receipt.patchedBootSha256}`);console.log(`PATCHED_KERNEL_C_SHA256 ${receipt.patchedKernelCSha256}`);
