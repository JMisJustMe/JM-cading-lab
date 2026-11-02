# T-Boys: Estate Clash v0.2.3 — JM Screen Logic

## OPEN FIRST

`TBOYS_ESTATE_CLASH_v0_2_3_JM_SCREEN_LOGIC_SINGLE_HTML.html`

Keep internet on when opening; Three.js is loaded through CDN routes.

## Open First — recover the exact HTML, not a substitute

This GitHub checkout stores the original `TBOYS_ESTATE_CLASH_v0_2_3_JM_SCREEN_LOGIC_SINGLE_HTML.html` as **three compressed, Base64-encoded source parts**, rather than a directly openable HTML file. The name above is the output filename: it is **not** already present as a standalone file in this checkout.

From this directory, run the same decode-and-decompress route used by the repository's existing `validate-wave2-tboys-estate-clash-v0.2.3.yml` proof. Python 3 is required:

```sh
python -c "from pathlib import Path; import base64,gzip,hashlib; p=Path('source-carriage'); encoded=b''.join((p/f'source.part{i:02d}.b64').read_bytes() for i in range(3)); data=gzip.decompress(base64.b64decode(encoded,validate=True)); assert len(data)==56072 and hashlib.sha256(data).hexdigest()=='52263e0e63a25b3ba394faeff0c1b525a9a3a68d7a62290a9c2baca75b755608', 'Original source verification failed'; Path('TBOYS_ESTATE_CLASH_v0_2_3_JM_SCREEN_LOGIC_SINGLE_HTML.html').write_bytes(data); print('PASS: verified T-Boys v0.2.3 HTML restored')"
```

Only after the exact byte count **56,072** and SHA-256 `52263e0e63a25b3ba394faeff0c1b525a9a3a68d7a62290a9c2baca75b755608` match should you open the restored HTML. The existing proof workflow already checks the same source and also reports the original bounded static/headless QA. This instruction does **not** prove physical phone gameplay, browser performance, or a packaged Zionfolder was delivered. Do not replace the compressed parts or confuse this v0.2.3 lineage with a newer T-Boys descendant.

## Main graft

The phone is now a moving portrait viewport into a larger arena. The camera follows the active fighter after a soft dead zone, leads movement, lightly includes the selected rival, and switches authority after tag.

## Delivery

- separate standalone HTML for quick testing;
- fully packaged same-version Zionfolder;
- source and QA receipts included.

## Proof boundary

Source QA is not owner phone Ding. Camera feel, disorientation, combat readability and performance remain open until contact.
