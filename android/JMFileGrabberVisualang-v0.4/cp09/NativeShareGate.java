package com.jmisjustme.filegrabbervisualang;

import java.net.URI;
import java.util.Locale;

/** Pure Java validation for share ingress before Android ContentResolver contact. */
public final class NativeShareGate {
    private NativeShareGate() { }
    public static boolean shareAction(String action) {
        return "android.intent.action.SEND".equals(action)
            || "android.intent.action.SEND_MULTIPLE".equals(action);
    }
    public static boolean acceptedUri(String raw) {
        if (raw == null || raw.length() < 11 || raw.length() > 8192) return false;
        for (int i = 0; i < raw.length(); i++) if (Character.isISOControl(raw.charAt(i))) return false;
        try {
            URI uri = new URI(raw);
            return "content".equals(uri.getScheme()) && uri.getRawAuthority() != null
                && !uri.getRawAuthority().isEmpty() && uri.getRawUserInfo() == null
                && uri.getRawFragment() == null && uri.getRawPath() != null
                && uri.getRawPath().length() > 1;
        } catch (Exception ex) { return false; }
    }
}
