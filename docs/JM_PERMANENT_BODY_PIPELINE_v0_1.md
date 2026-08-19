# JM Permanent HTML Body Pipeline v0.1

**Authority:** Theodore Benjamin Scott / JM / JMISJUSTME  
**Roles:** Konengineer · Co-developer · Kodifier

## Purpose

A ChatGPT Android `content://` handle, temporary preview, sandbox link, or session download is **not** a permanent body.

The current Estate has two owned persistence lanes and one deliberate publication lane:

```text
TEMPORARY / LOCAL HTML
→ OWNER ROOM INTAKE
→ PRIVATE DURABLE R2 COPY WHEN JM PRESSES SYNC
→ BYTE HASH + DUPLICATE CHECK
→ GOVERNED REPOSITORY OFFICE WHEN JM CHOOSES PERMANENT PUBLIC PROMOTION
→ MANIFEST + RECEIPT
→ HUMAN REVIEW
→ GIT COMMIT
→ CLOUDFLARE DEPLOYMENT
→ STABLE JM-OWNED ROUTE
```

Private durability and public publication are separate gates. R2 does not silently publish a body. GitHub/Cloudflare publication does not silently copy every private body.

## Storage law

- Keep code and governed public source in Git/GitHub.
- Keep explicit private Owner Room state and private mounted-body copies in the JM Owner Vault (R2).
- Copy final HTML bytes once per authority lane; hash before copying.
- Do not create duplicate archives, `node_modules`, build caches, or whole-repository clones for a single body.
- If a byte-identical `index.html` already exists, return its current permanent route instead of creating another copy.
- Store only small JSON manifests and receipts beside or behind the body.
- Do not publish automatically.
- A private R2 copy is not a public crown.

## Promotion tool

Repository tool:

```text
tools/Promote-JMHtmlBody.ps1
```

It accepts either a local `.html` file path or an `https://` URL that returns the HTML bytes. It rejects `content://` because that is an Android-local handle rather than a transferable web address.

### Example

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Promote-JMHtmlBody.ps1 `
  -Source "C:\Users\theod\Downloads\MY_BODY.html" `
  -Slug "my-body" `
  -Office "apps" `
  -BodyName "My Body" `
  -Version "v0.1"
```

## What the tool creates

For a body promoted to `apps/my-body/`:

```text
apps/my-body/index.html
apps/my-body/body-manifest.json
receipts/body-intake/my-body-YYYYMMDD-HHMMSS.json
```

The HTML is not duplicated into the receipt. The receipt contains identity, route, bytes, hash, claim boundary and next gate.

## What the tool does not do

It does **not** commit, push, deploy, overwrite without an explicit switch, install packages, copy whole owner folders, merge separate JM bodies, or crown a body as live merely because a file exists.

## Approval and deployment gate

After staging:

1. inspect the diff;
2. open/test the HTML as appropriate;
3. validate recorded SHA-256;
4. confirm office and route;
5. approve commit/push;
6. verify deployed bytes after Cloudflare publishes;
7. update the relevant Estate registry only after identity and route are confirmed.

## Claim classes

```text
TEMPORARY      chat preview, device handle or transient download only
PRIVATE_HELD   explicit private durable Owner Vault copy; not publication
STAGED         exact bytes preserved in repository worktree with manifest/receipt
COMMITTED      Git history preserves the body at an exact commit
DEPLOYED       Cloudflare returns the body at a stable Estate route
REGISTERED     Estate governance recognises identity, office, source, route and lineage
PROVEN / DING  declared gates passed with evidence; deployment alone is not a Ding
```

## Default route pattern

```text
https://jmisjustme-estate.pages.dev/<office>/<slug>/
```

## Operating law

> The browser may retrieve the body.  
> The Owner Vault may hold a private durable copy.  
> Git may remember governed source.  
> Cloudflare may deliver an approved public route.  
> JM governance decides what the body is.

This pipeline exists so a finished current HTML body does not remain dependent on a temporary chat, browser session or one device.
