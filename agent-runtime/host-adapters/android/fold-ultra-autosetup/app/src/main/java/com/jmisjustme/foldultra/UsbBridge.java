package com.jmisjustme.foldultra;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * USB-only, debug-build ADB contact with explicit owner approval.
 * ADB run-as stages a file INSIDE this app's private files directory.
 * Never polls a socket, requests a permission, or applies silently.
 */
public final class UsbBridge {
    public static final String REQUEST_SCHEMA="JM.FoldBridgeRequest/0.5";
    public static final String CONFIG_SCHEMA="JM.FoldUltraSetup/0.5";
    private static final String REQUEST="bridge_request.json";
    private static final String RECEIPT="bridge_receipt.json";
    private static final String SNAPSHOT="bridge_snapshot.json";
    private static final String ROLLBACK="bridge_rollback.json";
    private static final int MAX_BYTES=65536;
    private static boolean dialogOpen=false;
    private UsbBridge(){}

    static File path(Activity a,String name){return new File(a.getFilesDir(),name);}

    static String read(Activity a,String filename) throws Exception {
        File file=path(a,filename);
        if(!file.isFile())throw new FileNotFoundException(filename);
        if(file.length()>MAX_BYTES)throw new IOException("File above 64 KiB boundary");
        try(InputStream in=new FileInputStream(file);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] b=new byte[2048];int n;
            while((n=in.read(b))!=-1){
                if(out.size()+n>MAX_BYTES)throw new IOException("File above 64 KiB boundary");
                out.write(b,0,n);
            }
            return out.toString("UTF-8");
        }
    }
    static void write(Activity a,String filename,String value) throws Exception{
        byte[] bytes=value.getBytes(StandardCharsets.UTF_8);
        if(bytes.length>MAX_BYTES)throw new IOException("Payload exceeds 64 KiB");
        File temporary=path(a,filename+".tmp");
        try(FileOutputStream out=new FileOutputStream(temporary)){
            out.write(bytes);out.getFD().sync();
        }
        File dest=path(a,filename);
        if(!temporary.renameTo(dest)){
            if(!dest.delete() || !temporary.renameTo(dest))
                throw new IOException("Atomic receipt write failed");
        }
    }
    private static String sha(String value)throws Exception{
        byte[] digest=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder out=new StringBuilder();
        for(byte b:digest)out.append(String.format(Locale.ROOT,"%02x",b&255));
        return out.toString();
    }
    private static boolean focus(String s){
        return "CREATE".equals(s)||"PLAY".equals(s)||"EVERYDAY".equals(s);
    }
    private static boolean session(String s){
        return "MAKE".equals(s)||"PLAYTEST".equals(s)||"RESEARCH".equals(s)||"RECOVERY".equals(s);
    }
    private static boolean group(String s){
        return "ASSIST".equals(s)||"CREATE".equals(s)||"WORK".equals(s);
    }
    private static final String[] KEYS={"now_nudge","now_brief","assistants","photo_assist",
        "scanner","multi_window","dex","routines"};

    static JSONObject configuration(SharedPreferences sp)throws Exception{
        JSONObject o=new JSONObject();
        o.put("schema",CONFIG_SCHEMA);
        o.put("root",sp.getString("root",""));
        o.put("focus",sp.getString("focus","CREATE"));
        o.put("session",sp.getString("session","MAKE"));
        o.put("ready",sp.getBoolean("ready",false));
        o.put("stage",sp.getInt("stage",0));
        o.put("native_group",sp.getString("native.group","ASSIST"));
        JSONObject nativeMarks=new JSONObject();
        for(String key:KEYS)nativeMarks.put(key,sp.getBoolean("tried."+key,false));
        o.put("native_owner_marks",nativeMarks);
        JSONObject owners=new JSONObject();
        owners.put("compact",sp.getBoolean("owner.compact_tested",false));
        owners.put("expanded",sp.getBoolean("owner.expanded_tested",false));
        owners.put("reopen",sp.getBoolean("owner.reopen_tested",false));
        o.put("owner_test_marks",owners);
        o.put("usb_snapshot_requires_owner_approval",true);
        return o;
    }
    private static JSONObject validateConfig(JSONObject o)throws Exception{
        String schema=o.optString("schema","");
        if(!(CONFIG_SCHEMA.equals(schema)
            ||"JM.FoldUltraSetup/0.4".equals(schema)
            ||"JM.FoldUltraSetup/0.3".equals(schema)
            ||"JM.FoldUltraSetup/0.2".equals(schema)))
            throw new IllegalArgumentException("Unknown config schema");
        if(!o.has("root")||!(o.get("root") instanceof String))
            throw new IllegalArgumentException("Root note must be text");
        String root=o.getString("root");
        if(root.length()>10000)throw new IllegalArgumentException("Root note over 10000 chars");
        String f=o.optString("focus","CREATE");
        if(!focus(f))throw new IllegalArgumentException("Unknown focus");
        String s=o.optString("session","MAKE");
        if(!session(s))throw new IllegalArgumentException("Unknown session");
        int step=o.optInt("stage",0);
        if(step<0||step>4)throw new IllegalArgumentException("Bad prelaunch stage");
        String category=o.optString("native_group","ASSIST");
        if(!group(category))throw new IllegalArgumentException("Unknown native group");
        for(String key:new String[]{"native_owner_marks","owner_test_marks"}){
            Object value=o.opt(key);
            if(value!=null && value!=JSONObject.NULL && !(value instanceof JSONObject))
                throw new IllegalArgumentException("Invalid "+key);
        }
        return o;
    }
    static void applyConfig(SharedPreferences sp,JSONObject o)throws Exception{
        validateConfig(o);
        SharedPreferences.Editor e=sp.edit();
        e.putString("root",o.getString("root"));
        e.putString("focus",o.optString("focus","CREATE"));
        e.putString("session",o.optString("session","MAKE"));
        e.putBoolean("ready",o.optBoolean("ready",false));
        e.putInt("stage",o.optInt("stage",0));
        e.putString("native.group",o.optString("native_group","ASSIST"));
        JSONObject marks=o.optJSONObject("native_owner_marks");
        if(marks!=null)for(String key:KEYS){
            if(marks.has(key))e.putBoolean("tried."+key,marks.optBoolean(key,false));
        }
        JSONObject owners=o.optJSONObject("owner_test_marks");
        if(owners!=null)for(String key:new String[]{"compact","expanded","reopen"}){
            if(owners.has(key))e.putBoolean("owner."+key+"_tested",owners.optBoolean(key,false));
        }
        if(!e.commit())throw new IOException("Local settings commit failed");
    }
    private static void receipt(Activity a,String id,String status,String kind,String detail){
        try{
            JSONObject out=new JSONObject();
            out.put("schema","JM.FoldBridgeReceipt/0.5");
            out.put("request_id",id);
            out.put("status",status);
            out.put("kind",kind);
            out.put("detail",detail);
            out.put("timestamp_epoch_ms",System.currentTimeMillis());
            out.put("no_system_settings_changed",true);
            write(a,RECEIPT,out.toString(2));
        }catch(Exception e){Toast.makeText(a,"HOLD · USB receipt could not be saved",Toast.LENGTH_LONG).show();}
    }
    public static void offer(Activity a,SharedPreferences sp,Runnable repaint){
        if(dialogOpen)return;
        File file=path(a,REQUEST);
        if(!file.isFile())return;
        dialogOpen=true;
        String id="UNVALIDATED",kind="UNVALIDATED";
        try{
            // Claim a request exactly once; no unattended retry or replay.
            String raw=read(a,REQUEST);
            if(!file.delete())throw new IOException("Cannot safely consume staging request");
            JSONObject request=new JSONObject(raw);
            if(!REQUEST_SCHEMA.equals(request.optString("schema")))
                throw new IllegalArgumentException("Unrecognised bridge request schema");
            id=request.optString("request_id","");
            if(!id.matches("[0-9a-f]{16,64}"))
                throw new IllegalArgumentException("Request ID must be 16–64 lowercase hex characters");
            kind=request.optString("kind","");
            final String action=kind,requestId=id;
            final JSONObject config;
            final String preview;
            if("profile".equals(kind)){
                String candidate=request.optString("session","");
                if(!session(candidate))throw new IllegalArgumentException("Invalid session");
                String f=request.optString("focus","");
                if(!focus(f))throw new IllegalArgumentException("Invalid focus");
                config=null;
                preview="JM-only route change\n\nSession: "+candidate+"\nFocus: "+f+
                    "\n\nNo Samsung settings, permissions, apps or home pages will be changed.";
            }else if("restore".equals(kind)){
                config=validateConfig(request.getJSONObject("config"));
                String root=config.getString("root");
                preview="Restore local JM configuration?\n\n"+
                    "Focus: "+config.optString("focus","CREATE")+
                    "\nSession: "+config.optString("session","MAKE")+
                    "\nRoot length: "+root.length()+" chars"+
                    "\nRoot SHA-256: "+sha(root).substring(0,16)+"…"+
                    "\n\nOnly JM app-local data will change. The previous JM configuration will be kept as a rollback snapshot.";
            }else throw new IllegalArgumentException("Only profile and restore are supported");
            final JSONObject requestBody=request;
            receipt(a,id,"PENDING",kind,"Awaiting owner touch on Android");
            new AlertDialog.Builder(a)
                .setTitle("JM USB CONTACT · OWNER APPROVAL")
                .setMessage("A connected computer staged a request. USB debugging alone does NOT authorise changes.\n\n"+
                    preview+"\n\nOnly approve a request you initiated.")
                .setCancelable(false)
                .setNegativeButton("REJECT",(d,w)->{
                    receipt(a,requestId,"REJECTED",action,"Owner rejected request");
                    dialogOpen=false;repaint.run();
                })
                .setPositiveButton("APPLY",(d,w)->{
                    try{
                        JSONObject previous=configuration(sp);
                        if("profile".equals(action)){
                            // Both validated before any local mutation.
                            SharedPreferences.Editor editor=sp.edit()
                                .putString("session",requestBody.getString("session"))
                                .putString("focus",requestBody.getString("focus"));
                            if(!editor.commit())throw new IOException("Settings commit failed");
                        }else{
                            // Prepare reversible rollback before any import.
                            write(a,ROLLBACK,previous.toString(2));
                            applyConfig(sp,config);
                        }
                        receipt(a,requestId,"ACCEPTED",action,
                            "Owner-approved app-local change; Samsung launcher unchanged");
                        Toast.makeText(a,"JM USB contact accepted",Toast.LENGTH_LONG).show();
                    }catch(Exception e){
                        receipt(a,requestId,"HOLD",action,
                            "Apply failed; verify current local configuration");
                        new AlertDialog.Builder(a).setTitle("HOLD · USB change not confirmed")
                            .setMessage(e.getMessage()).setPositiveButton("OK",null).show();
                    }finally{dialogOpen=false;repaint.run();}
                }).show();
        }catch(Exception e){
            file.delete();
            receipt(a,id,"INVALID",kind,"Staged request failed validation; no settings applied");
            Toast.makeText(a,"HOLD · Invalid USB request: "+e.getMessage(),Toast.LENGTH_LONG).show();
            dialogOpen=false;
        }
    }
    public static void prepareSnapshot(Activity a,SharedPreferences sp){
        new AlertDialog.Builder(a).setTitle("Prepare USB recovery snapshot?")
            .setMessage("Save your JM app settings—including your full root note—to app-private storage for your authorised USB-debugging computer to retrieve. Anyone with trusted ADB access to this debug app can read that snapshot. Use a trusted laptop and protect the exported file.")
            .setNegativeButton("Cancel",null)
            .setPositiveButton("PREPARE",(d,w)->{
                try{
                    JSONObject o=configuration(sp);
                    write(a,SNAPSHOT,o.toString(2));
                    Toast.makeText(a,"JM snapshot ready for USB pull",Toast.LENGTH_LONG).show();
                }catch(Exception e){
                    new AlertDialog.Builder(a).setTitle("HOLD · No export")
                        .setMessage(e.getMessage()).setPositiveButton("OK",null).show();
                }
            }).show();
    }
    public static void rollback(Activity a,SharedPreferences sp,Runnable repaint){
        if(!path(a,ROLLBACK).isFile()){
            Toast.makeText(a,"No prior USB restore snapshot",Toast.LENGTH_LONG).show();return;
        }
        new AlertDialog.Builder(a).setTitle("Recover previous JM settings?")
            .setMessage("Restore the app-local configuration saved immediately before the last approved USB restore? No Samsung system settings or files will change.")
            .setNegativeButton("Cancel",null)
            .setPositiveButton("RECOVER",(d,w)->{
                try{
                    JSONObject previous=validateConfig(new JSONObject(read(a,ROLLBACK)));
                    JSONObject current=configuration(sp);
                    applyConfig(sp,previous);
                    write(a,ROLLBACK,current.toString(2)); // reversible swap
                    receipt(a,"local-rollback","ACCEPTED","rollback","Owner accepted JM-only recovery");
                    repaint.run();
                }catch(Exception e){
                    new AlertDialog.Builder(a).setTitle("HOLD · Recovery incomplete")
                        .setMessage(e.getMessage()).setPositiveButton("OK",null).show();
                }
            }).show();
    }
    public static String status(Activity a){
        try{
            JSONObject o=new JSONObject(read(a,RECEIPT));
            return "Last USB request: "+o.optString("status","UNKNOWN")+
                "\nKind: "+o.optString("kind","")+
                "\nRequest ID: "+o.optString("request_id","");
        }catch(Exception e){return "No USB contact receipt yet";}
    }
}
