# JM Estate Sovereign Integration v1 — Inheritance Repair Receipt

The first integration applicator replaced the Stringline version label with `v0.1.9 sovereign integration seed`. That was an integration-layer regression because the existing Estate classification gate requires the inherited `v0.1.8 QUADZE v4 authority reconciliation` authority phrase.

The integration descendant now preserves the existing QUADZE v4 authority label and appends Estate Sovereign Integration v1 as an additive state. The integration rail also runs the existing whole-Estate classification verifier before committing applied descendant bytes.

Because Stringline participates in the repository-wide Source Ledger → Latest Body Finder → Source-Body Auditor → Current Best Register → Crown Register → Living Register governance chain, the integration rail now regenerates and verifies the dependent source-to-living register and receipt after changing Stringline. This closes the stale-derived-output failure exposed by the existing Estate gate rather than bypassing that gate.

Boundary: this receipt does not rewrite the frozen QUADZE ancestor and does not claim live deployment. It records forward corrections inside PR #190 only.
