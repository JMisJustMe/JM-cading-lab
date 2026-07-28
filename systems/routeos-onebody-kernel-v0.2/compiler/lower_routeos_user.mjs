#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compileKernelUserOneBody, sha256Text } from './routeos_user_onebody.mjs';

const [sourcePath, outputDir] = process.argv.slice(2);
if (!sourcePath || !outputDir) {
  console.error('usage: node compiler/lower_routeos_user.mjs SOURCE OUTPUT_DIR');
  process.exit(2);
}

const source = await readFile(sourcePath, 'utf8');
const oneBody = compileKernelUserOneBody(source, sourcePath);
const irCoreJson = `${JSON.stringify(oneBody, null, 2)}\n`;
const irSha = sha256Text(irCoreJson);
oneBody.provenance.oneBodySha256 = irSha;
const stableJson = `${JSON.stringify(oneBody, null, 2)}\n`;

const lines = [
  '/* GENERATED. Source authority remains the .jm.cading body. */',
  '.section .generated_usertext,"ax"',
  '.global routeos_user1_blob_start',
  '.global routeos_user1_blob_end',
  'routeos_user1_blob_start:',
  '1:'
];
for (const op of oneBody.program) {
  if (op.name === 'TRACE_READ') {
    lines.push('  movq $1, %rax', '  movq %r12, %rdi', '  int $0x80');
  } else if (op.name === 'ROUTE_STATE') {
    lines.push('  movq $3, %rax', `  movq $${op.argument}, %rdi`, '  int $0x80');
  } else if (op.name === 'YIELD') {
    lines.push('  movq $2, %rax', '  int $0x80');
  }
}
lines.push(
  '  jmp 1b',
  'routeos_user1_blob_end:',
  '',
  '.section .rodata.generated,"a"',
  '.global routeos_generated_body_source_sha',
  '.global routeos_generated_body_ir_sha',
  'routeos_generated_body_source_sha:',
  `  .asciz "${oneBody.provenance.sourceSha256}"`,
  'routeos_generated_body_ir_sha:',
  `  .asciz "${irSha}"`,
  ''
);

await mkdir(outputDir, { recursive: true });
const asm = `${lines.join('\n')}\n`;
const asmPath = path.join(outputDir, 'generated_user_body_1.S');
const irPath = path.join(outputDir, 'generated_user_body_1.onebody.json');
const receiptPath = path.join(outputDir, 'generated_user_body_1.lowering_receipt.json');
await writeFile(asmPath, asm);
await writeFile(irPath, stableJson);
await writeFile(receiptPath, `${JSON.stringify({
  status: 'LOWERING PASS',
  source: path.basename(sourcePath),
  sourceSha256: oneBody.provenance.sourceSha256,
  oneBodySha256: irSha,
  assemblySha256: sha256Text(asm),
  target: 'RouteOS x86_64 CPL3 int 0x80 ABI',
  symbols: ['routeos_user1_blob_start', 'routeos_user1_blob_end', 'routeos_generated_body_source_sha', 'routeos_generated_body_ir_sha']
}, null, 2)}\n`);
console.log('ONEBODY_ROUTEOS_LOWERING PASS');
console.log(`SOURCE_SHA256 ${oneBody.provenance.sourceSha256}`);
console.log(`ONEBODY_SHA256 ${irSha}`);
console.log(`ASSEMBLY_SHA256 ${sha256Text(asm)}`);
