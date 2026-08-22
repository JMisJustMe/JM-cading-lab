# Proof expectations

A merge is earned only when GitHub Actions independently proves:

1. canonical frozen source byte count = 466,327;
2. canonical SHA-256 = `24cf1b91ef267bca46ffd55e346c9b0d85055afbc3e1bdfcd9d8968e551a58fc`;
3. `CURRENT_HEAD_POINTER.json` agrees with the v2.4.0 source identity;
4. exactly 11 inline JavaScript bodies are extracted and all pass `node --check`;
5. targeted private/signing/credential signatures are absent from the public-source body;
6. no APK, AAB, APKS, keystore, JKS, P12 or PFX payload is present in the publication body;
7. the publication manifest is valid JSON.
