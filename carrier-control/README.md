# JM Multi-Carrier Control Organ

**Keeper:** DO NOT CHOOSE A FORMAT. CHOOSE THE POWERS THE BODY NEEDS.

This is the reusable operating rail descended from **JM Multi-Carrier Build Mode v1.0**.
It does not force every application into PWA, APK, multi-file, or single-file form.
It keeps the application body sovereign and produces/validates the carriers that body earns.

## Floor

`BODY -> VERIFIED BODY -> DIRECT HTTPS DOCUMENT`

The direct HTTPS document is the launch floor. It must not require Base64 decoding,
gzip reconstruction, `document.write()`, or service-worker resurrection simply to open.

## Optional powers

- **PWA** — installation, offline/cache/update enhancement.
- **Portable HTML** — move/recovery/share/test carrier.
- **Mirror** — independent host carrying the same verified body.
- **Native/APK** — escalation when device authority materially earns it.

PWA, mirror, and native layers are enhancements/escalations. Their failure must not
silently redefine the verified application body as failed.

## Plan-driven usage

```bash
python tools/jm_carrier_control.py --plan beatbody/carrier-plan.json
```

A plan declares:

1. source body/carrier and expected source hash;
2. deterministic forward transforms;
3. exact expected target hash and invariants;
4. powers to expose;
5. direct/portable/receipt outputs.

The controller returns **DING** only after source verification, deterministic transforms,
target verification, PWA metadata checks (when enabled), and output emission.

## Standing laws

- `BODY != CARRIER`
- `DIRECT FIRST. ENHANCE SECOND. ESCALATE THIRD.`
- `PORTABILITY IS A PROPERTY, NOT THE PRODUCTION HOST.`
- `BUILD COMPLEXITY MAY BE HIGH; LAUNCH COMPLEXITY SHOULD BE LOW.`
- `PWA FAILURE != WEB BODY FAILURE.`
- `HOST FAILURE != BODY LOSS.`
- `MIRROR != FORK.` A mirror must carry the same verified body unless explicitly promoted as a descendant.

## Forward route

The next expansion is a carrier registry capable of running multiple plans in one pass,
then binding independent mirrors to the same verified outputs without duplicating app logic.
