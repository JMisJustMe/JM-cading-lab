package com.jmisjustme.livingestate;

import java.util.Locale;

final class CarrierPolicy {
    private CarrierPolicy() {}

    static boolean isSafeArchiveName(String value) {
        if (value == null || value.isEmpty()) return false;
        String name = value.replace('\\', '/');
        if (name.startsWith("/") || name.equals("..")) return false;
        for (String segment : name.split("/", -1)) {
            if (segment.equals("..")) return false;
        }
        return true;
    }

    static boolean isAllowedExternalScheme(String value) {
        if (value == null) return false;
        String scheme = value.toLowerCase(Locale.ROOT);
        return scheme.equals("https") || scheme.equals("http") || scheme.equals("mailto") || scheme.equals("tel");
    }
}

