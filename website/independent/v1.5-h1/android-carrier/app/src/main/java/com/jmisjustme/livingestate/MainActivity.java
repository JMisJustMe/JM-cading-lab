package com.jmisjustme.livingestate;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.TextView;
import android.widget.Toast;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public final class MainActivity extends Activity {
    private static final int OPEN_SITE_PACKAGE = 1501;
    private static final String EXPECTED_PACKAGE_SHA256 = "9df5439dcec6e4aa1ddad8e835a6d12fe97f460d35d42984046fcbbd1c48a0bc";
    private static final String EXPECTED_INDEX_SHA256 = "28983ccf02a3c7bb50107a8a059bc0ccd0eda0b1356ef93d48ba8203bbb418f1";
    private static final String LOCAL_ORIGIN = "https://jm.local/";
    private static final String PUBLIC_HOST = "https://jmisjustme.xo.je/";
    private static final long MAX_UNPACKED_BYTES = 300L * 1024L * 1024L;
    private static final int MAX_ENTRIES = 10000;

    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (installedIndex().isFile()) openLocalEstate(); else showImportRoom();
    }

    private File siteDir() { return new File(getFilesDir(), "JMISJUSTME_v1_5_H1_site"); }
    private File installedIndex() { return new File(siteDir(), "index.html"); }

    private void showImportRoom() {
        destroyWeb();
        LinearLayout room = new LinearLayout(this);
        room.setOrientation(LinearLayout.VERTICAL);
        room.setGravity(Gravity.CENTER);
        room.setPadding(dp(30), dp(42), dp(30), dp(42));
        room.setBackgroundColor(0xff080b11);

        TextView badge = text("CURRENT FREESTANDING HEAD · v1.5 H1", 15, 0xfff4c75d);
        TextView title = text("JM Living Estate", 32, Color.WHITE);
        TextView status = text("FROZEN · LOCKED · ANCHORED · MOUNTED · PUBLIC DING ✅", 14, 0xff9be0b0);
        TextView copy = text("Import the exact H1 full HTDOCS package once. The carrier verifies the frozen package and index hashes, stores the website privately, and serves it back through a secure local WebView origin for later offline use.", 17, 0xffc8cfdb);
        copy.setPadding(0, dp(24), 0, dp(28));

        Button importButton = new Button(this);
        importButton.setText("Import exact v1.5 H1 website package");
        importButton.setOnClickListener(v -> choosePackage());

        Button publicButton = new Button(this);
        publicButton.setText("Open proven public website");
        publicButton.setOnClickListener(v -> openExternal(Uri.parse(PUBLIC_HOST)));

        room.addView(badge);
        room.addView(title);
        room.addView(status);
        room.addView(copy);
        room.addView(importButton);
        room.addView(publicButton);
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

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void choosePackage() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/zip");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/zip", "application/x-zip-compressed", "application/octet-stream"});
        startActivityForResult(intent, OPEN_SITE_PACKAGE);
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != OPEN_SITE_PACKAGE || result != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        try {
            File tempZip = new File(getCacheDir(), "JMISJUSTME_v1_5_H1_import.zip");
            String packageHash = copyAndHash(uri, tempZip);
            if (!EXPECTED_PACKAGE_SHA256.equals(packageHash)) {
                tempZip.delete();
                identityHold("Package SHA-256 mismatch. Expected the exact frozen H1 full HTDOCS body. Nothing was replaced.\n\nExpected: " + shortHash(EXPECTED_PACKAGE_SHA256) + "\nSelected: " + shortHash(packageHash));
                return;
            }

            File staging = new File(getFilesDir(), "JMISJUSTME_v1_5_H1_staging");
            recursiveDelete(staging);
            if (!staging.mkdirs() && !staging.isDirectory()) throw new IllegalStateException("Could not create private staging room.");
            unpackSafely(tempZip, staging);
            tempZip.delete();

            File stagedIndex = new File(staging, "index.html");
            if (!stagedIndex.isFile()) throw new IllegalStateException("Exact H1 package did not contain root index.html.");
            String indexHash = sha256(stagedIndex);
            if (!EXPECTED_INDEX_SHA256.equals(indexHash)) {
                recursiveDelete(staging);
                identityHold("Root index identity mismatch. Nothing was replaced.\n\nExpected: " + shortHash(EXPECTED_INDEX_SHA256) + "\nFound: " + shortHash(indexHash));
                return;
            }

            File old = new File(getFilesDir(), "JMISJUSTME_v1_5_H1_previous");
            recursiveDelete(old);
            File current = siteDir();
            if (current.exists() && !current.renameTo(old)) throw new IllegalStateException("Could not preserve the previous local body before replacement.");
            if (!staging.renameTo(current)) {
                if (old.exists()) old.renameTo(current);
                throw new IllegalStateException("Could not promote the verified H1 body into private storage.");
            }
            recursiveDelete(old);

            getPreferences(MODE_PRIVATE).edit()
                .putString("package_sha256", packageHash)
                .putString("index_sha256", indexHash)
                .apply();
            Toast.makeText(this, "H1 body verified and stored · " + shortHash(packageHash), Toast.LENGTH_LONG).show();
            openLocalEstate();
        } catch (Exception error) {
            new AlertDialog.Builder(this)
                .setTitle("Import HOLD")
                .setMessage(error.getMessage() == null ? error.toString() : error.getMessage())
                .setPositiveButton("OK", null)
                .show();
        }
    }

    private void identityHold(String message) {
        new AlertDialog.Builder(this)
            .setTitle("Identity HOLD")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show();
    }

    private String copyAndHash(Uri uri, File destination) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        InputStream raw = getContentResolver().openInputStream(uri);
        if (raw == null) throw new IllegalStateException("Selected package could not be opened.");
        try (InputStream source = raw;
             BufferedInputStream in = new BufferedInputStream(source);
             FileOutputStream out = new FileOutputStream(destination)) {
            byte[] buffer = new byte[131072];
            int read;
            while ((read = in.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
                out.write(buffer, 0, read);
            }
        }
        return hex(digest.digest());
    }

    private void unpackSafely(File zipFile, File root) throws Exception {
        String rootCanonical = root.getCanonicalPath();
        String rootPath = rootCanonical + File.separator;
        long total = 0;
        int entries = 0;
        try (ZipInputStream zin = new ZipInputStream(new BufferedInputStream(new FileInputStream(zipFile)))) {
            ZipEntry entry;
            byte[] buffer = new byte[131072];
            while ((entry = zin.getNextEntry()) != null) {
                if (++entries > MAX_ENTRIES) throw new IllegalStateException("Package exceeds entry safety limit.");
                String name = entry.getName().replace('\\', '/');
                if (name.startsWith("/") || name.contains("../") || name.equals("..")) throw new IllegalStateException("Unsafe package path blocked: " + name);
                File outFile = new File(root, name);
                String outPath = outFile.getCanonicalPath();
                if (!outPath.startsWith(rootPath) && !outPath.equals(rootCanonical)) throw new IllegalStateException("Package path escaped private room: " + name);
                if (entry.isDirectory()) {
                    if (!outFile.mkdirs() && !outFile.isDirectory()) throw new IllegalStateException("Could not create package folder: " + name);
                } else {
                    File parent = outFile.getParentFile();
                    if (parent != null && !parent.mkdirs() && !parent.isDirectory()) throw new IllegalStateException("Could not create package path: " + name);
                    try (FileOutputStream out = new FileOutputStream(outFile)) {
                        int read;
                        while ((read = zin.read(buffer)) != -1) {
                            total += read;
                            if (total > MAX_UNPACKED_BYTES) throw new IllegalStateException("Package exceeds unpacked safety limit.");
                            out.write(buffer, 0, read);
                        }
                    }
                }
                zin.closeEntry();
            }
        }
    }

    private void openLocalEstate() {
        destroyWeb();
        FrameLayout root = new FrameLayout(this);
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new LocalEstateClient());

        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        Button menu = new Button(this);
        menu.setText("⋮");
        menu.setTextSize(22);
        menu.setContentDescription("JM Living Estate controls");
        menu.setMinWidth(dp(44));
        menu.setMinHeight(dp(44));
        menu.setPadding(0, 0, 0, 0);
        FrameLayout.LayoutParams menuParams = new FrameLayout.LayoutParams(dp(50), dp(50), Gravity.TOP | Gravity.END);
        menuParams.setMargins(0, dp(6), dp(6), 0);
        root.addView(menu, menuParams);
        menu.setOnClickListener(v -> showControls(menu));

        setContentView(root);
        web.loadUrl(LOCAL_ORIGIN + "index.html");
    }

    private void showControls(Button anchor) {
        PopupMenu popup = new PopupMenu(this, anchor);
        popup.getMenu().add("Import / replace v1.5 H1 body");
        popup.getMenu().add("Open proven public website");
        popup.getMenu().add("Show local proof");
        popup.getMenu().add("Remove stored local body");
        popup.setOnMenuItemClickListener(item -> {
            String title = String.valueOf(item.getTitle());
            if (title.startsWith("Import")) choosePackage();
            else if (title.startsWith("Open")) openExternal(Uri.parse(PUBLIC_HOST));
            else if (title.startsWith("Show")) showLocalProof();
            else if (title.startsWith("Remove")) confirmRemove();
            return true;
        });
        popup.show();
    }

    private void showLocalProof() {
        String packageHash = getPreferences(MODE_PRIVATE).getString("package_sha256", "unknown");
        String indexHash = getPreferences(MODE_PRIVATE).getString("index_sha256", "unknown");
        new AlertDialog.Builder(this)
            .setTitle("JM Living Estate · local proof")
            .setMessage("Website head: v1.5 H1\nCarrier: 1.5-H1\nPackage: " + packageHash + "\nIndex: " + indexHash + "\nOrigin: " + LOCAL_ORIGIN + "\nMode: private local copy + offline-capable same-origin WebView")
            .setPositiveButton("OK", null)
            .show();
    }

    private void confirmRemove() {
        new AlertDialog.Builder(this)
            .setTitle("Remove local H1 body?")
            .setMessage("This removes only the app's private imported website copy. The Estate source and public website are untouched.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Remove", (d, which) -> {
                recursiveDelete(siteDir());
                getPreferences(MODE_PRIVATE).edit().clear().apply();
                showImportRoom();
            }).show();
    }

    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception e) { Toast.makeText(this, "No external browser route available.", Toast.LENGTH_SHORT).show(); }
    }

    private final class LocalEstateClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!"jm.local".equalsIgnoreCase(uri.getHost())) return null;
            try {
                String rawPath = uri.getEncodedPath();
                String path = URLDecoder.decode(rawPath == null ? "/" : rawPath, "UTF-8");
                if (path.equals("/")) path = "/index.html";
                while (path.startsWith("/")) path = path.substring(1);
                File root = siteDir();
                File target = new File(root, path);
                String rootPath = root.getCanonicalPath() + File.separator;
                String targetPath = target.getCanonicalPath();
                if (!targetPath.startsWith(rootPath)) return response(403, "text/plain", new ByteArrayInputStream("Blocked".getBytes(StandardCharsets.UTF_8)));
                if (target.isDirectory()) target = new File(target, "index.html");
                if (!target.isFile()) return response(404, "text/plain", new ByteArrayInputStream("Not found".getBytes(StandardCharsets.UTF_8)));
                return response(200, mimeFor(target.getName()), new FileInputStream(target));
            } catch (Exception e) {
                return response(500, "text/plain", new ByteArrayInputStream("Local route error".getBytes(StandardCharsets.UTF_8)));
            }
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("jm.local".equalsIgnoreCase(uri.getHost())) return false;
            openExternal(uri);
            return true;
        }
    }

    private WebResourceResponse response(int status, String mime, InputStream data) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", LOCAL_ORIGIN.substring(0, LOCAL_ORIGIN.length() - 1));
        headers.put("Cache-Control", "no-cache");
        return new WebResourceResponse(mime, mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") ? "UTF-8" : null,
            status, status == 200 ? "OK" : status == 404 ? "Not Found" : status == 403 ? "Forbidden" : "Error", headers, data);
    }

    private String mimeFor(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".gz")) return "application/gzip";
        if (lower.endsWith(".wasm")) return "application/wasm";
        String ext = MimeTypeMap.getFileExtensionFromUrl(name);
        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return mime == null ? "application/octet-stream" : mime;
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buffer = new byte[131072];
            int read;
            while ((read = in.read(buffer)) != -1) digest.update(buffer, 0, read);
        }
        return hex(digest.digest());
    }

    private String hex(byte[] digest) {
        StringBuilder value = new StringBuilder();
        for (byte b : digest) value.append(String.format(Locale.ROOT, "%02x", b));
        return value.toString();
    }

    private String shortHash(String value) {
        return value.length() <= 16 ? value : value.substring(0, 12) + "…" + value.substring(value.length() - 4);
    }

    private void recursiveDelete(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) recursiveDelete(child);
        }
        file.delete();
    }

    private void destroyWeb() {
        if (web != null) {
            web.stopLoading();
            web.destroy();
            web = null;
        }
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        destroyWeb();
        super.onDestroy();
    }
}
