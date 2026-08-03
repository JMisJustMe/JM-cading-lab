#!/usr/bin/env python3
"""Run the sharded APK constructor through canonical Android factory v0.4."""
from __future__ import annotations

import android_gradle_batch as batch
import android_gradle_factory_v0_4 as canonical

# Rebind the preserved batch runner to the corrected canonical carrier factory.
batch.factory = canonical
batch.DONOR_COMPILE_SDK = canonical.COMPILE_SDK
batch.DONOR_TARGET_SDK = canonical.TARGET_SDK

build_shard = batch.build_shard
main = batch.main


if __name__ == "__main__":
    raise SystemExit(main())
