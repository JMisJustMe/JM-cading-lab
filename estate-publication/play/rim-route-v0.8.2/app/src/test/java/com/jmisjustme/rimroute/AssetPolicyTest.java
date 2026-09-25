package com.jmisjustme.rimroute;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import org.junit.Test;

public final class AssetPolicyTest {
    @Test public void safeLocalAssetPathsOnly() {
        assertTrue(AssetPolicy.isSafeAssetPath("index.html"));
        assertTrue(AssetPolicy.isSafeAssetPath("assets/game.js"));
        assertFalse(AssetPolicy.isSafeAssetPath("../escape"));
        assertFalse(AssetPolicy.isSafeAssetPath("assets/../../escape"));
        assertFalse(AssetPolicy.isSafeAssetPath("/absolute"));
    }

    @Test public void externalSchemesAreBounded() {
        assertTrue(AssetPolicy.isAllowedExternalScheme("https"));
        assertTrue(AssetPolicy.isAllowedExternalScheme("mailto"));
        assertFalse(AssetPolicy.isAllowedExternalScheme("file"));
        assertFalse(AssetPolicy.isAllowedExternalScheme("javascript"));
    }
}
