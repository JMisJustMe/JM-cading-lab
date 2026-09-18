#!/usr/bin/env node
/**
 * JM Cloud Contact Server — Secondary-Purpose Custody Probe v0.1
 *
 * Purpose:
 * Prove a minimum-sufficient recovery state can be placed in an existing
 * JM Cloud Contact Server space's metadata, persisted by the server's
 * existing atomic database write, returned through the authenticated API,
 * and verified locally without creating a new storage subsystem.
 *
 * Required env:
 *   JM_CLOUD_ORIGIN       e.g. https://jm-cloud-contact-server-v05.onrender.com
 *   JM_CLOUD_ADMIN_TOKEN  existing owner admin token
 *
 * No secrets are written to disk or printed.
 */

import crypto from "node:crypto";

const ORIGIN = String(process.env.JM_CLOUD_ORIGIN || "").replace(/\/$/, "");
const ADMIN = String(process.env.JM_CLOUD_ADMIN_TOKEN || "");
if (!ORIGIN || !ADMIN) {
  console.error("JM_CLOUD_ORIGIN and JM_CLOUD_ADMIN_TOKEN are required");
  process.exit(2);
}

const CONTROL = {
  schema: "jm.secondary-custody.probe/0.1",
  date: "2026-09-18",
  body: "JM SECONDARY-PURPOSE CUSTODY RAIL PROBE",
  authority: "non-canonical access/recovery rail",
  law: "MINIMUM SUFFICIENT CARRIAGE",
};

const canonical = v =>
  v === null || typeof v !== "object"
    ? JSON.stringify(v)
    : Array.isArray(v)
      ? "[" + v.map(canonical).join(",") + "]"
      : "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";

const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");
const expected = sha256(canonical(CONTROL));
const spaceId = "custody_" + expected.slice(0, 16);

async function request(path, options = {}) {
  const res = await fetch(ORIGIN + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + ADMIN,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(data)}`);
  return data;
}

let created = false;
try {
  await request("/v4/spaces", {
    method: "POST",
    body: JSON.stringify({
      spaceId,
      label: "JM Secondary Custody Probe",
      kind: "secondary-purpose-custody",
      metadata: {
        custodyProbe: CONTROL,
        custodyProbeSha256: expected,
      },
      members: [{
        id: "custody_probe",
        type: "probe",
        label: "Custody Probe",
        capabilities: ["event:write"],
      }],
    }),
  });
  created = true;
} catch (e) {
  if (!String(e.message).includes("existing spaceId")) throw e;
}

const returned = await request("/v4/spaces/" + encodeURIComponent(spaceId));
const meta = returned?.space?.metadata || {};
const actual = sha256(canonical(meta.custodyProbe));

const pass =
  meta.custodyProbeSha256 === expected &&
  actual === expected;

console.log(JSON.stringify({
  ok: pass,
  route: "JM CLOUD CONTACT SERVER metadata custody",
  spaceId,
  created,
  expectedSha256: expected,
  returnedSha256: actual,
  claim: pass
    ? "ACTIVE RETURN CUSTODY DING EARNED FOR THIS CONTROL OBJECT"
    : "NO DING — RETURN MISMATCH",
}, null, 2));

process.exit(pass ? 0 : 1);
