import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const bodyPath = process.env.JM_BODY_PATH || path.join(root, "body", "00_OPEN_FIRST_UNTITLED_FIELD_BRANCH_v0_9_FROZEN.html");
const html = fs.readFileSync(bodyPath, "utf8");
const sha = crypto.createHash("sha256").update(Buffer.from(html, "utf8")).digest("hex");
const expected = "7391dd5bc1c4ff1565d70b69354cfdd79a121f8e6f6a1d671d75b57d463ee7ea";
const checks = {
  frozenBodyHash: sha === expected,
  playableIrV03: html.includes('"schema": "jm.gamecore.playable-ir/v0.3"'),
  oneBodyAbiV01: html.includes('"schema": "jm.onebody-abi/v0.1"'),
  mergeForbidden: html.includes('"merge_forbidden": true'),
  carrierNotAuthority: html.includes("CARRIER_NOT_SOURCE_AUTHORITY"),
  traceBox: html.includes("TraceBox"),
};
const pass = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ pass, sha256: sha, checks }, null, 2));
if (!pass) process.exit(1);
