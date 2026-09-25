package com.jmisjustme.glyphboard;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private LinearLayout body;
    private TextView trace;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (trace != null) trace.setText(TraceStore.trace(this));
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(18), dp(22), dp(18), dp(24));
        body.setBackgroundColor(Color.rgb(11, 11, 15));
        scroll.addView(body);

        TextView title = text("JM GLYPHBOARD v0.3", 26f, true);
        body.addView(title);
        body.addView(text("ONE TOUCH → MY SYMBOL → MY MEANING → THE RIGHT SURFACE", 15f, true));
        body.addView(text("Native Android IME contact build. Recovered from JM GLYPHBOARD v0.2; this app does not request Internet permission.", 14f, false));

        Button enable = button("1 · ENABLE JM GLYPHBOARD");
        enable.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)));
        body.addView(enable);

        Button choose = button("2 · CHOOSE KEYBOARD");
        choose.setOnClickListener(v -> {
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (imm != null) imm.showInputMethodPicker();
        });
        body.addView(choose);

        body.addView(text("3 · TEST HERE", 16f, true));
        EditText test = new EditText(this);
        test.setHint("Tap here, choose JM GLYPHBOARD, then insert symbols/routes…");
        test.setTextColor(Color.WHITE);
        test.setHintTextColor(Color.LTGRAY);
        test.setMinLines(4);
        test.setGravity(Gravity.TOP);
        body.addView(test, new LinearLayout.LayoutParams(-1, -2));

        body.addView(text("CURRENT NATIVE SCOPE", 16f, true));
        body.addView(text("17 recovered registry entries · Symbols / JM glyphs / Routes / Expressions / Commands · VIS/JM/TXT face modes · favourites · recents · local trace · confirmation-gated commands remain non-effectful.", 13f, false));
        body.addView(text("OPEN PARITY", 16f, true));
        body.addView(text("Search, state import/export, richer variants UI and recipient-aware semantic command execution remain open. APK build proof is not physical phone Ding.", 13f, false));

        body.addView(text("LOCAL TRACE", 16f, true));
        trace = text(TraceStore.trace(this), 11f, false);
        trace.setTypeface(android.graphics.Typeface.MONOSPACE);
        trace.setTextIsSelectable(true);
        body.addView(trace);

        setContentView(scroll);
    }

    private TextView text(String value, float size, boolean strong) {
        TextView v = new TextView(this);
        v.setText(value);
        v.setTextColor(Color.WHITE);
        v.setTextSize(size);
        v.setPadding(0, dp(7), 0, dp(7));
        if (strong) v.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        return v;
    }

    private Button button(String label) {
        Button b = new Button(this);
        b.setAllCaps(false);
        b.setText(label);
        b.setTextSize(15f);
        return b;
    }

    private int dp(int x) { return Math.round(x * getResources().getDisplayMetrics().density); }
}
