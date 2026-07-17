# OPEN FIRST — JM EveryBody v1.0

## Fastest visible route

Open:

```text
coding-estate/everybody/index.html
```

The browser workbench provides five rooms:

1. **Bodies** — search and inspect all 76 recovered entries;
2. **Maximise** — describe a goal and receive a lead/supporting-body formation without crowning a supreme body;
3. **Portable Compiler** — run source through lexer → parser → AST → semantics → IR → runtime → receipt;
4. **Native Front Ends** — test the exact recovered Cading, MMZG and Speakuals subsets;
5. **Estate Receipt** — inspect current registry and target boundaries.

## Command route

From this folder:

```bash
npm test
npm run build
npm run verify:js
npm run audit
npm run list
```

Or use the CLI directly:

```bash
node cli.mjs list
node cli.mjs audit
node cli.mjs adapters
node cli.mjs resolve --goal "Build a mobile game runtime" --cap game,parser,IR,runtime,trace --target javascript,cpp_lineage,rust,wasm --constraint Android,identity-preservation
node cli.mjs native cading --source "Zzza, za-zuh, zuzz = zeze.nwona.✓"
node cli.mjs native mmzg --source "ZG[BOND] @ CH3 :: M−[stack:fold:governance] + I[fix] ⟐ F[connector-pass] → JM?[audit-pressure] → PΔ[tighten:body] → T✓[receipt:proof] → PALM[current-best]"
```

## Expected result

`npm test` should pass:

- federated 76-entry registry checks;
- no-supreme-body law;
- maximiser resolution;
- exact Cading native adapter;
- exact MMZG native adapter;
- exact Speakuals native adapter;
- visible refusal of an unrecovered FlowTalk grammar;
- malformed native-source rejection.

`npm run build` creates `generated/` with one individual pack for every registered body.

`npm run verify:js` generates all packs and executes all 76 JavaScript runtime receipts.

The GitHub Actions matrix additionally compiles and executes all packs through:

```text
JavaScript
TypeScript
WebAssembly
C++98
C++03
C++11
C++14
C++17
C++20
C++23
C++26 draft / Clang c++2c
Rust 2021
Rust 2024
```

## Truth boundary

A green portable target proves that the body identity, law and portable execution contract survived that target.

It does **not** prove that the body’s full historical native syntax has been recovered. Exact native syntax is only claimed where an exact native adapter exists and passes its own tests.

If an adapter is missing, the correct result is:

```text
NATIVE_ADAPTER_NOT_RECOVERED
```

That is not a dead button. It is the recovery route doing its job.
