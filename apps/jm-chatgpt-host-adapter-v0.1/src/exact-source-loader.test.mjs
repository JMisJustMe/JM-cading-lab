import assert from "node:assert/strict";
import { loadExactSource } from "./exact-source-loader.mjs";

const expectedSha256 = "7391dd5bc1c4ff1565d70b69354cfdd79a121f8e6f6a1d671d75b57d463ee7ea";
const fake = Buffer.from("MARKED_FIXTURE_NOT_SOURCE_AUTHORITY", "utf8").toString("base64");

assert.throws(
  () => loadExactSource({
    filePath: "/definitely/not/used",
    expectedSha256,
    env: { JM_EXACT_BODY_B64: fake },
  }),
  (error) => error?.code === "JM_EXACT_SOURCE_IDENTITY_MISMATCH",
  "private intake must reject any bytes that do not match the frozen source SHA",
);

console.log("exact-source-loader: mismatch rejection PASS");
