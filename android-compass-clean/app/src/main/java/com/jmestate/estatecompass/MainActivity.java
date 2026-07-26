package com.jmestate.estatecompass;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
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
    private static final long MAX_BODY_BYTES = 128L * 1024L * 1024L;
    private static final int HTML_PROBE_BYTES = 64 * 1024;
    private static final String BODY_FILE = "jm-estate-compass-mounted.html";
    private static final String PREVIOUS_BODY_FILE = "jm-estate-compass-previous.html";
    private static final String INCOMING_BODY_FILE = "jm-estate-compass-incoming.html";
    private static final String BODY_ORIGIN = "https://jm-estate.local/";
    private static final String BODY_URL = BODY_ORIGIN + "index.html";

    private WebView webView;
    private TextView bodyLabel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
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

    private void configureSystemBars() {
        getWindow().setStatusBarColor(Color.rgb(8, 9, 11));
        getWindow().setNavigationBarColor(Color.rgb(8, 9, 11));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        }
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(8, 9, 11));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            root.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return windowInsets;
            });
        } else {
            root.setFitsSystemWindows(true);
        }

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(12), 0, dp(8), 0);
        bar.setBackgroundColor(Color.rgb(16, 19, 24));
        root.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)));

        bodyLabel = new TextView(this);
        bodyLabel.setTextColor(Color.rgb(238, 243, 246));
        bodyLabel.setTextSize(13);
        bodyLabel.setSingleLine(true);
        bodyLabel.setText("JM Estate Compass · v1.2.1");
        bar.addView(bodyLabel, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button bodyButton = new Button(this);
        bodyButton.setText("BODY");
        bodyButton.setTextSize(11);
        bodyButton.setTextColor(Color.rgb(21, 200, 255));
        bodyButton.setBackgroundColor(Color.TRANSPARENT);
        bodyButton.setContentDescription("Open Compass body controls");
        bodyButton.setOnClickListener(this::showBodyMenu);
        bar.addView(bodyButton, new LinearLayout.LayoutParams(dp(88), dp(48)));

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
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        webView.setBackgroundColor(Color.rgb(8, 9, 11));
        webView.addJavascriptInterface(new CompassBridge(), "AndroidCompass");
        WebView.setWebContentsDebuggingEnabled(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("jm-estate.local".equals(uri.getHost())
                        && ("/".equals(uri.getPath()) || "/index.html".equals(uri.getPath()))) {
                    File body = mountedBodyFile();
                    if (body.isFile()) {
                        try {
                            return new WebResourceResponse(
                                    "text/html",
                                    "UTF-8",
                                    new FileInputStream(body));
                        } catch (IOException ignored) {
                            return null;
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

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
        if (previousBodyFile().isFile()) menu.getMenu().add("Restore previous Compass body");
        menu.getMenu().add("Remove mounted body");
        menu.setOnMenuItemClickListener(item -> {
            String title = item.getTitle().toString();
            if (title.startsWith("Import")) chooseBody();
            else if (title.startsWith("Reload")) loadMountedOrBootstrap();
            else if (title.startsWith("Restore")) restorePreviousBody();
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
        File incoming = incomingBodyFile();
        incoming.delete();
        try {
            ImportReceipt receipt = streamBodyToPrivateStorage(uri, incoming);
            replaceMountedBody(incoming);
            String displayName = displayName(uri);
            getPreferences(MODE_PRIVATE).edit()
                    .putString("mounted_name", displayName)
                    .putString("mounted_sha256", receipt.sha256)
                    .putLong("mounted_bytes", receipt.bytes)
                    .apply();
            loadMountedOrBootstrap();
            Toast.makeText(
                    this,
                    "Compass body mounted: " + readableBytes(receipt.bytes),
                    Toast.LENGTH_LONG).show();
        } catch (Exception error) {
            incoming.delete();
            Toast.makeText(this, "Body not mounted: " + error.getMessage(), Toast.LENGTH_LONG).show();
            loadMountedOrBootstrap();
        }
    }

    private ImportReceipt streamBodyToPrivateStorage(Uri uri, File destination) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        ByteArrayOutputStream probe = new ByteArrayOutputStream(HTML_PROBE_BYTES);
        long total = 0;

        try (InputStream in = getContentResolver().openInputStream(uri);
             FileOutputStream out = new FileOutputStream(destination)) {
            if (in == null) throw new IOException("The selected file could not be opened.");
            byte[] buffer = new byte[64 * 1024];
            int count;
            while ((count = in.read(buffer)) != -1) {
                total += count;
                if (total > MAX_BODY_BYTES) {
                    throw new IOException("The selected body is larger than 128 MB.");
                }
                if (probe.size() < HTML_PROBE_BYTES) {
                    int remaining = HTML_PROBE_BYTES - probe.size();
                    probe.write(buffer, 0, Math.min(count, remaining));
                }
                digest.update(buffer, 0, count);
                out.write(buffer, 0, count);
            }
            out.getFD().sync();
        }

        String opening = probe.toString(StandardCharsets.UTF_8.name()).toLowerCase(Locale.ROOT);
        if (!opening.contains("<html") && !opening.contains("<!doctype html")) {
            throw new IOException("The selected file is not an HTML body.");
        }
        if (total == 0) throw new IOException("The selected body is empty.");
        return new ImportReceipt(total, hex(digest.digest()));
    }

    private void replaceMountedBody(File incoming) throws IOException {
        File mounted = mountedBodyFile();
        File previous = previousBodyFile();
        previous.delete();
        if (mounted.isFile() && !mounted.renameTo(previous)) {
            copyFile(mounted, previous);
            if (!mounted.delete()) throw new IOException("The current body could not be rotated safely.");
        }
        if (!incoming.renameTo(mounted)) {
            copyFile(incoming, mounted);
            if (!incoming.delete()) incoming.deleteOnExit();
        }
    }

    private void restorePreviousBody() {
        File mounted = mountedBodyFile();
        File previous = previousBodyFile();
        if (!previous.isFile()) {
            Toast.makeText(this, "No previous body is available.", Toast.LENGTH_LONG).show();
            return;
        }
        File swap = new File(getFilesDir(), "jm-estate-compass-swap.html");
        swap.delete();
        try {
            if (mounted.isFile() && !mounted.renameTo(swap)) copyFile(mounted, swap);
            if (!previous.renameTo(mounted)) copyFile(previous, mounted);
            previous.delete();
            if (swap.isFile() && !swap.renameTo(previous)) copyFile(swap, previous);
            swap.delete();
            getPreferences(MODE_PRIVATE).edit().putString("mounted_name", "Restored previous Compass body").apply();
            loadMountedOrBootstrap();
            Toast.makeText(this, "Previous Compass body restored.", Toast.LENGTH_LONG).show();
        } catch (IOException error) {
            Toast.makeText(this, "Previous body not restored: " + error.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void loadMountedOrBootstrap() {
        File body = mountedBodyFile();
        if (body.isFile()) {
            String name = getPreferences(MODE_PRIVATE).getString("mounted_name", BODY_FILE);
            long size = getPreferences(MODE_PRIVATE).getLong("mounted_bytes", body.length());
            bodyLabel.setText("JM Estate Compass · " + name + " · " + readableBytes(size));
            webView.stopLoading();
            webView.clearCache(true);
            webView.loadUrl(BODY_URL + "?mount=" + body.lastModified());
            return;
        }
        bodyLabel.setText("JM Estate Compass · body not mounted");
        webView.loadUrl("file:///android_asset/bootstrap.html");
    }

    private void confirmReset() {
        new AlertDialog.Builder(this)
                .setTitle("Remove mounted body?")
                .setMessage("This removes only the app's mounted copy. The original HTML file is not deleted.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Remove", (dialog, which) -> {
                    mountedBodyFile().delete();
                    previousBodyFile().delete();
                    incomingBodyFile().delete();
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

    private File previousBodyFile() {
        return new File(getFilesDir(), PREVIOUS_BODY_FILE);
    }

    private File incomingBodyFile() {
        return new File(getFilesDir(), INCOMING_BODY_FILE);
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

    private static void copyFile(File source, File destination) throws IOException {
        try (FileInputStream in = new FileInputStream(source);
             FileOutputStream out = new FileOutputStream(destination)) {
            byte[] buffer = new byte[64 * 1024];
            int count;
            while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
            out.getFD().sync();
        }
    }

    private static String hex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) result.append(String.format(Locale.ROOT, "%02x", b));
        return result.toString();
    }

    private static String readableBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        double kib = bytes / 1024.0;
        if (kib < 1024) return String.format(Locale.ROOT, "%.1f KiB", kib);
        return String.format(Locale.ROOT, "%.1f MiB", kib / 1024.0);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static final class ImportReceipt {
        final long bytes;
        final String sha256;

        ImportReceipt(long bytes, String sha256) {
            this.bytes = bytes;
            this.sha256 = sha256;
        }
    }

    public final class CompassBridge {
        @JavascriptInterface
        public void chooseBody() {
            runOnUiThread(MainActivity.this::chooseBody);
        }
    }
}
