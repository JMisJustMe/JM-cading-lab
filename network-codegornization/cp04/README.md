# JM NETWORK CODEGORNIZATION CP04 — PRIVATE TLS DEVICE CANDIDATE

Status: **DEVELOPMENT CANDIDATE — physical owner Fold↔laptop HOLD.** Inherits original CP01 ten native executed bodies, CP02 durable spool and CP03 signed packet contract. No donor changed; main untouched. Adds TLS 1.3, certificate pinning, restrictive IPv4, on-disk nonce replay custody, and operator CLI.

## On-device contact steps (Node 22+, OpenSSL)
Use a trusted home LAN. On a laptop install Node and OpenSSL; on Fold, Node under Termux is a proposed **untested** runtime. Keep credentials and spool outside source repository. Never send pair token/private key in chat, public repo, or screenshots.

1. Choose laptop private IPv4. Replace EXAMPLE_LAN_IP below with its real value. Both devices must share trusted Wi-Fi, and the firewall must restrict access to the Fold. Do not port-forward.
2. On laptop from checkout root create local certificate/key and pair token:

~~~sh
umask 077
mkdir -p "$HOME/.jm-cp04"
openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 7 \
  -keyout "$HOME/.jm-cp04/server.key" -out "$HOME/.jm-cp04/server.crt" \
  -subj "/CN=JM-CP04-Personal-Laptop" \
  -addext "subjectAltName=IP:EXAMPLE_LAN_IP"
node network-codegornization/cp04/cli.mjs pair --out "$HOME/.jm-cp04/pair.secret"
openssl x509 -in "$HOME/.jm-cp04/server.crt" -noout -fingerprint -sha256
~~~

3. Copy public certificate server.crt and pair.secret confidentially to the Fold (for example direct USB cable); NEVER transfer server.key. Limit pair.secret permissions to 0600. Independently confirm the certificate fingerprint on both screens. Transferring a fingerprint with an unverified certificate through the same untrusted channel does NOT prove authenticity.
4. On laptop, explicitly bind to real private LAN IP, no wildcard bind:

~~~sh
node network-codegornization/cp04/cli.mjs receive \
  --root "$HOME/.jm-cp04/spool" --bind EXAMPLE_LAN_IP --port 41204 \
  --cert "$HOME/.jm-cp04/server.crt" --key "$HOME/.jm-cp04/server.key" \
  --token "$HOME/.jm-cp04/pair.secret"
~~~

5. On Fold in Termux, with CP04 checkout and transferred credentials:

~~~sh
node network-codegornization/cp04/cli.mjs send \
  --host EXAMPLE_LAN_IP --port 41204 --channel device --id fold_probe_001 \
  --message "JM FOLD LAPTOP FIRST CONTACT" \
  --cert "$HOME/.jm-cp04/server.crt" --token "$HOME/.jm-cp04/pair.secret" \
  --pin ACTUAL_64_HEX_CERTIFICATE_SHA256
~~~

6. On laptop, independently inspect actual receiving machine disk:

~~~sh
node network-codegornization/cp04/cli.mjs recover --root "$HOME/.jm-cp04/spool"
~~~

Observe sending-device receipt, independently persisted ID and ten-body original native receipt, true local addresses, owner-device evidence and successful cold recovery BEFORE any owner-device PASS. Keep this as synthetic test message ONLY, not real personal correspondence.

## Assurance boundaries
- **CI may PASS** native ten body route, socket TLS 1.3, exact pin/SAN, keyed packet/response, durable store, replay after restart, separate processes.
- **Owner Fold↔laptop remains HOLD** until real two-device contact is observed. The CI runner is one computer.
- **No real mailbox**: no SMTP/IMAP/SMS/DNS/cloud/WAN. No direct phone app/APK is built.
- The 32-byte randomly generated pair token is an out-of-band shared secret, NOT an interactive pairing screen. Certificate must be independently verified.
- TLS encrypts **in transit**; CP02 disk spool remains plaintext. Use synthetic data only.
- Nonce custody persists across restarts but has **no pruning/quota/backup policy**; never promote to production.
- A private IP bind alone does not replace host firewall, identity, key rotation, revocation or production access controls.
- Shut off receiver after test. Rotate secrets if leaked.

## Test

~~~sh
node --check network-codegornization/cp04/jm-device-contact.mjs
node --check network-codegornization/cp04/cli.mjs
node --check network-codegornization/cp04/selftest.mjs
node network-codegornization/cp04/selftest.mjs
~~~

The self-test uses short-lived local certificate fixtures and removes temporary files.

FLAZ lineage: protected Assembly 01 → CP01–CP03 Whole Push → CP04 pre-execution FLAZ → candidate. No Ding beyond proven scope.
