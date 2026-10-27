package me.jmisjustme.originalstructures;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.AtomicFile;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/** JM-owned native vessel; embeds the protected CP07.3 HTML without rewriting its organs.
 * Owns private AtomicFile custody only, and dispatches no network or third-party APIs.
 * Never treats a native WebView as an independent JM coding runtime.
 */
public final class MainActivity extends Activity {
    private static final String ORIGIN="https://appassets.androidplatform.net/assets/index.html";
    private static final String SNAP_SCHEMA="JM.NativeSnapshot/0.1";
    private static final String APP_SCHEMA="JM.OriginalStructures.BrowserCP01/1";
    private static final int MAX_BYTES=950_000, FILE_PICK=51, EXPORT_PICK=52;
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final Runnable flush=()->snapshot(false);
    private WebView browser;
    private TextView status;
    private AtomicFile storage;
    private boolean ready=false, saving=false, pending=false;
    private ValueCallback<Uri[]> fileCallback;
    private String queuedExport;

    private String sha(byte[] bytes){
        try { byte[] digest=MessageDigest.getInstance("SHA-256").digest(bytes);
            StringBuilder b=new StringBuilder();for(byte x:digest)b.append(String.format(Locale.ROOT,"%02x",x&255));return b.toString();
        }catch(Exception e){throw new IllegalStateException("SHA-256 unavailable",e);}
    }
    private static String value(String js){
        try { Object v=new JSONTokener(js).nextValue();return v==JSONObject.NULL?null:String.valueOf(v); }
        catch(Exception ignored){return null;}
    }
    private void display(String msg){status.setText(msg);}
    private void notice(String msg){Toast.makeText(this,msg,Toast.LENGTH_LONG).show();}
    private void error(String context,Exception e){display("HOLD · "+context+": "+e.getMessage());}
    private Button button(LinearLayout bar,String label,Runnable action){
        Button b=new Button(this);b.setText(label);b.setTextSize(10);
        b.setTextColor(Color.WHITE);b.setAllCaps(false);
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,46,1);
        bar.addView(b,p);b.setOnClickListener(v->action.run());return b;
    }
    @Override public void onCreate(Bundle state){super.onCreate(state);
        storage=new AtomicFile(new File(getFilesDir(),"jm_original_checkpoint.json"));
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(5,13,25));
        LinearLayout bar=new LinearLayout(this);bar.setOrientation(LinearLayout.HORIZONTAL);
        button(bar,"Save",()->snapshot(true));
        button(bar,"Verify",this::verifyNative);
        button(bar,"Restore",this::restoreNative);
        button(bar,"Export",this::exportNative);
        root.addView(bar,new LinearLayout.LayoutParams(-1,48));
        status=new TextView(this);status.setTextColor(Color.rgb(163,232,216));status.setTextSize(11);status.setGravity(Gravity.CENTER_VERTICAL);
        status.setPadding(12,0,8,0);display("JM NATIVE · protected workroom loading");
        root.addView(status,new LinearLayout.LayoutParams(-1,33));
        browser=new WebView(this);
        browser.setBackgroundColor(Color.rgb(5,13,25));browser.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s=browser.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        browser.addJavascriptInterface(new LocalSignal(),"JMNativeBridge");
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
          .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        browser.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
                return !r.getUrl().toString().startsWith("https://appassets.androidplatform.net/assets/");
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
                WebResourceResponse served=loader.shouldInterceptRequest(r.getUrl());
                return served!=null?served:new WebResourceResponse("text/plain","UTF-8",
                    new ByteArrayInputStream("blocked external resource".getBytes(StandardCharsets.UTF_8)));
            }
            @Override public void onPageFinished(WebView v,String url){
                if(!ORIGIN.equals(url)){display("HOLD · unexpected page origin");return;}
                // The bridge can signal a write only; its method accepts no filename,
                // bytes, arbitrary command or network destination. Android reads JM's
                // own state from the trusted bundled main-frame after the signal.
                String js="(function(){if(!window.JMNativeBridge||window.__jmNativeHook)return;"+
                  "window.__jmNativeHook=true;const nativePriorSave=save;"+
                  "save=function(){nativePriorSave();window.JMNativeBridge.dirty();};"+
                  "window.JMNativeBridge.ready();return 'JM native save hook installed';})()";
                v.evaluateJavascript(js,x->{ready=true;display("JM NATIVE · offline workroom · protected private vault");reviewColdRecovery();});
            }
        });
        browser.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);
                fileCallback=callback;
                Intent choose=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                choose.addCategory(Intent.CATEGORY_OPENABLE);choose.setType("*/*");
                choose.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try{startActivityForResult(choose,FILE_PICK);return true;}
                catch(Exception e){fileCallback=null;return false;}
            }
        });
        root.addView(browser,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        browser.loadUrl(ORIGIN);
    }
    private final class LocalSignal {
        @JavascriptInterface public void dirty(){ui.post(()->{if(!ready)return;ui.removeCallbacks(flush);ui.postDelayed(flush,550);});}
        @JavascriptInterface public void ready(){ui.post(()->display("JM Native WebView · Workroom loaded"));}
    }
    private void snapshot(boolean owner){
        if(!ready){if(owner)notice("App still loading");return;}
        if(saving){pending=true;return;}
        saving=true;
        browser.evaluateJavascript("(function(){try{return JSON.stringify(state)}catch(e){return null}})()",raw->{
            try {
                String data=value(raw);
                if(data==null)throw new IllegalStateException("WebView state not readable");
                byte[] bytes=data.getBytes(StandardCharsets.UTF_8);
                if(bytes.length>MAX_BYTES)throw new IllegalArgumentException("snapshot exceeds private vault bound");
                JSONObject body=new JSONObject(data);
                if(!APP_SCHEMA.equals(body.optString("schema")))throw new IllegalArgumentException("incorrect JM source schema");
                // Native snapshot stores exact source JSON and checks its bytes
                // again after an atomic replace, not a decorative success toast.
                JSONObject record=new JSONObject();record.put("schema",SNAP_SCHEMA);
                record.put("sha256",sha(bytes));record.put("source",data);
                record.put("savedUtcMs",System.currentTimeMillis());
                byte[] payload=record.toString().getBytes(StandardCharsets.UTF_8);
                FileOutputStream stream=null;
                try{stream=storage.startWrite();stream.write(payload);stream.getFD().sync();storage.finishWrite(stream);}
                catch(Exception e){if(stream!=null)storage.failWrite(stream);throw e;}
                String recheck=readSnapshot();if(!data.equals(recheck))throw new IllegalStateException("native readback mismatch");
                display("NATIVE SAVED · "+sha(bytes).substring(0,15)+" · "+bytes.length+" bytes");
                if(owner)notice("JM native snapshot saved and byte-checked");
            }catch(Exception e){error("native snapshot",e);}
            finally{saving=false;if(pending){pending=false;ui.removeCallbacks(flush);ui.postDelayed(flush,350);}}
        });
    }
    private String readSnapshot()throws Exception{
        byte[] raw=storage.readFully();if(raw.length>MAX_BYTES+20_000)throw new IllegalArgumentException("oversized stored record");
        JSONObject record=new JSONObject(new String(raw,StandardCharsets.UTF_8));
        if(!SNAP_SCHEMA.equals(record.optString("schema")))throw new IllegalArgumentException("invalid native record schema");
        String data=record.getString("source"),digest=record.getString("sha256");
        if(data.getBytes(StandardCharsets.UTF_8).length>MAX_BYTES||!sha(data.getBytes(StandardCharsets.UTF_8)).equals(digest))
            throw new IllegalArgumentException("HOLD: stored bytes failed SHA-256 verification");
        if(!APP_SCHEMA.equals(new JSONObject(data).optString("schema")))
            throw new IllegalArgumentException("HOLD: wrong JM workspace schema");
        return data;
    }
    private void verifyNative(){
        try{String text=readSnapshot();display("VERIFIED NATIVE VAULT · "+sha(text.getBytes(StandardCharsets.UTF_8)).substring(0,18));notice("Native readback and SHA-256 PASS");}
        catch(Exception e){error("verify",e);}
    }
    private void reviewColdRecovery(){
        try{
            String data=readSnapshot();
            browser.evaluateJavascript("(function(){return JSON.stringify(state)})()",now->{
                String active=value(now);
                if(data.equals(active)){display("NATIVE RECOVERED · current state matches private vault");return;}
                new AlertDialog.Builder(this).setTitle("Recover JM native checkpoint?")
                    .setMessage("A checksum-verified private JM snapshot exists. Choose Restore to recover it into the workroom. Keep current preserves the live browser state. Neither option deletes the saved snapshot.")
                    .setNegativeButton("Keep current",(d,w)->display("JM READY · private vault retained"))
                    .setPositiveButton("Restore",(d,w)->applyRestore(data)).show();
            });
        }catch(Exception missing){display("JM READY · native vault empty or HOLD · use Save to create first snapshot");}
    }
    private void restoreNative(){try{String text=readSnapshot();new AlertDialog.Builder(this)
        .setTitle("Recover checked JM snapshot?")
        .setMessage("Recover private saved workspace into the live app? Current unsaved browser changes will be replaced only after validation. Export if you need both versions.")
        .setNegativeButton("Cancel",null).setPositiveButton("Restore",(d,w)->applyRestore(text)).show();
        }catch(Exception e){error("restore",e);}}
    private void applyRestore(String text){
        if(!ready){display("HOLD · browser not ready");return;}
        // Fail closed: normalise FIRST; do not mutate if schema or task/graph
        // custodial checks fail. Use the existing app's own normalization law.
        String js="(function(){try{const next=normalize(JSON.parse("+JSONObject.quote(text)+"));"+
          "state=next;lastAnalysis=null;selectedKnowledgeId=null;save();"+
          "body();knowledgeUI();graphUI();routeUI();executionUI();pipelineUI();batchUI();workerUI();"+
          "return 'RESTORED:'+hash(JSON.stringify(state));"+
          "}catch(e){return 'HOLD:'+e.message;}})()";
        browser.evaluateJavascript(js,reply->{String result=value(reply);
            if(result!=null&&result.startsWith("RESTORED:")){
                display("NATIVE RESTORE VERIFIED · "+result.substring(9,Math.min(result.length(),25)));
                notice("JM native checkpoint recovered after app validation");
            }else display("HOLD · native restore: "+result);
        });
    }
    private void exportNative(){try{queuedExport=readSnapshot();Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
          intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");
          intent.putExtra(Intent.EXTRA_TITLE,"JM_ORIGINAL_STRUCTURES_NATIVE_BACKUP.json");
          startActivityForResult(intent,EXPORT_PICK);
        }catch(Exception e){error("export",e);}}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
        if(request==FILE_PICK){if(fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}return;}
        if(request==EXPORT_PICK){if(result==RESULT_OK&&data!=null&&data.getData()!=null&&queuedExport!=null){
            try(OutputStream out=getContentResolver().openOutputStream(data.getData(),"w")){
                if(out==null)throw new IllegalStateException("Document provider denied output");
                out.write(queuedExport.getBytes(StandardCharsets.UTF_8));out.flush();notice("Portable JM JSON backup exported");
            }catch(Exception e){error("export document",e);}}
            queuedExport=null;
        }
    }
    @Override public void onBackPressed(){
        if(browser==null){super.onBackPressed();return;}
        browser.evaluateJavascript("(function(){try{return window.JMFinish&&window.JMFinish.navBack()?'handled':'root'}catch(e){return 'root'}})()",v->{
            if(!"handled".equals(value(v)))new AlertDialog.Builder(this).setTitle("Leave JM Original Structures?")
              .setMessage("Your source remains in the private JM checkpoint after saving. Use Save before closing if you've made fresh changes.")
              .setNegativeButton("Stay",null)
              .setPositiveButton("Save and close",(d,w)->{snapshot(true); /* Owner can then press Home */ }).show();
        });
    }
    @Override protected void onPause(){ui.removeCallbacks(flush);snapshot(false);super.onPause();}
    @Override protected void onDestroy(){ui.removeCallbacks(flush);if(browser!=null){browser.destroy();browser=null;}super.onDestroy();}
}