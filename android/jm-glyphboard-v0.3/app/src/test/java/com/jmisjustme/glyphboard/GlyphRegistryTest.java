package com.jmisjustme.glyphboard;

import org.junit.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.Assert.*;

public class GlyphRegistryTest {
    @Test public void registryHasRecoveredSeventeenUniqueEntries() {
        assertEquals(17, GlyphRegistry.all().size());
        Set<String> ids = new HashSet<>();
        for (GlyphEntry e : GlyphRegistry.all()) assertTrue("duplicate " + e.id, ids.add(e.id));
    }

    @Test public void fiveOriginalCategoriesRemainPresent() {
        Set<String> categories = new HashSet<>();
        for (GlyphEntry e : GlyphRegistry.all()) categories.add(e.category);
        assertTrue(categories.contains("symbols"));
        assertTrue(categories.contains("glyphs"));
        assertTrue(categories.contains("routes"));
        assertTrue(categories.contains("expressions"));
        assertTrue(categories.contains("commands"));
        assertEquals(5, categories.size());
    }

    @Test public void confirmationCommandsStayGated() {
        assertTrue(GlyphRegistry.byId("create_body").confirmationRequired());
        assertTrue(GlyphRegistry.byId("run_body").confirmationRequired());
        assertFalse(GlyphRegistry.byId("trace_body").confirmationRequired());
    }

    @Test public void protocolLineageIsPreserved() {
        assertEquals("JM.GlyphRegistry/0.2", GlyphRegistry.PROTOCOL);
        assertEquals("JM.SemanticOps/0.1", GlyphRegistry.SEMANTIC_PROTOCOL);
        assertEquals("JM.TargetBridge/0.1", GlyphRegistry.TARGET_PROTOCOL);
        assertEquals("JM.CapabilityContact/0.4", GlyphRegistry.CONTACT_PROTOCOL);
    }
}
