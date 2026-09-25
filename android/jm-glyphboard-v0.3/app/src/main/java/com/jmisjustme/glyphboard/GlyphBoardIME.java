package com.jmisjustme.glyphboard;

import android.content.res.ColorStateList;
import android.graphics.Color;
import android.inputmethodservice.InputMethodService;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.InputConnection;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public final class GlyphBoardIME extends InputMethodService {
    private static final int BG = Color.rgb(11, 11, 15);
    private static final int CARD = Color.rgb(24, 24, 31);
    private static final int ACTIVE = Color.rgb(89, 54, 155);
    private static final int TEXT = Color.rgb(246, 246, 248);

    private LinearLayout root;
    private LinearLayout keyArea;
    private TextView status;
    private String category = "symbols";
    private String faceMode;

    @Override
    public View onCreateInputView() {
        faceMode = TraceStore.getFace(this);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(6), dp(6), dp(6), dp(6));
        root.setBackgroundColor(BG);

        status = new TextView(this);
        status.setTextColor(TEXT);
        status.setTextSize(12f);
        status.setPadding(dp(8), dp(4), dp(8), dp(6));
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));

        root.addView(makeTabs(), new LinearLayout.LayoutParams(-1, -2));

        ScrollView scroll = new ScrollView(this);
        keyArea = new LinearLayout(this);
        keyArea.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(keyArea, new ScrollView.LayoutParams(-1, -2));
        root.addView(scroll, new LinearLayout.LayoutParams(-1, dp(245)));

        root.addView(makeUtilityRow(), new LinearLayout.LayoutParams(-1, -2));
        renderKeys();
        return root;
    }

    private View makeTabs() {
        HorizontalScrollView hsv = new HorizontalScrollView(this);
        hsv.setHorizontalScrollBarEnabled(false);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        String[][] tabs = {
            {"symbols", "SYMBOLS"}, {"glyphs", "JM"}, {"routes", "ROUTES"},
            {"expressions", "EXPRESS"}, {"commands", "COMMANDS"},
            {"favs", "★ FAVS"}, {"recent", "↺ RECENT"}
        };
        for (String[] t : tabs) {
            Button b = smallButton(t[1]);
            b.setOnClickListener(v -> { category = t[0]; renderKeys(); });
            row.addView(b);
        }
        hsv.addView(row);
        return hsv;
    }

    private View makeUtilityRow() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(0, dp(5), 0, 0);

        Button face = smallButton("FACE " + faceShort());
        face.setOnClickListener(v -> {
            faceMode = nextFace(faceMode);
            TraceStore.setFace(this, faceMode);
            face.setText("FACE " + faceShort());
            renderKeys();
        });
        addWeighted(row, face, 1.2f);

        Button globe = smallButton("🌐");
        globe.setOnClickListener(v -> switchToNextInputMethod(false));
        addWeighted(row, globe, 0.7f);

        Button back = smallButton("⌫");
        back.setOnClickListener(v -> {
            InputConnection ic = getCurrentInputConnection();
            if (ic != null) ic.deleteSurroundingText(1, 0);
        });
        addWeighted(row, back, 0.7f);

        Button space = smallButton("SPACE");
        space.setOnClickListener(v -> commitRaw(" "));
        addWeighted(row, space, 1.8f);

        Button enter = smallButton("↵");
        enter.setOnClickListener(v -> sendEnter());
        addWeighted(row, enter, 0.7f);

        Button hide = smallButton("⌄");
        hide.setOnClickListener(v -> requestHideSelf(0));
        addWeighted(row, hide, 0.7f);
        return row;
    }

    private void renderKeys() {
        if (keyArea == null) return;
        keyArea.removeAllViews();
        List<GlyphEntry> entries = currentEntries();
        status.setText("JM GLYPHBOARD · " + category.toUpperCase() + " · " + faceMode + " · " + entries.size() + " keys");

        for (int i = 0; i < entries.size(); i += 4) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            for (int j = 0; j < 4; j++) {
                int ix = i + j;
                if (ix < entries.size()) {
                    GlyphEntry e = entries.get(ix);
                    Button b = keyButton(display(e));
                    if (TraceStore.isFavourite(this, e.id)) b.setText("★ " + display(e));
                    b.setContentDescription(e.label + ". " + e.fallback);
                    b.setOnClickListener(v -> activate(e));
                    b.setOnLongClickListener(v -> onLongPress(e));
                    addWeighted(row, b, 1f);
                } else {
                    View spacer = new View(this);
                    addWeighted(row, spacer, 1f);
                }
            }
            keyArea.addView(row, new LinearLayout.LayoutParams(-1, -2));
        }
    }

    private List<GlyphEntry> currentEntries() {
        if ("favs".equals(category)) return idsToEntries(TraceStore.favourites(this));
        if ("recent".equals(category)) return idsToEntries(TraceStore.recent(this));
        return GlyphRegistry.byCategory(category);
    }

    private List<GlyphEntry> idsToEntries(List<String> ids) {
        List<GlyphEntry> out = new ArrayList<>();
        for (String id : ids) {
            GlyphEntry e = GlyphRegistry.byId(id);
            if (e != null) out.add(e);
        }
        return out;
    }

    private void activate(GlyphEntry e) {
        TraceStore.remember(this, e.id);
        if (e.confirmationRequired()) {
            TraceStore.record(this, e, "HOLD_CONFIRMATION", "No effect emitted");
            Toast.makeText(this, e.label + ": confirmation-gated. Long-press inserts inert fallback text only.", Toast.LENGTH_SHORT).show();
            renderKeys();
            return;
        }

        String output = e.face(faceMode);
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) {
            TraceStore.record(this, e, "HOLD_NO_INPUT_CONNECTION", output);
            Toast.makeText(this, "No active text field", Toast.LENGTH_SHORT).show();
            return;
        }
        ic.commitText(output, 1);
        TraceStore.record(this, e, "COMMIT_REQUEST", output);
        renderKeys();
    }

    private boolean onLongPress(GlyphEntry e) {
        TraceStore.remember(this, e.id);
        if (e.confirmationRequired()) {
            commitRaw(e.fallback);
            TraceStore.record(this, e, "INERT_FALLBACK_COMMIT", e.fallback);
            Toast.makeText(this, "Inserted as inert text; no command effect handed off.", Toast.LENGTH_SHORT).show();
            renderKeys();
            return true;
        }
        boolean now = TraceStore.toggleFavourite(this, e.id);
        Toast.makeText(this, (now ? "★ Added " : "☆ Removed ") + e.label + " · fallback: " + e.fallback, Toast.LENGTH_SHORT).show();
        renderKeys();
        return true;
    }

    private void commitRaw(String text) {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.commitText(text, 1);
    }

    private void sendEnter() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER));
        ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER));
    }

    private String display(GlyphEntry e) {
        String x;
        if ("FALLBACK".equals(faceMode)) x = e.fallback;
        else if ("GLYPH".equals(faceMode)) x = e.glyph != null ? e.glyph : (e.visual != null ? e.visual : e.fallback);
        else x = e.visual != null ? e.visual : e.fallback;
        if (x.length() > 22) return e.label;
        return x;
    }

    private String nextFace(String mode) {
        if ("VISUAL".equals(mode)) return "GLYPH";
        if ("GLYPH".equals(mode)) return "FALLBACK";
        return "VISUAL";
    }

    private String faceShort() {
        if ("GLYPH".equals(faceMode)) return "JM";
        if ("FALLBACK".equals(faceMode)) return "TXT";
        return "VIS";
    }

    private Button keyButton(String text) {
        Button b = new Button(this);
        b.setAllCaps(false);
        b.setText(text);
        b.setTextColor(TEXT);
        b.setTextSize(13f);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(3), dp(4), dp(3), dp(4));
        b.setMinHeight(dp(54));
        b.setBackgroundTintList(ColorStateList.valueOf(CARD));
        return b;
    }

    private Button smallButton(String text) {
        Button b = new Button(this);
        b.setAllCaps(false);
        b.setText(text);
        b.setTextColor(TEXT);
        b.setTextSize(11f);
        b.setPadding(dp(8), dp(2), dp(8), dp(2));
        b.setMinHeight(dp(42));
        b.setBackgroundTintList(ColorStateList.valueOf(ACTIVE));
        return b;
    }

    private void addWeighted(LinearLayout row, View v, float weight) {
        row.addView(v, new LinearLayout.LayoutParams(0, -2, weight));
    }

    private int dp(int x) { return Math.round(x * getResources().getDisplayMetrics().density); }
}
