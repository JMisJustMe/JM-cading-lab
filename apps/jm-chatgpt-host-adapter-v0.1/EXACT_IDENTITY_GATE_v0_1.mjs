import crypto from "node:crypto";

export const EXACT_BODY = Object.freeze({
  bodyId: "jm.untitled-field-branch/v0.9",
  requiredFilename: "00_OPEN_FIRST_UNTITLED_FIELD_BRANCH_v0_9_FROZEN.html",
  sourceSha256: "7391dd5bc1c4ff1565d70b69354cfdd79a121f8e6f6a1d671d75b57d463ee7ea",
  playableIr: "jm.gamecore.playable-ir/v0.3",
  oneBodyAbi: "jm.onebody-abi/v0.1",
  adapter: "JM ChatGPT Host Adapter v0.1.1",
  hostRole: "CARRIER_NOT_SOURCE_AUTHORITY",
  mutationAllowed: false,
});

export function sha256Utf8(text) {
  return crypto.createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}

export function verifyExactBody({ filename, sourceText, bodyId, playableIr, oneBodyAbi }) {
  const observedSha256 = sha256Utf8(sourceText);
  const checks = {
    filename: filename === EXACT_BODY.requiredFilename,
    sha256: observedSha256 === EXACT_BODY.sourceSha256,
    bodyId: bodyId === EXACT_BODY.bodyId,
    playableIr: playableIr === EXACT_BODY.playableIr,
    oneBodyAbi: oneBodyAbi === EXACT_BODY.oneBodyAbi,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    observedSha256,
  };
}

export function exactIdentityReceipt({
  verification,
  host,
  directContact = "NOT_RUN",
  visibleConsequence = "NOT_RUN",
  evidence = [],
  claimBoundary = "",
}) {
  const identityPreserved = verification?.pass ? "PASS" : "FAIL";
  let result = "CONTACT_NOT_PROVED";

  if (!verification?.pass) {
    result = "IDENTITY_MISMATCH";
  } else if (directContact === "PASS" && visibleConsequence === "PASS") {
    result = "EXACT_BODY_CROSS_HOST_DING_PROVED";
  }

  return {
    schema: "jm.universal-hosted-body/exact-identity-receipt/v0.1",
    bodyId: EXACT_BODY.bodyId,
    sourceSha256: EXACT_BODY.sourceSha256,
    observedSourceSha256: verification?.observedSha256 ?? null,
    playableIr: EXACT_BODY.playableIr,
    oneBodyAbi: EXACT_BODY.oneBodyAbi,
    host,
    adapter: EXACT_BODY.adapter,
    hostRole: EXACT_BODY.hostRole,
    directContact,
    visibleConsequence,
    identityPreserved,
    sourceMutation: "NONE",
    result,
    evidence,
    claimBoundary,
  };
}

export function assertProofMayBeCrowned(receipt) {
  if (receipt.result !== "EXACT_BODY_CROSS_HOST_DING_PROVED") {
    throw new Error(`No crown: ${receipt.result}`);
  }
  if (
    receipt.directContact !== "PASS" ||
    receipt.visibleConsequence !== "PASS" ||
    receipt.identityPreserved !== "PASS" ||
    receipt.sourceMutation !== "NONE"
  ) {
    throw new Error("No crown: proof invariants not satisfied");
  }
  return true;
}
