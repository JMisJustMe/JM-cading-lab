package com.jmisjustme.filegrabbervisualang;

import android.app.Activity;
import android.os.Bundle;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;
import android.view.Gravity;
import android.widget.FrameLayout;
import android.widget.Button;
import android.graphics.Color;
import java.io.OutputStream;
import java.security.DigestOutputStream;
import java.util.zip.ZipOutputStream;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Set;
import java.util.HashSet;
import android.view.WindowInsets;
import android.graphics.Insets;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.LinkedHashSet;
import android.app.AlertDialog;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int PICK_FILES = 3241;
    private static final int PICK_FOLDER = 3242;
    private static final int CREATE_VAULT_ARCHIVE = 3250;
    private static final int PICK_VAULT_ARCHIVE = 3251;
    private static final int MAX_FILES = 500;
    private static final long MAX_TOTAL_BYTES = 512L * 1024L * 1024L;
    private static final String APP_URL = "https://jm.app/index.html";
    private static final String VAULT_PREFIX = "https://jm.vault/body/";

    private WebView web;
    private ValueCallback<Uri[]> pendingWebChooser;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private File vaultDir;
    private SharedPreferences prefs;
    private Intent pendingExternalShare;
    private boolean nativeUiReady;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        vaultDir = new File(getFilesDir(), "jm_native_vault");
        if (!vaultDir.exists()) vaultDir.mkdirs();
        prefs = getSharedPreferences("jm_native_vault", MODE_PRIVATE);

        web = new WebView(this);
        web.setLayoutParams(new ViewGroup.LayoutParams(-1, -1));
        web.setBackgroundColor(android.graphics.Color.rgb(3,5,10));
        web.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            }
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new NativeBridge(), "JMNative");
        pendingExternalShare = NativeShareGate.shareAction(getIntent() == null ? null : getIntent().getAction()) ? getIntent() : null;
        web.setWebViewClient(new LocalClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingWebChooser != null) pendingWebChooser.onReceiveValue(null);
                pendingWebChooser = callback;
                launchFiles();
                return true;
            }
        });
        // Native owner-only control: no new privileged JavascriptInterface method exposed to subframes.
        FrameLayout shell = new FrameLayout(this);
        shell.addView(web, new FrameLayout.LayoutParams(-1, -1));
        Button backupControl = new Button(this);
        backupControl.setText("Vault");
        backupControl.setAllCaps(false);
        backupControl.setContentDescription("JM File Grabber CP10 - owner vault backup and restore");
        backupControl.setTextColor(Color.WHITE);
        backupControl.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(22, 62, 79)));
        FrameLayout.LayoutParams vaultParams = new FrameLayout.LayoutParams(
            (int)(84*getResources().getDisplayMetrics().density),
            (int)(48*getResources().getDisplayMetrics().density), Gravity.END | Gravity.BOTTOM);
        vaultParams.setMargins(0,0,(int)(10*getResources().getDisplayMetrics().density),(int)(12*getResources().getDisplayMetrics().density));
        shell.addView(backupControl,vaultParams);
        backupControl.setOnClickListener(v -> new AlertDialog.Builder(this)
            .setTitle("JM File Grabber CP10 - your vault")
            .setItems(new String[]{"Backup verified bytes to a file", "Restore a verified portable backup"},
              (dialog,choice) -> {if(choice==0)offerVaultBackup(); else launchVaultRestore();})
            .setNegativeButton("Cancel",(dialog,which)->{})
            .show());
        setContentView(shell);
        web.loadUrl(APP_URL);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (NativeShareGate.shareAction(intent == null ? null : intent.getAction())) {
            if (nativeUiReady) ingestExternalShare(intent);
            else pendingExternalShare = intent;
        }
    }

    private final class LocalClient extends WebViewClient {
        @Override public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (!NativeVaultTruth.isAppUrl(url)) return;
            nativeUiReady = true;
            Intent queued = pendingExternalShare;
            pendingExternalShare = null;
            if (queued != null) ingestExternalShare(queued);
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            // A JavascriptInterface cannot identify its calling origin: never navigate this WebView away from the asset.
            return request.isForMainFrame() && !NativeVaultTruth.isAppUrl(request.getUrl().toString());
        }
        @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return !NativeVaultTruth.isAppUrl(url);
        }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return serve(request.getUrl());
        }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return serve(Uri.parse(url));
        }
        private WebResourceResponse serve(Uri uri) {
            try {
                String url = uri.toString();
                if (NativeVaultTruth.isAppUrl(url)) {
                    return new WebResourceResponse("text/html", "UTF-8", getAssets().open("index.html"));
                }
                if (NativeVaultTruth.isVaultUrl(url)) {
                    String id = uri.getLastPathSegment();
                    JSONObject meta = findMeta(id);
                    if (meta == null || !NativeVaultTruth.verify(vaultDir, meta.optString("stored"), id, meta.optLong("size", -1))) return notFound();
                    File file = new File(vaultDir, meta.getString("stored"));
                    Map<String,String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-store");
                    headers.put("Access-Control-Allow-Origin", "https://jm.app");
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(meta.optString("mime", "application/octet-stream"), null, 200, "OK", headers, new FileInputStream(file));
                }
            } catch (Exception ignored) { }
            // Never fall back to network for an unknown URL: this WebView owns a privileged native bridge.
            return notFound();
        }
        private WebResourceResponse notFound() {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream("Not found".getBytes()));
        }
    }

    public final class NativeBridge {
        @JavascriptInterface public void pickFiles() { runOnUiThread(MainActivity.this::launchFiles); }
        @JavascriptInterface public void pickFolder() { runOnUiThread(MainActivity.this::launchFolder); }
        @JavascriptInterface public void restoreVault() { io.execute(MainActivity.this::restoreVerifiedVault); }
        @JavascriptInterface public void clearVault() {
            // Every JS frame can call JavascriptInterface: NEVER silently erase on a JS call.
            runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                .setTitle("CP10 TEST: delete current private vault?")
                .setMessage("Danger: this permanently deletes this CP10 test app's private files. First export and independently verify a backup. This does not affect the older app, but cannot be undone.")
                .setPositiveButton("Delete CP10 test vault",(dialog,which) ->
                    new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Confirm permanent deletion")
                        .setMessage("Only CP10 TEST contents will be deleted. There is no Undo.")
                        .setPositiveButton("Yes, delete CP10 TEST data", (d,w) -> io.execute(MainActivity.this::clearVaultInternal))
                        .setNegativeButton("Cancel",(d,w)->{}).show())
                .setNegativeButton("Cancel",(dialog,which)->{}).show());
        }
        @JavascriptInterface public void getStatus() {
            JSONObject payload = new JSONObject();
            try {
                payload.put("event", "status"); payload.put("ready", true);
                payload.put("label", "NATIVE READY · " + readMeta().length() + " LEDGER ROWS · VERIFY RESTORE");
                payload.put("boundary", "Files are copied into the app-private vault. Provider originals remain untouched.");
            } catch (Exception ignored) { }
            send(payload);
        }
        @JavascriptInterface public void exportReceipt() {
            io.execute(() -> {
                JSONObject receipt = new JSONObject();
                try {
                    JSONArray items = readMeta();
                    long bytes = 0; for (int i=0;i<items.length();i++) bytes += items.getJSONObject(i).optLong("size",0);
                    receipt.put("schema", "JM.FileGrabberVisualang.NativeReceipt/0.4");
                    receipt.put("generated_at", System.currentTimeMillis());
                    receipt.put("ledger_rows", items.length());
                    receipt.put("ledger_reported_bytes_UNVERIFIED", bytes);
                    receipt.put("folder_picker", true);
                    VaultResult audited = auditVault();
                    receipt.put("cross_restart_private_vault", "VERIFIED_THIS_RUN");
                    long verifiedBytes = 0;
                    for (int i=0;i<audited.valid.length();i++) verifiedBytes += audited.valid.getJSONObject(i).optLong("size",0);
                    receipt.put("verified_items", audited.valid.length());
                    receipt.put("verified_bytes", verifiedBytes);
                    receipt.put("recovery_holds", audited.holds);
                    receipt.put("ancestor_overwrite", false);
                    JSONArray publicItems = new JSONArray();
                    for (int i=0;i<audited.valid.length();i++) publicItems.put(publicMeta(audited.valid.getJSONObject(i)));
                    receipt.put("items", publicItems);
                    receipt.put("boundary", "Receipt proves wrapper state reported by this installed app. Native visual magic does not replace exact-byte, vault or device proof.");
                    JSONObject payload = new JSONObject(); payload.put("event","receipt"); payload.put("receipt",receipt); send(payload);
                } catch (Exception e) { sendError(e); }
            });
        }
    }

    /** ACTION_SEND uses transient read grants; never persist or silently treat a file:// URI as safe. */
    private void ingestExternalShare(Intent share) {
        if (share == null || !NativeShareGate.shareAction(share.getAction())) return;
        LinkedHashSet<Uri> accepted = new LinkedHashSet<>();
        try {
            ClipData clip = share.getClipData();
            if (clip != null) {
                for (int i = 0; i < clip.getItemCount() && accepted.size() < MAX_FILES; i++) {
                    Uri uri = clip.getItemAt(i).getUri();
                    if (uri != null && NativeShareGate.acceptedUri(uri.toString())) accepted.add(uri);
                }
            }
            if (Intent.ACTION_SEND.equals(share.getAction())) {
                Uri uri = share.getParcelableExtra(Intent.EXTRA_STREAM);
                if (uri != null && NativeShareGate.acceptedUri(uri.toString())) accepted.add(uri);
            } else if (Intent.ACTION_SEND_MULTIPLE.equals(share.getAction())) {
                ArrayList<Uri> uris = share.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (uris != null) for (Uri uri : uris) {
                    if (accepted.size() >= MAX_FILES) break;
                    if (uri != null && NativeShareGate.acceptedUri(uri.toString())) accepted.add(uri);
                }
            }
            if (accepted.isEmpty()) {
                sendError(new IllegalArgumentException("Share contained no permitted content:// file streams."));
                return;
            }
            // Do not persist a transient ACTION_SEND grant. Import bytes while this Activity owns the grant.
            List<Uri> items = new ArrayList<>(accepted);
            // External apps can target this exported Activity directly; owner confirmation is mandatory.
            new AlertDialog.Builder(this)
                .setTitle("JM File Grabber CP10 · incoming files")
                .setMessage("Copy " + items.size() + " shared file(s) into this separate test vault? Original files stay untouched.")
                .setPositiveButton("Import verified bytes", (dialog, which) -> io.execute(() -> importUris(items, "files")))
                .setNegativeButton("Cancel", (dialog, which) -> { })
                .show();
        } catch (Exception e) { sendError(e); }
    }


    private void ownerNotice(String title, String message) {
        runOnUiThread(() -> {if(!isFinishing()) new AlertDialog.Builder(this)
            .setTitle(title).setMessage(message).setPositiveButton("OK",(dialog,which)->{}).show();});
    }
    private void offerVaultBackup() {
        io.execute(() -> {
            try {
                VaultResult state=auditVault();
                if(state.holds.length()>0) throw new IllegalStateException(
                  "Backup blocked: "+state.holds.length()+" unverified ledger rows. No partial backup will be marked complete.");
                if(state.valid.length()==0) throw new IllegalStateException("Nothing verified in this test vault to back up.");
                long total=0;for(int i=0;i<state.valid.length();i++)total+=state.valid.getJSONObject(i).getLong("size");
                final long bytes=total;final int count=state.valid.length();
                runOnUiThread(() -> new AlertDialog.Builder(this)
                    .setTitle("Owner-controlled exact-byte backup")
                    .setMessage("Export "+count+" verified files ("+bytes+" original bytes) to a document YOU select. No existing private files will be cleared. No old app vault will be accessed.")
                    .setPositiveButton("Choose backup location",(dialog,which)->launchVaultBackupPicker())
                    .setNegativeButton("Cancel",(dialog,which)->{})
                    .show());
            } catch(Exception e) {ownerNotice("Backup HOLD",e.getMessage());}
        });
    }
    private void launchVaultBackupPicker() {
        Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/zip");
        intent.putExtra(Intent.EXTRA_TITLE,"JM_CP10_VERIFIED_VAULT_"+System.currentTimeMillis()+".zip");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        startActivityForResult(intent,CREATE_VAULT_ARCHIVE);
    }
    private void writeVaultArchive(Uri destination) {
        try {
            VaultResult state=auditVault();
            if(state.holds.length()>0||state.valid.length()==0)throw new IllegalStateException("Vault changed; complete backup blocked.");
            JSONArray publicRows=new JSONArray();java.util.List<NativeVaultArchive.Body> bodies=new ArrayList<>();
            for(int i=0;i<state.valid.length();i++){
                JSONObject row=state.valid.getJSONObject(i);String sha=row.getString("id");
                long size=row.getLong("size");
                if(!NativeVaultTruth.verify(vaultDir,row.getString("stored"),sha,size)) throw new IllegalStateException("Vault changed during backup preflight");
                JSONObject publicRow=new JSONObject();
                publicRow.put("sha256",sha);publicRow.put("size",size);
                publicRow.put("name",row.optString("name","body.bin"));publicRow.put("mime",row.optString("mime","application/octet-stream"));
                publicRows.put(publicRow);
                bodies.add(new NativeVaultArchive.Body(sha,new File(vaultDir,row.getString("stored")),size));
            }
            JSONObject manifest=new JSONObject();
            manifest.put("schema",NativeVaultArchive.SCHEMA);manifest.put("items",publicRows);
            manifest.put("origin","CP10_SIDE_BY_SIDE_TEST_APP_OWN_VAULT_ONLY");
            manifest.put("legacy_private_vault_export",false);
            MessageDigest md=MessageDigest.getInstance("SHA-256");
            try(OutputStream raw=getContentResolver().openOutputStream(destination,"w")){
                if(raw==null)throw new IllegalStateException("Document provider gave no output stream");
                NativeVaultArchive.write(new DigestOutputStream(raw,md),manifest.toString(),bodies);
            }
            String outputHash=NativeVaultArchive.hex(md.digest());
            boolean readback=false;
            try(InputStream stream=getContentResolver().openInputStream(destination)){
                if(stream!=null){MessageDigest check=MessageDigest.getInstance("SHA-256");byte[] b=new byte[65536];int n;
                    while((n=stream.read(b))!=-1)check.update(b,0,n);
                    readback=outputHash.equals(NativeVaultArchive.hex(check.digest()));}
            } catch(Exception ignored) { /* Write-only providers cannot earn round-trip proof. */ }
            String status=readback?"EXACT ARCHIVE READBACK VERIFIED":"WRITE REPORTED; READBACK HOLD";
            ownerNotice("CP10 vault backup · "+status,
                "Exported "+bodies.size()+" verified original files.\nArchive SHA-256: "+outputHash+
                "\n"+(readback?"Provider returned the same archive bytes.":"Verify the resulting file independently before relying on this backup.")+
                "\nThe older v0.3 app's private vault was NOT accessed.");
        } catch(Exception e) {ownerNotice("Backup HOLD - verify destination",e.getMessage()+"\nA partial destination file may exist. Do not trust it.");}
    }
    private void launchVaultRestore() {
        new AlertDialog.Builder(this).setTitle("Restore into CP10 TEST vault?")
            .setMessage("Choose a portable CP10 vault archive. All ZIP entries will be SHA-verified before a second explicit confirmation. Existing verified files will not be overwritten.")
            .setPositiveButton("Choose archive",(dialog,which)->{
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/zip");intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivityForResult(intent,PICK_VAULT_ARCHIVE);})
            .setNegativeButton("Cancel",(dialog,which)->{}).show();
    }
    private void inspectVaultArchive(Uri archive) {
        File stage=new File(getCacheDir(),"cp10_stage_"+UUID.randomUUID());
        try {
            if(!stage.mkdir())throw new IllegalStateException("Could not allocate private restoration stage");
            NativeVaultArchive.Staged result;
            try(InputStream input=getContentResolver().openInputStream(archive)){
                if(input==null)throw new IllegalStateException("Archive cannot be opened");
                result=NativeVaultArchive.stage(input,stage);
            }
            JSONObject manifest=new JSONObject(result.manifest);
            if(!NativeVaultArchive.SCHEMA.equals(manifest.optString("schema")))throw new IllegalArgumentException("Wrong vault archive schema");
            if(!"CP10_SIDE_BY_SIDE_TEST_APP_OWN_VAULT_ONLY".equals(manifest.optString("origin"))||manifest.optBoolean("legacy_private_vault_export",true))
                throw new IllegalArgumentException("Archive origin not this independently verified vault family");
            JSONArray rows=manifest.getJSONArray("items");
            ArrayList<String> hashes=new ArrayList<>();ArrayList<Long> sizes=new ArrayList<>();
            for(int i=0;i<rows.length();i++){
                JSONObject item=rows.getJSONObject(i);String sha=item.getString("sha256");long size=item.getLong("size");
                if(!NativeVaultArchive.validHash(sha)||size<0||item.getString("name").length()>240||item.getString("mime").length()>200)
                    throw new IllegalArgumentException("Invalid archive item metadata");
                hashes.add(sha);sizes.add(size);
            }
            NativeVaultArchive.validateMembership(hashes,sizes,result.objects);
            final NativeVaultArchive.Staged ready=result;
            runOnUiThread(() -> {
                if(isFinishing()){deleteStage(stage);return;}
                new AlertDialog.Builder(this).setTitle("Verified backup - restore?")
                    .setMessage(ready.objects.size()+" exact SHA-256 files verified. Add missing objects to this CP10 test vault? Existing bytes and ledger entries are protected. Cancel leaves everything unchanged.")
                    .setPositiveButton("Restore verified copies",(dialog,which)->io.execute(()->commitStagedArchive(ready,stage)))
                    .setNegativeButton("Cancel",(dialog,which)->deleteStage(stage)).setOnCancelListener(dialog->deleteStage(stage)).show();
            });
        } catch(Exception e){deleteStage(stage);ownerNotice("Restore HOLD - no vault edits",e.getMessage());}
    }
    private void commitStagedArchive(NativeVaultArchive.Staged staged,File stage) {
        ArrayList<File> created=new ArrayList<>();
        try {
            JSONObject manifest=new JSONObject(staged.manifest);JSONArray rows=manifest.getJSONArray("items");
            Map<String,NativeVaultArchive.Extracted> stagedByHash=new HashMap<>();
            for(NativeVaultArchive.Extracted item:staged.objects)stagedByHash.put(item.sha,item);
            JSONArray current=readMeta();int initial=current.length();long total=0;
            for(int i=0;i<current.length();i++)total+=current.getJSONObject(i).optLong("size",0);
            ArrayList<JSONObject> next=new ArrayList<>();
            for(int i=0;i<rows.length();i++){
                JSONObject row=rows.getJSONObject(i);String sha=row.getString("sha256");long size=row.getLong("size");
                NativeVaultArchive.Extracted obj=stagedByHash.get(sha);
                if(obj==null||obj.size!=size||!sha.equals(NativeVaultArchive.sha256(obj.file)))throw new IllegalStateException("Staged bytes changed");
                JSONObject exists=findMeta(sha,current);
                if(exists!=null){
                    if(!NativeVaultTruth.verify(vaultDir,exists.optString("stored"),sha,exists.optLong("size",-1)))
                        throw new IllegalStateException("Existing held row requires owner recovery: "+sha);
                    continue;
                }
                if(initial+next.size()+1>MAX_FILES||size>MAX_TOTAL_BYTES-total)
                    throw new IllegalStateException("Restoration would exceed native vault guard");
                total+=size;next.add(row);
            }
            for(JSONObject row:next){
                String sha=row.getString("sha256");NativeVaultArchive.Extracted object=stagedByHash.get(sha);
                String name=row.optString("name","body.bin").replaceAll("[^A-Za-z0-9._-]","_");
                if(name.isEmpty())name="body.bin";if(name.length()>100)name=name.substring(name.length()-100);
                File finalFile=new File(vaultDir,sha+"_cp10_"+name);
                if(finalFile.exists())throw new IllegalStateException("A target file already exists; no overwrite allowed");
                File temp=new File(vaultDir,"cp10_incoming_"+UUID.randomUUID());
                try(InputStream in=new FileInputStream(object.file);FileOutputStream out=new FileOutputStream(temp)){
                    byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)out.write(b,0,n);out.getFD().sync();
                }
                if(temp.length()!=object.size||!sha.equals(NativeVaultArchive.sha256(temp))){
                    temp.delete();throw new IllegalStateException("Temporary copy did not verify");
                }
                if(!temp.renameTo(finalFile)){temp.delete();throw new IllegalStateException("Atomic file commit failed");}
                created.add(finalFile);
                JSONObject meta=new JSONObject();meta.put("id",sha);meta.put("sha256",sha);
                meta.put("name",row.optString("name","body.bin"));meta.put("mime",row.optString("mime","application/octet-stream"));
                meta.put("size",object.size);meta.put("stored",finalFile.getName());meta.put("lastModified",System.currentTimeMillis());
                // No external old-app or provider-source URI is invented.
                current.put(meta);
            }
            writeMeta(current);
            restoreVerifiedVault();
            ownerNotice("CP10 restore committed",created.size()+" exact-byte files added. Existing files preserved. Staged ZIP SHA and manifest verified. The old v0.3 private vault was never accessed.");
        } catch(Exception e){for(File f:created)f.delete();ownerNotice("Restore HOLD - rollback",e.getMessage()+"\nOriginal ledger and existing files were left unchanged.");}
        finally {deleteStage(stage);}
    }
    private void deleteStage(File stage) {
        if(stage==null||!stage.exists())return;
        File[] children=stage.listFiles();if(children!=null)for(File f:children)if(f.isFile())f.delete();stage.delete();
    }

    private void launchFiles() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(intent, PICK_FILES);
    }
    private void launchFolder() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(intent, PICK_FOLDER);
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == CREATE_VAULT_ARCHIVE) {
            if(result==RESULT_OK && data!=null && data.getData()!=null){Uri target=data.getData();io.execute(()->writeVaultArchive(target));}
            return;
        }
        if (request == PICK_VAULT_ARCHIVE) {
            if(result==RESULT_OK && data!=null && data.getData()!=null){Uri source=data.getData();io.execute(()->inspectVaultArchive(source));}
            return;
        }
        if (request == PICK_FILES && pendingWebChooser != null) {
            Uri[] webResult = extractUris(result, data);
            pendingWebChooser.onReceiveValue(webResult);
            pendingWebChooser = null;
            if (result == RESULT_OK && data != null) processFileIntent(data);
            return;
        }
        if (result != RESULT_OK || data == null) return;
        if (request == PICK_FILES) processFileIntent(data);
        if (request == PICK_FOLDER && data.getData() != null) processTree(data.getData(), data.getFlags());
    }

    private Uri[] extractUris(int result, Intent data) {
        if (result != RESULT_OK || data == null) return null;
        ClipData clip = data.getClipData();
        if (clip != null) {
            Uri[] out = new Uri[clip.getItemCount()];
            for (int i=0;i<clip.getItemCount();i++) out[i] = clip.getItemAt(i).getUri();
            return out;
        }
        return data.getData() == null ? null : new Uri[]{data.getData()};
    }

    private void processFileIntent(Intent data) {
        List<Uri> uris = new ArrayList<>();
        if (data.getClipData() != null) for (int i=0;i<data.getClipData().getItemCount();i++) uris.add(data.getClipData().getItemAt(i).getUri());
        else if (data.getData() != null) uris.add(data.getData());
        int flags = data.getFlags();
        for (Uri uri : uris) persist(uri, flags);
        io.execute(() -> importUris(uris, "files"));
    }

    private void processTree(Uri tree, int flags) {
        persist(tree, flags);
        io.execute(() -> {
            try {
                List<Uri> uris = new ArrayList<>();
                collectTree(tree, DocumentsContract.getTreeDocumentId(tree), uris);
                importUris(uris, "files");
            } catch (Exception e) { sendError(e); }
        });
    }

    private void collectTree(Uri tree, String parentId, List<Uri> out) throws Exception {
        if (out.size() >= MAX_FILES) return;
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentId);
        String[] columns = {DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_MIME_TYPE};
        try (Cursor cursor = getContentResolver().query(children, columns, null, null, null)) {
            if (cursor == null) return;
            while (cursor.moveToNext() && out.size() < MAX_FILES) {
                String id = cursor.getString(0); String mime = cursor.getString(1);
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) collectTree(tree, id, out);
                else out.add(DocumentsContract.buildDocumentUriUsingTree(tree, id));
            }
        }
    }

    private void persist(Uri uri, int flags) {
        try {
            int take = flags & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            getContentResolver().takePersistableUriPermission(uri, take & Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) { }
    }

    private void importUris(List<Uri> uris, String event) {
        try {
            JSONArray meta = readMeta();
            long total = 0; for (int i=0;i<meta.length();i++) total += meta.getJSONObject(i).optLong("size",0);
            JSONArray added = new JSONArray();
            for (Uri uri : uris) {
                if (meta.length() >= MAX_FILES || total >= MAX_TOTAL_BYTES) break;
                JSONObject item = copyIntoVault(uri, total);
                if (item == null) continue;
                JSONObject existing = findMeta(item.getString("id"), meta);
                if (existing == null) { meta.put(item); total += item.optLong("size",0); }
                else item = existing;
                added.put(publicMeta(item));
            }
            writeMeta(meta);
            JSONObject payload = new JSONObject(); payload.put("event",event); payload.put("items",added); send(payload);
        } catch (Exception e) { sendError(e); }
    }

    private JSONObject copyIntoVault(Uri uri, long currentTotal) throws Exception {
        ContentResolver resolver = getContentResolver();
        String name = queryName(uri); String mime = resolver.getType(uri);
        if (mime == null) mime = mimeFromName(name);
        File temp = new File(vaultDir, "incoming_" + UUID.randomUUID());
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        long size = 0;
        try {
            try (InputStream in = resolver.openInputStream(uri)) {
                if (in == null) return null;
                try (FileOutputStream output = new FileOutputStream(temp)) {
                    byte[] buffer = new byte[64 * 1024]; int read;
                    while ((read = in.read(buffer)) != -1) {
                        if (currentTotal + size + read > MAX_TOTAL_BYTES) throw new IllegalStateException("Native intake exceeded the 512 MB private-vault guard.");
                        digest.update(buffer,0,read); output.write(buffer,0,read); size += read;
                    }
                    output.getFD().sync();
                }
            }
            String sha = hex(digest.digest()); String id = sha;
            JSONObject existing = findMeta(id);
            if (existing != null && NativeVaultTruth.verify(vaultDir, existing.optString("stored"), sha, existing.optLong("size",-1))) return existing;
            String safe = name == null ? "body.bin" : name.replaceAll("[^A-Za-z0-9._-]", "_");
            if (safe.isEmpty()) safe = "body.bin";
            if (safe.length() > 100) safe = safe.substring(safe.length()-100);
            File target = new File(vaultDir, sha + "_" + safe);
            if (!temp.renameTo(target)) {
                try (FileInputStream input=new FileInputStream(temp);FileOutputStream output=new FileOutputStream(target)) {
                    byte[] b=new byte[65536];int n;while((n=input.read(b))!=-1)output.write(b,0,n);
                    output.getFD().sync();
                }
            }
            if (!NativeVaultTruth.verify(vaultDir, target.getName(), sha, size)) {
                target.delete(); throw new IllegalStateException("Native vault write did not verify.");
            }
            JSONObject item = new JSONObject();
            item.put("id",id); item.put("name",name); item.put("mime",mime); item.put("size",size); item.put("sha256",sha);
            item.put("stored",target.getName()); item.put("lastModified",System.currentTimeMillis()); item.put("sourceUri",uri.toString());
            return item;
        } finally { if (temp.exists()) temp.delete(); }
    }

    private String queryName(Uri uri) {
        try (Cursor c=getContentResolver().query(uri,new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)) {
            if(c!=null&&c.moveToFirst()) return c.getString(0);
        } catch(Exception ignored) { }
        String last=uri.getLastPathSegment(); return last==null?"body.bin":last;
    }
    private String mimeFromName(String name) {
        String ext=MimeTypeMap.getFileExtensionFromUrl(name); String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase(Locale.ROOT));
        return mime==null?"application/octet-stream":mime;
    }

    private JSONArray readMeta() {
        try { return new JSONArray(prefs.getString("items", "[]")); } catch(Exception e) { return new JSONArray(); }
    }
    private void writeMeta(JSONArray items) {
        if(!prefs.edit().putString("items",items.toString()).commit())
            throw new IllegalStateException("Vault ledger write failed: no recovery DING");
    }
    private JSONObject findMeta(String id) { return findMeta(id,readMeta()); }
    private JSONObject findMeta(String id, JSONArray list) {
        try { for(int i=0;i<list.length();i++){JSONObject x=list.getJSONObject(i);if(id.equals(x.optString("id")))return x;} } catch(Exception ignored) { }
        return null;
    }
    private JSONObject publicMeta(JSONObject item) throws Exception {
        JSONObject out=new JSONObject();
        for(String key:new String[]{"id","name","mime","size","sha256","lastModified"}) out.put(key,item.opt(key));
        out.put("url",VAULT_PREFIX+item.getString("id")); return out;
    }
    private static final class VaultResult {
        final JSONArray valid = new JSONArray();
        final JSONArray holds = new JSONArray();
    }
    private VaultResult auditVault() {
        VaultResult result = new VaultResult();
        JSONArray rows = readMeta();
        for (int i=0;i<rows.length();i++) {
            JSONObject row = rows.optJSONObject(i);
            String id = row == null ? "" : row.optString("id", "");
            boolean verified = row != null && id.equals(row.optString("sha256", ""))
                && NativeVaultTruth.verify(vaultDir, row.optString("stored", ""), id, row.optLong("size", -1));
            if (verified) result.valid.put(row);
            else {
                JSONObject hold = new JSONObject();
                try { hold.put("id", id); hold.put("index", i); hold.put("status", "HOLD_UNVERIFIED_BYTES"); } catch (Exception ignored) { }
                result.holds.put(hold);
            }
        }
        return result;
    }
    private void restoreVerifiedVault() {
        try {
            VaultResult audited = auditVault();
            JSONArray items = new JSONArray();
            for (int i=0;i<audited.valid.length();i++) items.put(publicMeta(audited.valid.getJSONObject(i)));
            JSONObject payload = new JSONObject();
            payload.put("event", "restore"); payload.put("items", items);
            payload.put("verification", "SHA256_EXACT_BYTES_THIS_RUN"); payload.put("holds", audited.holds);
            send(payload);
            // Held rows remain in the ledger for explicit owner-led recovery; no silent purge.
        } catch (Exception e) { sendError(e); }
    }

    private void sendItems(String event, JSONArray stored) {
        try { JSONArray items=new JSONArray(); for(int i=0;i<stored.length();i++)items.put(publicMeta(stored.getJSONObject(i))); JSONObject payload=new JSONObject();payload.put("event",event);payload.put("items",items);send(payload); } catch(Exception e){sendError(e);}
    }
    private void clearVaultInternal() {
        File[] files=vaultDir.listFiles(); if(files!=null)for(File f:files)f.delete(); writeMeta(new JSONArray());
        try{JSONObject p=new JSONObject();p.put("event","cleared");send(p);}catch(Exception ignored){}
    }
    private void sendError(Exception e) { try { JSONObject p=new JSONObject();p.put("event","error");p.put("message",e.getMessage()==null?e.getClass().getSimpleName():e.getMessage());send(p); } catch(Exception ignored){} }
    private void send(JSONObject payload) { String quoted=JSONObject.quote(payload.toString()); web.post(() -> web.evaluateJavascript("window.JMNativeReceive("+quoted+")",null)); }
    private static String hex(byte[] bytes) { StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(Locale.ROOT,"%02x",b));return out.toString(); }

    @Override public void onBackPressed() { if(web.canGoBack())web.goBack();else super.onBackPressed(); }
    @Override protected void onDestroy(){ io.shutdownNow(); if(web!=null)web.destroy(); super.onDestroy(); }
}