# JM-operated Host — CP01 portable delivery adapter

An **additive capability recipient** of the existing JM Sovereign Agent / Universal Host Adapter Conformance lineage. Does **not** replace JM CLOUD CONTACT SERVER, Build Mesh, Cloudflare, Render, or the Estate public site.

Node 20+; no third-party dependencies. Store runtime/release files outside the public GitHub repository, under owner-controlled filesystem permissions.

* Deploy: `node host.mjs deploy jm-cloud-contact ./prepared-public-site /private/jm-store`
* Inspect: `node host.mjs inspect jm-cloud-contact /private/jm-store`
* Serve: `node host.mjs serve /private/jm-store`
* Rollback: `node host.mjs rollback jm-cloud-contact /private/jm-store`
* Local static delivery: `http://127.0.0.1:8795/apps/jm-cloud-contact/`
* Read-only health: `http://127.0.0.1:8795/_jm/ready`
* Test: `node --test host.test.mjs`

Features: content-addressed release manifests, per-file integrity checks, atomic active pointers, verified rollback, symlink/traversal refusal, read-only HTTP, bounded input, repeatable release state and readback. Local CLI-only mutation. Default listener is loopback. `JM_HOST_ALLOW_LAN=1` is explicit *insecure LAN HTTP*, not safe internet deployment.

**Proof boundaries:** prepared static files only. Does not yet execute arbitrary apps, host Cloud Contact's dynamic `/v5` API, perform managed TLS, load balancing, tenancy, cross-machine locking, off-site backups, autoscaling, build containers, or public deploy. It is not full Render parity. Do not expose HTTP to the Internet. Host state and backup reliability require independent examination before replacing services. Existing host adapters remain unaffected. Recipient test proof does not transfer from donors.
