package com.jmisjustme.glyphboard;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public final class TraceStore {
    private static final String PREF = "jm_glyphboard_state";
    private static final String TRACE = "trace_log";
    private static final String RECENT = "recent_ids";
    private static final String FAVS = "favourite_ids";
    private static final String FACE = "face_mode";

    private TraceStore() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public static String getFace(Context c) {
        return prefs(c).getString(FACE, "VISUAL");
    }

    public static void setFace(Context c, String face) {
        prefs(c).edit().putString(FACE, face).apply();
    }

    public static void record(Context c, GlyphEntry e, String status, String output) {
        String time = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.UK).format(new Date());
        String line = time + " | " + status + " | " + e.id + " | " + e.action + " | " + e.permission + " | " + compact(output);
        String old = prefs(c).getString(TRACE, "");
        List<String> lines = new ArrayList<>();
        if (!old.isEmpty()) lines.addAll(java.util.Arrays.asList(old.split("\\n")));
        lines.add(line);
        if (lines.size() > 40) lines = lines.subList(lines.size() - 40, lines.size());
        prefs(c).edit().putString(TRACE, join(lines)).apply();
    }

    public static String trace(Context c) { return prefs(c).getString(TRACE, "No trace yet."); }

    public static void remember(Context c, String id) {
        List<String> ids = csv(prefs(c).getString(RECENT, ""));
        ids.remove(id);
        ids.add(0, id);
        if (ids.size() > 16) ids = ids.subList(0, 16);
        prefs(c).edit().putString(RECENT, joinCsv(ids)).apply();
    }

    public static List<String> recent(Context c) { return csv(prefs(c).getString(RECENT, "")); }

    public static boolean isFavourite(Context c, String id) {
        return csv(prefs(c).getString(FAVS, "")).contains(id);
    }

    public static boolean toggleFavourite(Context c, String id) {
        List<String> ids = csv(prefs(c).getString(FAVS, ""));
        boolean now;
        if (ids.contains(id)) { ids.remove(id); now = false; }
        else { ids.add(id); now = true; }
        prefs(c).edit().putString(FAVS, joinCsv(ids)).apply();
        return now;
    }

    public static List<String> favourites(Context c) { return csv(prefs(c).getString(FAVS, "")); }

    private static List<String> csv(String value) {
        List<String> out = new ArrayList<>();
        if (value == null || value.trim().isEmpty()) return out;
        for (String s : value.split(",")) if (!s.trim().isEmpty()) out.add(s.trim());
        return out;
    }

    private static String joinCsv(List<String> xs) { return String.join(",", xs); }
    private static String join(List<String> xs) { return String.join("\n", xs); }
    private static String compact(String s) {
        if (s == null) return "";
        String x = s.replace("\n", "↵").replace("\r", "");
        return x.length() > 90 ? x.substring(0, 90) + "…" : x;
    }
}
