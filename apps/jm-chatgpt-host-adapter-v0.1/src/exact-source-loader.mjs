import fs from "node:fs";
import crypto from "node:crypto";

export const EXACT_SOURCE_ENV = "JM_EXACT_BODY_B64";

export function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function loadExactSource({
  filePath,
  expectedSha256,
  env = process.env,
  envKey = EXACT_SOURCE_ENV,
}) {
  let bytes;
  let intake;

  if (env?.[envKey]) {
    bytes = Buffer.from(env[envKey], "base64");
    intake = "PRIVATE_ENV_BASE64";
  } else {
    bytes = fs.readFileSync(filePath);
    intake = "LOCAL_PACKAGE_FILE";
  }

  const observedSha256 = sha256Bytes(bytes);
  if (observedSha256 !== expectedSha256) {
    const error = new Error(
      `Exact source rejected: SHA-256 ${observedSha256} != ${expectedSha256}`,
    );
    error.code = "JM_EXACT_SOURCE_IDENTITY_MISMATCH";
    error.observedSha256 = observedSha256;
    error.expectedSha256 = expectedSha256;
    throw error;
  }

  return Object.freeze({
    text: bytes.toString("utf8"),
    observedSha256,
    intake,
    mutationAllowed: false,
    hostRole: "CARRIER_NOT_SOURCE_AUTHORITY",
  });
}
