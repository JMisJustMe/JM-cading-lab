package com.jmisjustme.glyphboard;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class GlyphRegistry {
    public static final String PROTOCOL = "JM.GlyphRegistry/0.2";
    public static final String SEMANTIC_PROTOCOL = "JM.SemanticOps/0.1";
    public static final String TARGET_PROTOCOL = "JM.TargetBridge/0.1";
    public static final String CONTACT_PROTOCOL = "JM.CapabilityContact/0.4";

    private static final List<GlyphEntry> ENTRIES = Collections.unmodifiableList(Arrays.asList(
        new GlyphEntry("not_equal", "text", "symbols", "Not equal", "≠", null, "!=", "INSERT_TEXT", "text.write", "≠"),
        new GlyphEntry("route_right", "text", "symbols", "Route right", "→", null, "->", "INSERT_TEXT", "text.write", "→"),
        new GlyphEntry("contact_pair", "text", "symbols", "Contact pair", "↔", null, "<->", "INSERT_TEXT", "text.write", "↔"),
        new GlyphEntry("delta", "text", "symbols", "State change", "Δ", null, "DELTA", "INSERT_TEXT", "text.write", "Δ"),
        new GlyphEntry("infinity", "text", "symbols", "Infinity", "∞", null, "INFINITY", "INSERT_TEXT", "text.write", "∞"),
        new GlyphEntry("therefore", "text", "symbols", "Therefore", "∴", null, "THEREFORE", "INSERT_TEXT", "text.write", "∴"),

        new GlyphEntry("jm_contact_state", "private_glyph", "glyphs", "Contact changed state", "◈→Δ", "\uE001", "CONTACT → ΔSTATE", "CONTACT_STATE_CHANGE", "semantic.local", "{delta:1}"),
        new GlyphEntry("jm_ding", "private_glyph", "glyphs", "Ding earned", "◉🔔", "\uE002", "DING", "DING_MARK", "semantic.local", "{earned:true}"),
        new GlyphEntry("jm_recover", "private_glyph", "glyphs", "Recover", "↶□", "\uE003", "RECOVER", "RECOVER", "semantic.local", "{mode:preserve_state}"),

        new GlyphEntry("source_signal_contact", "expression", "routes", "Source to contact", "S→Σ→C", null, "SOURCE → SIGNAL → CONTACT", "INSERT_TEXT", "text.write", "SOURCE → SIGNAL → CONTACT"),
        new GlyphEntry("full_route", "expression", "routes", "JM route spine", "JM ROUTE", null, "SOURCE → SIGNAL → CONTACT FIELD → ROUTE PRESSURE → STATE CHANGE → DING → TRACE → RECOVERY → OUTPUT", "INSERT_TEXT", "text.write", "SOURCE → SIGNAL → CONTACT FIELD → ROUTE PRESSURE → STATE CHANGE → DING → TRACE → RECOVERY → OUTPUT"),

        new GlyphEntry("flaz", "expression", "expressions", "FLAZ", "FLAZ", null, "FLAZ", "INSERT_TEXT", "text.write", "FLAZ"),
        new GlyphEntry("no_ding_no_claim", "expression", "expressions", "No Ding, no claim", "🔔≠?", null, "NO DING, NO CLAIM", "INSERT_TEXT", "text.write", "NO DING, NO CLAIM"),
        new GlyphEntry("recover_before_rebuild", "expression", "expressions", "Recover before rebuild", "↶⚙", null, "RECOVER BEFORE REBUILD", "INSERT_TEXT", "text.write", "RECOVER BEFORE REBUILD"),

        new GlyphEntry("create_body", "command", "commands", "Create body", "+BODY", null, "CREATE BODY", "CREATE_BODY", "semantic.confirm", "{template:default}"),
        new GlyphEntry("run_body", "command", "commands", "Run", "▶ RUN", null, "RUN", "RUN_BODY", "semantic.confirm", "{target:active}"),
        new GlyphEntry("trace_body", "command", "commands", "Trace", "⌁ TRACE", null, "TRACE", "TRACE_BODY", "semantic.local", "{scope:active}")
    ));

    private GlyphRegistry() {}

    public static List<GlyphEntry> all() { return ENTRIES; }

    public static List<GlyphEntry> byCategory(String category) {
        List<GlyphEntry> out = new ArrayList<>();
        for (GlyphEntry e : ENTRIES) if (category.equals(e.category)) out.add(e);
        return out;
    }

    public static GlyphEntry byId(String id) {
        for (GlyphEntry e : ENTRIES) if (e.id.equals(id)) return e;
        return null;
    }
}
