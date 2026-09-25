package com.jmisjustme.glyphboard;

public final class GlyphEntry {
    public final String id;
    public final String kind;
    public final String category;
    public final String label;
    public final String visual;
    public final String glyph;
    public final String fallback;
    public final String action;
    public final String permission;
    public final String semanticValue;

    public GlyphEntry(String id, String kind, String category, String label,
                      String visual, String glyph, String fallback,
                      String action, String permission, String semanticValue) {
        this.id = id;
        this.kind = kind;
        this.category = category;
        this.label = label;
        this.visual = visual;
        this.glyph = glyph;
        this.fallback = fallback;
        this.action = action;
        this.permission = permission;
        this.semanticValue = semanticValue;
    }

    public String face(String mode) {
        if ("GLYPH".equals(mode)) return glyph != null ? glyph : fallback;
        if ("FALLBACK".equals(mode)) return fallback;
        if ("INSERT_TEXT".equals(action)) return semanticValue;
        return visual != null ? visual : fallback;
    }

    public boolean confirmationRequired() {
        return "semantic.confirm".equals(permission);
    }
}
