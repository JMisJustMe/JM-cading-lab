package com.jmisjustme.estatesteward;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.MediaStore;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class MainActivity extends Activity {
    private static final int PICK_FILES=4209;
    private WebView web;
    private ValueCallback<Uri[]> callback;
    private final ArrayList<JSONObject> exports=new ArrayList<>();
    private SharedPreferences prefs;
    private static int dp(Activity a,int n){return Math.round(n*a.getResources().getDisplayMetrics().density);}

    @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(7,19,31));getWindow().setNavigationBarColor(Color.rgb(7,19,31));prefs=getSharedPreferences("native_exports",MODE_PRIVATE);loadExports();
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(7,19,31));
        LinearLayout bar=new LinearLayout(this);bar.setGravity(Gravity.CENTER_VERTICAL);bar.setPadding(dp(this,12),dp(this,5),dp(this,8),dp(this,5));bar.setBackgroundColor(Color.rgb(10,27,42));
        TextView title=new TextView(this);title.setText("JM Steward · v0.9B Native Border");title.setTextColor(Color.WHITE);title.setTextSize(15);title.setSingleLine();bar.addView(title,new LinearLayout.LayoutParams(0,dp(this,44),1));
        Button shelf=new Button(this);shelf.setText("Receipts");shelf.setAllCaps(false);shelf.setOnClickListener(v->showShelf());bar.addView(shelf,new LinearLayout.LayoutParams(dp(this,108),dp(this,44)));root.addView(bar);
        web=new WebView(this);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(true);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);web.addJavascriptInterface(new Bridge(),"JMNative");
        web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();if("file".equals(u.getScheme())||"about".equals(u.getScheme()))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){Toast.makeText(MainActivity.this,"No app can open this route",Toast.LENGTH_SHORT).show();}return true;}});
        web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> c,FileChooserParams p){if(callback!=null)callback.onReceiveValue(null);callback=c;try{Intent i=p.createIntent();i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,PICK_FILES);return true;}catch(Exception e){callback=null;return false;}}});
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);web.loadUrl("file:///android_asset/index.html");}

    private final class Bridge {
        @JavascriptInterface public String saveText(String requested,String text,String mime){JSONObject out=new JSONObject();try{String name=sanitize(requested);ContentValues v=new ContentValues();v.put(MediaStore.Downloads.DISPLAY_NAME,name);v.put(MediaStore.Downloads.MIME_TYPE,mime==null?"application/json":mime);v.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/JM Estate Storage Steward");v.put(MediaStore.Downloads.IS_PENDING,1);Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);if(uri==null)throw new IOException("Downloads route unavailable");try(OutputStream os=getContentResolver().openOutputStream(uri)){if(os==null)throw new IOException("Destination unavailable");os.write((text==null?"":text).getBytes(StandardCharsets.UTF_8));}v.clear();v.put(MediaStore.Downloads.IS_PENDING,0);getContentResolver().update(uri,v,null,null);JSONObject row=new JSONObject().put("name",name).put("uri",uri.toString()).put("mime",mime).put("savedAt",System.currentTimeMillis());exports.add(0,row);saveExports();runOnUiThread(()->Toast.makeText(MainActivity.this,"Saved permanently: "+name,Toast.LENGTH_SHORT).show());return out.put("ok",true).put("name",name).put("uri",uri.toString()).put("shelf","Downloads/JM Estate Storage Steward").toString();}catch(Exception e){try{return out.put("ok",false).put("error",String.valueOf(e.getMessage())).toString();}catch(Exception ignored){return "{\"ok\":false}";}}}
        @JavascriptInterface public void openReceiptShelf(){runOnUiThread(()->showShelf());}
        @JavascriptInterface public int receiptCount(){return exports.size();}
    }

    private static String sanitize(String s){String n=s==null?"JM_STEWARD_RECEIPT.json":s.trim().replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]","_").replaceAll("\\s+","_");while(n.startsWith("."))n=n.substring(1);if(n.isEmpty())n="JM_STEWARD_RECEIPT.json";return n.length()>120?n.substring(n.length()-120):n;}
    private void loadExports(){exports.clear();try{JSONArray a=new JSONArray(prefs.getString("rows","[]"));for(int i=0;i<a.length();i++)exports.add(a.getJSONObject(i));}catch(Exception ignored){}}
    private void saveExports(){JSONArray a=new JSONArray();for(JSONObject o:exports)a.put(o);prefs.edit().putString("rows",a.toString()).apply();}
    private void showShelf(){if(exports.isEmpty()){new AlertDialog.Builder(this).setTitle("Native receipt shelf").setMessage("No native exports yet. Export from the Steward and they will remain in Downloads/JM Estate Storage Steward.").setPositiveButton("OK",null).show();return;}String[] names=new String[exports.size()];for(int i=0;i<names.length;i++)names[i]=exports.get(i).optString("name");new AlertDialog.Builder(this).setTitle("Native receipt shelf · "+names.length).setItems(names,(d,which)->openExport(exports.get(which))).setNegativeButton("Close",null).show();}
    private void openExport(JSONObject row){try{Uri u=Uri.parse(row.getString("uri"));Intent i=new Intent(Intent.ACTION_VIEW).setDataAndType(u,row.optString("mime","application/octet-stream")).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(i);}catch(Exception e){Toast.makeText(this,"Receipt route unavailable; file remains in Downloads",Toast.LENGTH_LONG).show();}}
    @Override protected void onActivityResult(int r,int result,Intent data){super.onActivityResult(r,result,data);if(r==PICK_FILES&&callback!=null){callback.onReceiveValue(result==RESULT_OK?WebChromeClient.FileChooserParams.parseResult(result,data):null);callback=null;}}
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("JMNative");web.destroy();}super.onDestroy();}
}
