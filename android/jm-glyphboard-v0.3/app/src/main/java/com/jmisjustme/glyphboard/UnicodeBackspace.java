package com.jmisjustme.glyphboard;

/** API-23-safe UTF-16 fallback for deleting one Unicode code point. */
final class UnicodeBackspace {
    private UnicodeBackspace() {}

    static int codeUnitsBeforeCursor(CharSequence before) {
        if (before != null && before.length() >= 2
                && Character.isHighSurrogate(before.charAt(before.length() - 2))
                && Character.isLowSurrogate(before.charAt(before.length() - 1))) {
            return 2;
        }
        return 1;
    }
}
