package com.jmisjustme.foldultra;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.Toast;
import android.app.AlertDialog;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.security.MessageDigest;
import java.util.Locale;

/** Owner-approved media intake. Private copy, bounded bytes and exact digest.
 *  Never fetches Galaxy AI data or background files without a user action.
 */
public final class JMIntakeV1 {
  public static final int MAX_BYTES=2*1024*1024, LIMIT=12;
  static final String KEY="jm.intake.registry";
  private JMIntakeV1(){}
  static String type(String mime){
    if(mime==null)return "";
    if(mime.equals("image/png"))return ".png";
    if(mime.equals("image/jpeg"))return ".jpg";
    if(mime.equals("image/webp"))return ".webp";
    if(mime.equals("application/pdf"))return ".pdf";
    if(mime.equals("text/plain"))return ".txt";
    return "";
  }
  public static JSONArray validateRegistry(JSONArray input)throws Exception{
    if(input==null||input.length()>LIMIT)throw new IllegalArgumentException("JM intake registry over limit");
    JSONArray a=new JSONArray();java.util.HashSet<String> ids=new java.util.HashSet<>();
    for(int i=0;i<input.length();i++){
      JSONObject x=input.getJSONObject(i);
      String sha=x.getString("sha256"),mime=x.getString("mime"),project=x.getString("project");
      if(!sha.matches("[0-9a-f]{64}")||type(mime).isEmpty()||
         project.length()>64||!ids.add(sha))throw new IllegalArgumentException("Invalid JM intake metadata");
      int bytes=x.getInt("bytes");
      if(bytes<1||bytes>MAX_BYTES)throw new IllegalArgumentException("JM intake exceeds limit");
      a.put(new JSONObject().put("sha256",sha).put("mime",mime)
        .put("project",project).put("bytes",bytes).put("epoch_ms",x.getLong("epoch_ms")));
    }
    return a;
  }
  public static JSONArray registry(SharedPreferences sp)throws Exception{
    return validateRegistry(new JSONArray(sp.getString(KEY,"[]")));
  }
  static File store(Activity a){return new File(a.getFilesDir(),"jm_intake");}
  static String hex(byte[] b){
    StringBuilder out=new StringBuilder();
    for(byte x:b)out.append(String.format(Locale.ROOT,"%02x",x&255));
    return out.toString();
  }
  public static void review(Activity a,SharedPreferences sp,Uri uri,String suppliedMime,Runnable repaint){
    if(uri==null||!"content".equals(uri.getScheme())){
      Toast.makeText(a,"HOLD · Only owner-selected content URIs supported",Toast.LENGTH_LONG).show();return;
    }
    String mime=suppliedMime;
    if(mime==null||mime.isEmpty()||"*/*".equals(mime))mime=a.getContentResolver().getType(uri);
    final String acceptedMime=mime;
    if(type(acceptedMime).isEmpty()){
      Toast.makeText(a,"HOLD · Unsupported content type",Toast.LENGTH_LONG).show();return;
    }
    String project=ProjectShelf.selected(sp);
    new AlertDialog.Builder(a).setTitle("JM / Owner-selected creative intake")
      .setMessage("Save a PRIVATE copy (maximum 2 MiB) into JM for project: "+project+
        "\nType: "+acceptedMime+"\n\nOriginal bytes and SHA-256 will be preserved. "+
        "The copy is LOCAL ONLY: exporting JM settings does NOT export these media files. "+
        "External sources and AI claims remain unverified. No content is saved unless you approve.")
      .setNegativeButton("Cancel",null)
      .setPositiveButton("SAVE LOCAL COPY",(d,w)->{
        try{
          JSONObject saved=copy(a,sp,uri,acceptedMime);
          Toast.makeText(a,"JM intake saved: "+saved.getInt("bytes")+" bytes",Toast.LENGTH_LONG).show();
          if(repaint!=null)repaint.run();
        }catch(Exception ex){
          new AlertDialog.Builder(a).setTitle("HOLD · Creative intake not saved")
            .setMessage(ex.getMessage()).setPositiveButton("OK",null).show();
        }
      }).show();
  }
  public static JSONObject copy(Activity a,SharedPreferences sp,Uri uri,String mime)throws Exception{
    if(type(mime).isEmpty())throw new IOException("Unsupported type");
    JSONArray current=registry(sp);
    byte[] data;
    try(InputStream in=a.getContentResolver().openInputStream(uri);
        ByteArrayOutputStream out=new ByteArrayOutputStream()){
      if(in==null)throw new IOException("No content access");
      byte[] b=new byte[8192];int n;
      while((n=in.read(b))!=-1){
        if(out.size()+n>MAX_BYTES)throw new IOException("Content over 2 MiB; no copy saved");
        out.write(b,0,n);
      }
      data=out.toByteArray();
    }
    if(data.length==0)throw new IOException("Empty content");
    String sha=hex(MessageDigest.getInstance("SHA-256").digest(data));
    for(int i=0;i<current.length();i++)
      if(sha.equals(current.getJSONObject(i).getString("sha256")))
        throw new IOException("Original already retained in JM intake");
    if(current.length()>=LIMIT)throw new IOException("12-item limit: export and remove an earlier copy");
    File dir=store(a);
    if(!dir.exists()&&!dir.mkdirs())throw new IOException("Private intake directory unavailable");
    File finalFile=new File(dir,sha+type(mime)),tmp=new File(dir,sha+".tmp");
    try(FileOutputStream out=new FileOutputStream(tmp)){
      out.write(data);out.getFD().sync();
    }
    if(!tmp.renameTo(finalFile)){tmp.delete();throw new IOException("Atomic private save failed");}
    JSONObject metadata=new JSONObject().put("sha256",sha).put("mime",mime)
      .put("project",ProjectShelf.selected(sp)).put("bytes",data.length)
      .put("epoch_ms",System.currentTimeMillis());
    current.put(metadata);
    try{
      if(!sp.edit().putString(KEY,validateRegistry(current).toString()).commit())
        throw new IOException("Intake registry commit failed");
    }catch(Exception e){finalFile.delete();throw e;}
    return metadata;
  }
  public static File checked(Activity a,JSONObject metadata)throws Exception{
    String sha=metadata.getString("sha256");
    File f=new File(store(a),sha+type(metadata.getString("mime")));
    if(!f.isFile()||f.length()!=metadata.getInt("bytes"))
      throw new IOException("Original JM intake bytes unavailable");
    try(FileInputStream in=new FileInputStream(f)){
      MessageDigest hash=MessageDigest.getInstance("SHA-256");byte[] b=new byte[8192];int n;
      while((n=in.read(b))!=-1)hash.update(b,0,n);
      if(!hex(hash.digest()).equals(sha))throw new IOException("JM intake SHA mismatch");
    }
    return f;
  }
  public static void forget(Activity a,SharedPreferences sp,JSONObject row)throws Exception{
    JSONArray current=registry(sp),next=new JSONArray();
    for(int i=0;i<current.length();i++){
      JSONObject item=current.getJSONObject(i);
      if(!item.getString("sha256").equals(row.getString("sha256")))next.put(item);
    }
    if(!sp.edit().putString(KEY,next.toString()).commit())
      throw new IOException("Intake registry update failed");
    File f=new File(store(a),row.getString("sha256")+type(row.getString("mime")));
    if(f.exists()&&!f.delete())throw new IOException("Metadata deleted but private file still exists");
  }
}
