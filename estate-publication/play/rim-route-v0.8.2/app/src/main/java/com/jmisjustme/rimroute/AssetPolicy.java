package com.jmisjustme.rimroute;

import java.util.Locale;

final class AssetPolicy {
    private AssetPolicy() {}

    static boolean isSafeAssetPath(String value) {
        if (value == null || value.isEmpty()) return false;
        String path = value.replace('\\', '/');
        if (path.startsWith("/") || path.equals("..")) return false;
        for (String segment : path.split("/", -1)) if (segment.equals("..")) return false;
        return true;
    }

    static boolean isAllowedExternalScheme(String value) {
        if (value == null) return false;
        String scheme = value.toLowerCase(Locale.ROOT);
        return scheme.equals("https") || scheme.equals("http") || scheme.equals("mailto");
    }
}
