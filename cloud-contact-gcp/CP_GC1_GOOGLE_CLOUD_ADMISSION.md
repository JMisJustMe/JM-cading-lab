# JM ECOSTATE CP-GC1.1 — Google Cloud admission / first live contact

**Date:** 2026-10-28  
**Status:** read-only preparation, **NO GOOGLE CLOUD DEPLOYMENT CLAIM**.  
**Sovereign donor:** `functions/api/estate-contact.js` (unchanged); candidate PR #543.  
**Goal:** admit the existing fixed JM relay to Cloud Run *only when* owner project, IAM, billing and provider proof all pass. No new JM backend or fresh Estate front door.

## Admission 0 — authenticated console, observe before mutation

Use authenticated **Google Cloud Console → Cloud Shell**, not public chat or a shared token. Select the existing intended Google Cloud project explicitly; historical project IDs and October billing screenshots are NOT current access evidence. Do not create a new project automatically.

The following commands only **read** project, billing, existing services and existing registries. Replace placeholders locally; do not paste resulting private account data into GitHub.

```bash
set -euo pipefail
PROJECT_ID="REPLACE_WITH_OBSERVED_EXISTING_PROJECT_ID"
REGION="europe-west2"
case "$PROJECT_ID" in REPLACE_*|"" ) echo "PROJECT_NOT_SELECTED"; exit 2;; esac
gcloud projects describe "$PROJECT_ID" --format="table(projectId,name,lifecycleState)"
gcloud billing projects describe "$PROJECT_ID" --format="table(projectId,billingEnabled,billingAccountName)"
gcloud services list --enabled --project="$PROJECT_ID" --format="value(config.name)" | grep -E '^(run|cloudbuild|artifactregistry)\.googleapis\.com$' || true
gcloud run services list --project="$PROJECT_ID" --region="$REGION" --format="table(metadata.name,status.url)"
gcloud artifacts repositories list --project="$PROJECT_ID" --location="$REGION"
```

**HOLD unless:** project identity and permission are verified; billing/credits current and understood; applicable budgets and service cap restrictions reviewed; hosting region accepted; existing Cloud Run services and Artifact Registry repositories inspected; the service is approved as a distinct candidate, NOT a production replacement. Project access ≠ invoice authorisation. Standard budget alerts are not hard cost stops. Never print service-account keys, bearer credentials or tokens.

## Admission 1 — deterministic original-source build, NO automatic buildpack selection

**Critical build-context correction:** the Dockerfile lives at `cloud-contact-gcp/Dockerfile`, but it needs `functions/api/estate-contact.js` from the **repository root**. A naïve `gcloud run deploy --source .` without a root Dockerfile is **not** the proven Docker path and may package the wrong files. Explicitly build using the inherited root context:

```bash
# From a clean checkout of the approved CP-GC1 PR head:
git rev-parse HEAD
test -f functions/api/estate-contact.js
test -f cloud-contact-gcp/entrypoint.mjs
docker build -f cloud-contact-gcp/Dockerfile -t jm-gc1-checked:local .
docker run --rm -d --name jm-gc1-check -p 127.0.0.1:18080:8080 \
  -e JM_PUBLIC_ORIGIN=https://fixture.invalid jm-gc1-checked:local
curl -sS -o /dev/null -w '%{http_code}\n' \
  'http://127.0.0.1:18080/api/estate-contact?route=/not-allowed'
docker rm -f jm-gc1-check
# Explicitly assert the expected refusal (400 is success for this NEGATIVE test).
```

Expected refusal: HTTP **400** for the forbidden route. This container check makes **no real provider request**. Local Docker admission is not Cloud Run proof.

## Admission 2 — **mutating, chargeable** build and deployment: explicit owner permission

Do **not** run this section merely because the previous checks pass. Cloud Build, Artifact Registry, Cloud Run and egress may incur charges. Use an inspected existing Artifact Registry repository when suitable. Obtain approved project, region, registry and a dedicated least-privilege runtime service account; do not use a broad production identity by default.

After project/cost consent, the implementation route is:
1. Tag the **exact same tested** root-built image for an inspected Artifact Registry path.
2. Configure Docker auth to that regional registry, push the image, and independently read back its digest. No `latest` or silent reuse of an old tag.
3. Deploy a distinct `jm-gc1-candidate` service with `--image` (never `--source`), `--no-allow-unauthenticated`, `--min-instances=0`, `--max-instances=1`, a dedicated least-privilege `--service-account`, and no production route takeover. Keep `JM_PUBLIC_ORIGIN` absent on first deploy; the application intentionally answers 503.
4. Read the actual Cloud Run service URL, then explicitly set `JM_PUBLIC_ORIGIN` to that exact HTTPS origin on the candidate only. Check the resulting service revision and IAM state.
5. Use `gcloud run services proxy jm-gc1-candidate --region="$REGION" --project="$PROJECT_ID"` under an authorised identity to test read-only `/api/estate-contact?route=/ready`; capture the real status, target and response digest. An authentic private Cloud Run invocation is a separate Ding from a successful Render upstream response.
6. Only with owner-approved scoped JM credentials: test one synthetic workspace save, exact revision/receipt/key verification, cold rejoin, tamper refusal and independent readback from the existing canonical JM Cloud Contact recipient. Never transfer secrets to public source, logs or chat.
7. Only after source/provider proof, evaluate physical Fold↔laptop owner contact, zero/idle charges, cold rebuild and backend replacement durability. Do not transfer proof across roles.

**Safe fail-closed states:** project not selected, billing unresolved, registry absent, permissions missing, unknown service account, invalid public origin, Cloud Run IAM not private, changes or evidence unavailable → **HOLD**, no deployment.

## Non-regression and evidence
- Protected original Estate relay, v0.5 JM Cloud Contact, CP-C17 owner-laptop, CP04 ten-body native network lines and public Estate front door remain separate and unmodified.
- PR #543 remains draft until tests and owner promotion.
- CI Docker boot and synthetic HTTP proof **do not imply** Google service creation, deployed ingress, live Render persistence or owner Fold proof.
- If any previously recorded state differs in live account, fresh account evidence wins over old screenshots.

**KEEPER:** MESH ≠ MERGE · RECOVER BEFORE REBUILD · NO DING NO CLAIM · LIVE CONTACT ≠ STATIC HOST CI.
