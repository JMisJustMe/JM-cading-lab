package com.jmisjustme.livingestate;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class CarrierPolicyTest {
    @Test public void acceptsOrdinaryArchivePaths() {
        assertTrue(CarrierPolicy.isSafeArchiveName("index.html"));
        assertTrue(CarrierPolicy.isSafeArchiveName("assets/app.js"));
        assertTrue(CarrierPolicy.isSafeArchiveName("assets/dir..name/app.js"));
    }

    @Test public void blocksArchiveTraversalAndAbsolutePaths() {
        assertFalse(CarrierPolicy.isSafeArchiveName("../escape"));
        assertFalse(CarrierPolicy.isSafeArchiveName("assets/../../escape"));
        assertFalse(CarrierPolicy.isSafeArchiveName("assets\\..\\escape"));
        assertFalse(CarrierPolicy.isSafeArchiveName("/absolute"));
        assertFalse(CarrierPolicy.isSafeArchiveName(""));
    }

    @Test public void allowsOnlyIntentionalExternalSchemes() {
        assertTrue(CarrierPolicy.isAllowedExternalScheme("HTTPS"));
        assertTrue(CarrierPolicy.isAllowedExternalScheme("mailto"));
        assertTrue(CarrierPolicy.isAllowedExternalScheme("tel"));
        assertFalse(CarrierPolicy.isAllowedExternalScheme("file"));
        assertFalse(CarrierPolicy.isAllowedExternalScheme("content"));
        assertFalse(CarrierPolicy.isAllowedExternalScheme("javascript"));
        assertFalse(CarrierPolicy.isAllowedExternalScheme(null));
    }
}

