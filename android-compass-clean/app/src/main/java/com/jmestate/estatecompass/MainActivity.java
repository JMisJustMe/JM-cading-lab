package com.jmestate.estatecompass;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final int REQUEST_IMPORT_BODY = 1201;
    private static final long MAX_BODY_BYTES = 20L * 1024L * 1024L;
    private static final String BODY_FILE = "jm-estate-compass-mounted.html";
    private static final String BODY_ORIGIN = "https://jm-estate.local/";

    private WebView webView;
    private TextView bodyLabel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        configureWebView();
        if (!importFromIntent(getIntent())) loadMountedOrBootstrap();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        importFromIntent(intent);
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(8, 9, 11));

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(12), 0, dp(8), 0);
        bar.setBackgroundColor(Color.rgb(16, 19, 24));
        root.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48)));

        bodyLabel = new TextView(this);
        bodyLabel.setTextColor(Color.rgb(238, 243, 246));
        bodyLabel.setTextSize(13);
        bodyLabel.setSingleLine(true);
        bodyLabel.setText("JM Estate Compass · v1.2");
        bar.addView(bodyLabel, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button bodyButton = new Button(this);
        bodyButton.setText("BODY");
        bodyButton.setTextSize(11);
        bodyButton.setTextColor(Color.rgb(21, 200, 255));
        bodyButton.setBackgroundColor(Color.TRANSPARENT);
        bodyButton.setOnClickListener(this::showBodyMenu);
        bar.addView(bodyButton, new LinearLayout.LayoutParams(dp(82), dp(44)));

        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);

        webView.setBackgroundColor(Color.rgb(8, 9, 11));
        webView.addJavascriptInterface(new CompassBridge(), "AndroidCompass");
        WebView.setWebContentsDebuggingEnabled(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
                if ((scheme.equals("http") || scheme.equals("https")) && !"jm-estate.local".equals(uri.getHost())) {
                    openExternal(uri);
                    return true;
                }
                return false;
            }
        });
    }

    private void showBodyMenu(View anchor) {
        PopupMenu menu = new PopupMenu(this, anchor);
        menu.getMenu().add("Import or replace Compass body");
        menu.getMenu().add("Reload mounted body");
        menu.getMenu().add("Remove mounted body");
        menu.setOnMenuItemClickListener(item -> {
            String title = item.getTitle().toString();
            if (title.startsWith("Import")) chooseBody();
            else if (title.startsWith("Reload")) loadMountedOrBootstrap();
            else confirmReset();
            return true;
        });
        menu.show();
    }

    private void chooseBody() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"text/html", "application/xhtml+xml", "text/plain"});
        startActivityForResult(intent, REQUEST_IMPORT_BODY);
    }

    private boolean importFromIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction()) || intent.getData() == null) return false;
        importBody(intent.getData());
        return true;
    }

    private void importBody(Uri uri) {
        try {
            byte[] bytes = readLimited(uri, MAX_BODY_BYTES);
            String html = new String(bytes, StandardCharsets.UTF_8);
            String lower = html.toLowerCase(Locale.ROOT);
            if (!lower.contains("<html") && !lower.contains("<!doctype html")) {
                throw new IOException("The selected file is not an HTML body.");
            }
            try (FileOutputStream out = new FileOutputStream(mountedBodyFile())) {
                out.write(bytes);
            }
            String displayName = displayName(uri);
            getPreferences(MODE_PRIVATE).edit()
                    .putString("mounted_name", displayName)
                    .putString("mounted_sha256", sha256(bytes))
                    .apply();
            loadHtml(html, displayName);
            Toast.makeText(this, "Compass body mounted on this device.", Toast.LENGTH_LONG).show();
        } catch (Exception error) {
            Toast.makeText(this, "Body not mounted: " + error.getMessage(), Toast.LENGTH_LONG).show();
            loadMountedOrBootstrap();
        }
    }

    private void loadMountedOrBootstrap() {
        File body = mountedBodyFile();
        if (body.isFile()) {
            try {
                String html = readText(body);
                String name = getPreferences(MODE_PRIVATE).getString("mounted_name", BODY_FILE);
                loadHtml(html, name);
                return;
            } catch (IOException error) {
                Toast.makeText(this, "Mounted body could not be read.", Toast.LENGTH_LONG).show();
            }
        }
        bodyLabel.setText("JM Estate Compass · body not mounted");
        webView.loadUrl("file:///android_asset/bootstrap.html");
    }

    private void loadHtml(String html, String name) {
        bodyLabel.setText("JM Estate Compass · " + name);
        webView.loadDataWithBaseURL(BODY_ORIGIN, html, "text/html", "UTF-8", null);
    }

    private void confirmReset() {
        new AlertDialog.Builder(this)
                .setTitle("Remove mounted body?")
                .setMessage("This removes only the app's mounted copy. The original HTML file is not deleted.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Remove", (dialog, which) -> {
                    mountedBodyFile().delete();
                    getPreferences(MODE_PRIVATE).edit().clear().apply();
                    loadMountedOrBootstrap();
                }).show();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_IMPORT_BODY && resultCode == RESULT_OK && data != null && data.getData() != null) {
            importBody(data.getData());
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidCompass");
            webView.destroy();
        }
        super.onDestroy();
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "No browser can open this link.", Toast.LENGTH_LONG).show();
        }
    }

    private File mountedBodyFile() {
        return new File(getFilesDir(), BODY_FILE);
    }

    private byte[] readLimited(Uri uri, long maxBytes) throws IOException {
        try (InputStream in = getContentResolver().openInputStream(uri); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (in == null) throw new IOException("The selected file could not be opened.");
            byte[] buffer = new byte[16 * 1024];
            long total = 0;
            int count;
            while ((count = in.read(buffer)) != -1) {
                total += count;
                if (total > maxBytes) throw new IOException("The selected body is larger than 20 MB.");
                out.write(buffer, 0, count);
            }
            return out.toByteArray();
        }
    }

    private String displayName(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return cursor.getString(index);
            }
        } catch (Exception ignored) { }
        String last = uri.getLastPathSegment();
        return last == null ? BODY_FILE : last;
    }

    private static String readText(File file) throws IOException {
        try (FileInputStream in = new FileInputStream(file); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            int count;
            while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static String sha256(byte[] bytes) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
        StringBuilder result = new StringBuilder();
        for (byte b : digest) result.append(String.format(Locale.ROOT, "%02x", b));
        return result.toString();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    public final class CompassBridge {
        @JavascriptInterface
        public void chooseBody() {
            runOnUiThread(MainActivity.this::chooseBody);
        }
    }
}
