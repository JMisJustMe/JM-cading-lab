package com.jmisjustme.filegrabbervisualang;

import java.io.File;
import java.io.FileInputStream;
import java.net.URI;
import java.security.MessageDigest;
import java.util.Locale;

/** Platform-free contract for the native vault: compiled and tested with standard Java. */
public final class NativeVaultTruth {
    private NativeVaultTruth() { }
    public static boolean isAppUrl(String text) {
        try {
            URI u = new URI(text);
            return "https".equals(u.getScheme()) && "jm.app".equals(u.getHost()) && u.getPort() == -1
                && u.getRawUserInfo() == null && u.getRawQuery() == null && u.getRawFragment() == null
                && ("/index.html".equals(u.getRawPath()) || "/".equals(u.getRawPath()));
        } catch (Exception e) { return false; }
    }
    public static boolean isVaultUrl(String text) {
        try {
            URI u = new URI(text);
            return "https".equals(u.getScheme()) && "jm.vault".equals(u.getHost()) && u.getPort() == -1
                && u.getRawUserInfo() == null && u.getRawQuery() == null && u.getRawFragment() == null
                && u.getRawPath() != null && u.getRawPath().matches("/body/[0-9a-f]{64}");
        } catch (Exception e) { return false; }
    }
    public static boolean verify(File dir, String stored, String sha, long size) {
        try {
            if (stored == null || !stored.matches("[0-9a-f]{64}_[A-Za-z0-9._-]{1,190}")) return false;
            if (sha == null || !sha.matches("[0-9a-f]{64}") || !stored.startsWith(sha+"_")) return false;
            if (size < 0) return false;
            File target = new File(dir, stored);
            if (!target.getCanonicalFile().getParentFile().equals(dir.getCanonicalFile())) return false;
            if (!target.isFile() || target.length() != size) return false;
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (FileInputStream input = new FileInputStream(target)) {
                byte[] buf = new byte[65536]; int n;
                while ((n=input.read(buf))!=-1) md.update(buf,0,n);
            }
            StringBuilder hex = new StringBuilder();
            for (byte b:md.digest()) hex.append(String.format(Locale.ROOT, "%02x", b));
            return sha.equals(hex.toString());
        } catch (Exception e) { return false; }
    }
}