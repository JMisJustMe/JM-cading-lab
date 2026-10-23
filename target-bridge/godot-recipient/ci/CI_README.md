# Unattended Godot QA — recipe, not a run receipt

`github-actions-headless.yml` is ready to be installed as repository `.github/workflows/jm-target-bridge-godot.yml` when this candidate is published at `target-bridge/godot-recipient/`. It is not executed by merely including it in the ZIP.

It runs the registered-source offline tests, obtains a Godot 4.7.2 Linux editor, imports the project, then executes real GDScript actions in a headless engine. This is host-runtime verification of the **bounded nine-semantic slice** in Linux, not proof of Android touch gestures or graphical parity. Only actual successful CI logs are evidence of execution.

Never promote a placeholder or pending CI check to PASS.
