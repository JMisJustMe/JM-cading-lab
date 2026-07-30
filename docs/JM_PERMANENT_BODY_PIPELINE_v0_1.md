# JM Permanent HTML Body Pipeline v0.1

**Authority:** Theodore Benjamin Scott / JM / JMISJUSTME  
**Roles:** Konengineer · Co-developer · Kodifier

## Correction and purpose

A ChatGPT Android `content://` handle, temporary preview, sandbox link, or session download is **not** a permanent body.

The browser is useful only as an **intake hand**: it can open the temporary result and download the actual HTML bytes. Permanence comes from the governed route below:

```text
TEMPORARY CHAT HTML
→ DOWNLOAD ACTUAL FILE
→ JM ESTATE WORKBENCH INTAKE
→ BYTE HASH + DUPLICATE CHECK
→ GOVERNED REPOSITORY OFFICE
→ MANIFEST + RECEIPT
→ HUMAN REVIEW
→ GIT COMMIT
→ CLOUDFLARE DEPLOYMENT
→ STABLE JM-OWNED URL
```

The OpenAI browser does not replace JM3232 Navigator, Stringline, Git, GitHub, Cloudflare, or the JM Estate. It reduces the handoff between a temporary page and the owned source pipeline.

## Result extracted from the desktop setup

The desktop setup now has a useful, bounded role:

1. **Built-in browser:** opens the temporary HTML or download page and saves the actual file.
2. **JM Estate Workbench:** receives the file without copying the whole library.
3. **Codex:** runs the promotion tool, inspects the diff, tests the body, and records source gaps.
4. **Git:** preserves the exact change and rollback history.
5. **GitHub:** holds the owner-controlled source.
6. **Cloudflare Pages:** converts an approved repository path into a stable public route.
7. **JM3232 Navigator / Estate registries:** govern identity, route, lineage, Stringmarks, and receipts.

## Storage law

- Copy only the final HTML bytes once.
- Do not create duplicate archives, `node_modules`, build caches, or whole-repository clones for a single body.
- Hash before copying.
- If a byte-identical `index.html` already exists, return its current permanent route instead of creating another copy.
- Store only small JSON manifests and receipts beside or behind the body.
- Do not publish automatically.

## Promotion tool

Repository tool:

```text
tools/Promote-JMHtmlBody.ps1
```

It accepts either:

- a local `.html` file path; or
- an `https://` URL that returns the HTML bytes.

It deliberately rejects `content://` because that is an Android-local handle rather than a transferable web address.

### Example: non-game app

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Promote-JMHtmlBody.ps1 `
  -Source "C:\Users\theod\Downloads\MY_BODY.html" `
  -Slug "my-body" `
  -Office "apps" `
  -BodyName "My Body" `
  -Version "v0.1"
```

### Example: coding body

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Promote-JMHtmlBody.ps1 `
  -Source "C:\Users\theod\Downloads\VISUALANG.html" `
  -Slug "visualang" `
  -Office "coding-estate" `
  -BodyName "Visualang" `
  -Version "source-mounted"
```

## What the tool creates

For a body promoted to `apps/my-body/`:

```text
apps/my-body/index.html
apps/my-body/body-manifest.json
receipts/body-intake/my-body-YYYYMMDD-HHMMSS.json
```

The HTML is not duplicated into the receipt. The receipt contains only identity, route, bytes, hash, claim boundary, and next gate.

## What the tool does not do

It does **not**:

- commit;
- push;
- deploy;
- overwrite an existing body without an explicit switch;
- install Node, GitHub CLI, packages, or engines;
- copy the Documents folder;
- merge separate JM bodies;
- crown a body as live merely because a file exists.

## Approval and deployment gate

After staging, Codex must:

1. inspect `git diff`;
2. open the HTML locally;
3. test all visible controls;
4. validate the recorded SHA-256;
5. confirm the correct office and stable route;
6. ask for approval before committing or pushing;
7. verify the deployed file byte-for-byte after Cloudflare publishes it;
8. update the appropriate Estate registry only after the body and route are confirmed.

## Claim classes

```text
TEMPORARY
The file exists only in a chat preview, Android handle, or transient download.

STAGED
The exact HTML bytes are preserved locally in the repository worktree with a manifest and receipt.

COMMITTED
Git history preserves the body at an exact commit.

DEPLOYED
Cloudflare returns the body at a stable JM-owned URL.

REGISTERED
The Estate and Navigator recognise its identity, office, source, route, and lineage.

PROVEN / DING
Declared gates passed with evidence. A deployed page alone is not a Ding.
```

## Default permanent route pattern

```text
https://jmisjustme-estate.pages.dev/<office>/<slug>/
```

Examples:

```text
https://jmisjustme-estate.pages.dev/apps/<slug>/
https://jmisjustme-estate.pages.dev/theory/<slug>/
https://jmisjustme-estate.pages.dev/games-beyond/<slug>/
https://jmisjustme-estate.pages.dev/coding-estate/<slug>/
https://jmisjustme-estate.pages.dev/recovery/<slug>/
```

## Operating law

> The browser may retrieve the body.  
> The Workbench may hold the body.  
> Git may remember the body.  
> Cloudflare may deliver the body.  
> JM governance decides what the body is.

This pipeline exists to ensure that no finished HTML is left living only behind a temporary Android or chat link again.
