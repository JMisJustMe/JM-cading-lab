package com.jmisjustme.livingestate;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.Menu;
import android.view.MenuItem;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public final class MainActivity extends Activity {
    private static final int OPEN_BODY = 130;
    private static final String MASTER_FILE = "JMISJUSTME_MASTER_WEBSITE_v1.3.0_SR.html";
    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        File body = masterFile();
        if (body.isFile() && body.length() > 0) openMaster(body); else showImportRoom();
    }

    private File masterFile() { return new File(getFilesDir(), MASTER_FILE); }

    private void showImportRoom() {
        LinearLayout room = new LinearLayout(this);
        room.setOrientation(LinearLayout.VERTICAL);
        room.setGravity(Gravity.CENTER);
        room.setPadding(48, 72, 48, 72);
        room.setBackgroundColor(0xff080b11);

        TextView badge = text("MASTER WEBSITE · v1.3.0 SR", 16, 0xfff4c75d);
        TextView title = text("JM Living Estate", 32, 0xffffffff);
        TextView copy = text("Import the exact promoted OneBody once. The app stores it privately, verifies its Master Website identity and runs it locally/offline on every later launch.", 18, 0xffc8cfdb);
        copy.setPadding(0, 24, 0, 36);
        Button importButton = new Button(this);
        importButton.setText("Import Master Website OneBody");
        importButton.setOnClickListener(v -> chooseMaster());

        room.addView(badge);
        room.addView(title);
        room.addView(copy);
        room.addView(importButton);
        setContentView(room);
    }

    private TextView text(String value, int sp, int colour) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(colour);
        view.setGravity(Gravity.CENTER);
        return view;
    }

    private void chooseMaster() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/html");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"text/html", "application/xhtml+xml", "text/plain"});
        startActivityForResult(intent, OPEN_BODY);
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != OPEN_BODY || result != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        try {
            byte[] bytes = readAll(uri);
            String head = new String(bytes, 0, Math.min(bytes.length, 180000), StandardCharsets.UTF_8);
            if (!head.contains("MASTER WEBSITE") || !head.contains("v1.3.0 SR")) {
                new AlertDialog.Builder(this)
                    .setTitle("Identity HOLD")
                    .setMessage("That file is not labelled MASTER WEBSITE · v1.3.0 SR. Nothing was replaced.")
                    .setPositiveButton("OK", null)
                    .show();
                return;
            }
            try (FileOutputStream out = new FileOutputStream(masterFile())) { out.write(bytes); }
            Toast.makeText(this, "Master body stored · SHA-256 " + sha256(bytes).substring(0, 12), Toast.LENGTH_LONG).show();
            openMaster(masterFile());
        } catch (Exception error) {
            new AlertDialog.Builder(this)
                .setTitle("Import HOLD")
                .setMessage(error.getMessage())
                .setPositiveButton("OK", null)
                .show();
        }
    }

    private byte[] readAll(Uri uri) throws Exception {
        try (InputStream in = getContentResolver().openInputStream(uri); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (in == null) throw new IllegalStateException("Selected body could not be opened.");
            byte[] buffer = new byte[131072];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            return out.toByteArray();
        }
    }

    private String sha256(byte[] bytes) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
        StringBuilder value = new StringBuilder();
        for (byte b : digest) value.append(String.format("%02x", b));
        return value.toString();
    }

    private void openMaster(File body) {
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient());
        web.loadUrl(Uri.fromFile(body).toString());
        setContentView(web);
        invalidateOptionsMenu();
    }

    @Override public boolean onCreateOptionsMenu(Menu menu) {
        menu.add("Import / replace Master body").setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        menu.add("Remove stored body").setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        return true;
    }

    @Override public boolean onOptionsItemSelected(MenuItem item) {
        String title = String.valueOf(item.getTitle());
        if (title.startsWith("Import")) {
            chooseMaster();
            return true;
        }
        if (title.startsWith("Remove")) {
            masterFile().delete();
            if (web != null) {
                web.destroy();
                web = null;
            }
            showImportRoom();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
