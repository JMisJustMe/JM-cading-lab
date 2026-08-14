# Exact JM Command Register v1.0 — Proposal Boundary

The preserved base64 carrier was compared against the exact local gzip at Git-object level.

## Reuse result

- Every standing carrier region already matched except two 2,500-character regions.
- Those two regions are replaced by ten 500-character repair blobs.
- Every repair blob is accepted only where its returned Git blob SHA equals the locally calculated Git blob SHA.

## Exact proof target

- Assembled base64 characters: `154868`
- Compressed size: `116149` bytes
- Compressed SHA-256: `d1e547e1bfbb2c14a3319a09a54aeda80114ef4925415923987008febf8c6438`
- Reconstructed HTML size: `2530896` bytes
- Reconstructed SHA-256: `abfffcc82f2aad630ce065702334366cd4b713a282add523a1d973b702871410`

The proposal workflow reconstructs and proves the HTML, then commits the result only to `jm-proposal/exact-command-register-v1-0`. It does not write `main`, dispatch deployment rails, retire itself or claim a JM Ding.
