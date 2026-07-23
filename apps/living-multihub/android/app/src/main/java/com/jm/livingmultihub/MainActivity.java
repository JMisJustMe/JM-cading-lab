package com.jm.livingmultihub;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class MainActivity extends Activity {
    private static final int REQ_FILE_CHOOSER = 6001;
    private static final int REQ_FOLDER_TREE = 6002;
    private static final int REQ_SAVE_TEXT = 6003;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private String pendingSaveText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.addJavascriptInterface(new JMAndroidBridge(), "JMAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    openExternalUri(uri);
                    return true;
                }
                return false;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent intent;
                try {
                    intent = params.createIntent();
                } catch (Exception ex) {
                    intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(intent, REQ_FILE_CHOOSER);
                } catch (Exception ex) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                }
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    public final class JMAndroidBridge {
        @JavascriptInterface
        public String getBridgeVersion() {
            return "JM.NativeBridge/6.0A-field";
        }

        @JavascriptInterface
        public String getAppVersionName() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public int getAppVersionCode() {
            return BuildConfig.VERSION_CODE;
        }

        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null) return;
            runOnUiThread(() -> {
                try {
                    Uri uri = Uri.parse(url);
                    String scheme = uri.getScheme();
                    if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                        openExternalUri(uri);
                    }
                } catch (Exception ignored) { }
            });
        }

        @JavascriptInterface
        public void chooseFolder() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                        | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
                startActivityForResult(intent, REQ_FOLDER_TREE);
            });
        }

        @JavascriptInterface
        public void saveText(String filename, String mime, String content) {
            pendingSaveText = content == null ? "" : content;
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType((mime == null || mime.isBlank()) ? "application/octet-stream" : mime);
                intent.putExtra(Intent.EXTRA_TITLE,
                        (filename == null || filename.isBlank()) ? "JM_MULTIHUB_EXPORT.txt" : filename);
                startActivityForResult(intent, REQ_SAVE_TEXT);
            });
        }

        @JavascriptInterface
        public void checkUpdate(String manifestUrl) {
            new Thread(() -> fetchUpdateManifest(manifestUrl)).start();
        }

        @JavascriptInterface
        public void openUpdateDownload(String apkUrl) {
            openExternal(apkUrl);
        }
    }

    private void openExternalUri(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) { }
    }

    private void fetchUpdateManifest(String manifestUrl) {
        JSONObject result = new JSONObject();
        HttpURLConnection connection = null;
        try {
            URL url = new URL(manifestUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(12000);
            connection.setRequestProperty("Accept", "application/json");
            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 300
                    ? connection.getInputStream() : connection.getErrorStream();
            StringBuilder body = new StringBuilder();
            if (stream != null) {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) body.append(line).append('\n');
                }
            }
            result.put("ok", status >= 200 && status < 300);
            result.put("httpStatus", status);
            result.put("manifest", body.toString());
            result.put("installedVersionCode", BuildConfig.VERSION_CODE);
            result.put("installedVersionName", BuildConfig.VERSION_NAME);
        } catch (Exception ex) {
            try {
                result.put("ok", false);
                result.put("error", ex.toString());
                result.put("installedVersionCode", BuildConfig.VERSION_CODE);
                result.put("installedVersionName", BuildConfig.VERSION_NAME);
            } catch (Exception ignored) { }
        } finally {
            if (connection != null) connection.disconnect();
        }
        String js = "window.JMReceiveUpdate && window.JMReceiveUpdate(" + result + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQ_FILE_CHOOSER) {
            if (filePathCallback == null) return;
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    result = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        result[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    result = new Uri[]{data.getData()};
                }
            }
            filePathCallback.onReceiveValue(result);
            filePathCallback = null;
            return;
        }

        if (requestCode == REQ_FOLDER_TREE
                && resultCode == RESULT_OK
                && data != null
                && data.getData() != null) {
            Uri tree = data.getData();
            try {
                getContentResolver().takePersistableUriPermission(
                        tree, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) { }
            new Thread(() -> scanTreeAndReturn(tree)).start();
            return;
        }

        if (requestCode == REQ_SAVE_TEXT
                && resultCode == RESULT_OK
                && data != null
                && data.getData() != null) {
            Uri target = data.getData();
            String content = pendingSaveText == null ? "" : pendingSaveText;
            new Thread(() -> {
                try (OutputStream out = getContentResolver().openOutputStream(target, "w")) {
                    if (out != null) out.write(content.getBytes(StandardCharsets.UTF_8));
                } catch (Exception ignored) { }
            }).start();
            pendingSaveText = null;
        }
    }

    private void scanTreeAndReturn(Uri treeUri) {
        JSONArray rows = new JSONArray();
        try {
            String rootId = DocumentsContract.getTreeDocumentId(treeUri);
            walkDocumentTree(treeUri, rootId, "", rows);
        } catch (Exception ex) {
            try {
                JSONObject error = new JSONObject();
                error.put("name", "FOLDER_SCAN_ERROR.txt");
                error.put("path", "FOLDER_SCAN_ERROR.txt");
                error.put("size", 0);
                error.put("type", "text/plain");
                error.put("hash", "HASH_FAILED");
                error.put("lastModified", 0);
                error.put("error", ex.toString());
                rows.put(error);
            } catch (Exception ignored) { }
        }
        String js = "window.JMReceiveNativeFolder && window.JMReceiveNativeFolder(" + rows + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    private void walkDocumentTree(Uri treeUri, String documentId, String prefix, JSONArray rows)
            throws Exception {
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId);
        ContentResolver resolver = getContentResolver();
        String[] projection = {
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE,
                DocumentsContract.Document.COLUMN_SIZE,
                DocumentsContract.Document.COLUMN_LAST_MODIFIED
        };
        try (Cursor cursor = resolver.query(childrenUri, projection, null, null, null)) {
            if (cursor == null) return;
            while (cursor.moveToNext()) {
                String childId = cursor.getString(0);
                String name = cursor.getString(1);
                String mime = cursor.getString(2);
                long size = cursor.isNull(3) ? 0 : cursor.getLong(3);
                long modified = cursor.isNull(4) ? 0 : cursor.getLong(4);
                String path = prefix.isEmpty() ? name : prefix + "/" + name;
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    walkDocumentTree(treeUri, childId, path, rows);
                } else {
                    Uri fileUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, childId);
                    JSONObject row = new JSONObject();
                    row.put("name", name);
                    row.put("path", path);
                    row.put("size", size);
                    row.put("type", mime == null ? "" : mime);
                    row.put("hash", sha256(fileUri));
                    row.put("lastModified", modified);
                    rows.put(row);
                }
            }
        }
    }

    private String sha256(Uri uri) {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) return "HASH_FAILED";
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[128 * 1024];
            int read;
            while ((read = in.read(buffer)) > 0) digest.update(buffer, 0, read);
            StringBuilder hex = new StringBuilder();
            for (byte b : digest.digest()) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception ex) {
            return "HASH_FAILED";
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
