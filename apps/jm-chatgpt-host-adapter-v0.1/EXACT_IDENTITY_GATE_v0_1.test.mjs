import assert from "node:assert/strict";
import {
  EXACT_BODY,
  verifyExactBody,
  exactIdentityReceipt,
  assertProofMayBeCrowned,
} from "./EXACT_IDENTITY_GATE_v0_1.mjs";

const mismatch = verifyExactBody({
  filename: EXACT_BODY.requiredFilename,
  sourceText: "MARKED_FIXTURE_NOT_SOURCE_AUTHORITY",
  bodyId: EXACT_BODY.bodyId,
  playableIr: EXACT_BODY.playableIr,
  oneBodyAbi: EXACT_BODY.oneBodyAbi,
});

assert.equal(mismatch.pass, false, "marked fixture must never pass exact-source identity");
assert.equal(mismatch.checks.sha256, false);

const mismatchReceipt = exactIdentityReceipt({
  verification: mismatch,
  host: "test-host",
  directContact: "PASS",
  visibleConsequence: "PASS",
  evidence: ["synthetic negative conformance test"],
});

assert.equal(mismatchReceipt.result, "IDENTITY_MISMATCH");
assert.throws(() => assertProofMayBeCrowned(mismatchReceipt));

const simulatedVerifiedIdentity = {
  pass: true,
  checks: {
    filename: true,
    sha256: true,
    bodyId: true,
    playableIr: true,
    oneBodyAbi: true,
  },
  observedSha256: EXACT_BODY.sourceSha256,
};

const noContactReceipt = exactIdentityReceipt({
  verification: simulatedVerifiedIdentity,
  host: "test-host",
});
assert.equal(noContactReceipt.result, "CONTACT_NOT_PROVED");
assert.throws(() => assertProofMayBeCrowned(noContactReceipt));

const contactReceipt = exactIdentityReceipt({
  verification: simulatedVerifiedIdentity,
  host: "test-host",
  directContact: "PASS",
  visibleConsequence: "PASS",
});
assert.equal(contactReceipt.result, "EXACT_BODY_CROSS_HOST_DING_PROVED");
assert.equal(assertProofMayBeCrowned(contactReceipt), true);

console.log("EXACT_IDENTITY_GATE_v0_1: 3/3 PASS");
