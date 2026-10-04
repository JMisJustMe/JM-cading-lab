# JM Android / Phone Sovereign Agent Adapter v0.1

Thin Android carrier over the existing sovereign runtime.

The build pipeline generates a deterministic `JM.AgentRuntimeSession/0.1` capsule from the portable Python runtime, copies the canonical runtime contract into Android assets, and compiles a debug APK that reads those carriers locally with no INTERNET permission.

Current proof boundary: **TRANSPORT**.

A compiled APK proves that Android can carry the exact core/session contract into an installable package. It does **not** prove Android runtime contact, installation, owner-device use, or acceptance.

> **APK BUILT ≠ APK LIVED.**
