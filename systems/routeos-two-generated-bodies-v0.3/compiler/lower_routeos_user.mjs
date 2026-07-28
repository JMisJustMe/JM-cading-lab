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
const bodyId = oneBody.identity.bodyId;
const prefix = `generated_user_body_${bodyId}`;
const symbol = `routeos_user${bodyId}`;
const hashSymbol = `routeos_generated_body${bodyId}`;

const irCoreJson = `${JSON.stringify(oneBody, null, 2)}\n`;
const irSha = sha256Text(irCoreJson);
oneBody.provenance.oneBodySha256 = irSha;
const stableJson = `${JSON.stringify(oneBody, null, 2)}\n`;

const lines = [
  '/* GENERATED. Source authority remains the .jm.cading body. */',
  `.section .generated_usertext.body${bodyId},"ax"`,
  `.global ${symbol}_blob_start`,
  `.global ${symbol}_blob_end`,
  `${symbol}_blob_start:`,
  '  xorq %rbx, %rbx',
  '1:'
];
for (const op of oneBody.program) {
  if (op.name === 'TRACE_READ') {
    lines.push('  movq $1, %rax', '  movq %r12, %rdi', '  int $0x80');
  } else if (op.name === 'ROUTE_STATE') {
    lines.push('  movq $3, %rax', `  movq $${op.argument}, %rdi`, '  int $0x80');
  } else if (op.name === 'FAULT_UD_AFTER') {
    lines.push('  incq %rbx', `  cmpq $${op.afterRuns}, %rbx`, '  jne 2f', '  ud2', '2:');
  } else if (op.name === 'YIELD') {
    lines.push('  movq $2, %rax', '  int $0x80');
  }
}
lines.push(
  '  jmp 1b',
  `${symbol}_blob_end:`,
  '',
  `.section .rodata.generated.body${bodyId},"a"`,
  `.global ${hashSymbol}_source_sha`,
  `.global ${hashSymbol}_ir_sha`,
  `${hashSymbol}_source_sha:`,
  `  .asciz "${oneBody.provenance.sourceSha256}"`,
  `${hashSymbol}_ir_sha:`,
  `  .asciz "${irSha}"`,
  ''
);

await mkdir(outputDir, { recursive: true });
const asm = `${lines.join('\n')}\n`;
const asmPath = path.join(outputDir, `${prefix}.S`);
const irPath = path.join(outputDir, `${prefix}.onebody.json`);
const receiptPath = path.join(outputDir, `${prefix}.lowering_receipt.json`);
const symbols = [
  `${symbol}_blob_start`, `${symbol}_blob_end`,
  `${hashSymbol}_source_sha`, `${hashSymbol}_ir_sha`
];
await writeFile(asmPath, asm);
await writeFile(irPath, stableJson);
await writeFile(receiptPath, `${JSON.stringify({
  status: 'LOWERING PASS',
  bodyId,
  source: path.basename(sourcePath),
  sourceSha256: oneBody.provenance.sourceSha256,
  oneBodySha256: irSha,
  assemblySha256: sha256Text(asm),
  target: 'RouteOS x86_64 CPL3 int 0x80 ABI',
  deliberateFaultOwner: bodyId === 2,
  symbols
}, null, 2)}\n`);
console.log(`ONEBODY_ROUTEOS_BODY_${bodyId}_LOWERING PASS`);
console.log(`BODY_ID ${bodyId}`);
console.log(`SOURCE_SHA256 ${oneBody.provenance.sourceSha256}`);
console.log(`ONEBODY_SHA256 ${irSha}`);
console.log(`ASSEMBLY_SHA256 ${sha256Text(asm)}`);
