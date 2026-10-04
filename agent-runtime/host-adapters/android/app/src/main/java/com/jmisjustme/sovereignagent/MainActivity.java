package com.jmisjustme.sovereignagent;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.ScrollView;
import android.widget.TextView;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static String asset(Activity activity, String name) throws Exception {
        try (InputStream in = activity.getAssets().open(name);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int n;
            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        TextView text = new TextView(this);
        text.setTextSize(14f);
        text.setTypeface(Typeface.MONOSPACE);
        text.setPadding(36, 36, 36, 36);
        text.setGravity(Gravity.START);
        try {
            String session = asset(this, "JM_AGENT_SESSION.json");
            String contract = asset(this, "JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json");
            boolean sessionOk = session.contains("JM.AgentRuntimeSession/0.1");
            boolean contractOk = contract.contains("JM.SovereignAgentRuntime/0.1");
            text.setText(
                "JM SOVEREIGN AGENT — ANDROID ADAPTER\n\n" +
                "SESSION CARRIER: " + (sessionOk ? "PASS" : "FAIL") + "\n" +
                "RUNTIME CONTRACT: " + (contractOk ? "PASS" : "FAIL") + "\n" +
                "HOST AUTHORITY: NONE\n" +
                "DEVICE DING: OPEN\n\n" +
                session
            );
        } catch (Exception error) {
            text.setText("JM ANDROID ADAPTER LOAD FAIL\n" + error);
        }
        ScrollView scroll = new ScrollView(this);
        scroll.addView(text);
        setContentView(scroll);
    }
}
