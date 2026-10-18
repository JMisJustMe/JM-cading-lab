package com.jmisjustme.foldultra;

import android.app.Activity;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.io.File;
import java.io.IOException;

/**
 * JM-only setup automation. A plan is a reversible, explicit owner action.
 * Neither run() nor recover() modifies One UI, Android permissions or another app.
 */
public final class SetupPlan {
    static final String SCHEMA="JM.FoldSetupPlan/0.7";
    static final String LAST="setup_plan_receipt.json";
    static final String BEFORE="setup_plan_rollback.json";
    private SetupPlan(){}

    public static boolean valid(String name){
        return "MAKE".equals(name)||"PLAYTEST".equals(name)
            ||"RESEARCH".equals(name)||"RECOVERY".equals(name);
    }
    public static boolean validDensity(String value){
        return "QUICK".equals(value)||"COMFORT".equals(value);
    }
    public static String layout(SharedPreferences prefs,boolean expanded){
        String stored=prefs.getString(expanded?"layout.expanded":"layout.compact",
            expanded?"COMFORT":"QUICK");
        return validDensity(stored)?stored:(expanded?"COMFORT":"QUICK");
    }
    public static void setLayout(SharedPreferences prefs,boolean expanded,String density){
        if(!validDensity(density))throw new IllegalArgumentException("Invalid layout density");
        if(!prefs.edit().putString(expanded?"layout.expanded":"layout.compact",density).commit())
            throw new IllegalStateException("JM layout preference could not be saved");
    }
    static JSONObject definition(String id)throws Exception{
        if(!valid(id))throw new IllegalArgumentException("Unknown setup plan: "+id);
        JSONObject plan=new JSONObject();
        plan.put("schema",SCHEMA);plan.put("id",id);
        switch(id){
            case "MAKE":
                plan.put("focus","CREATE");plan.put("session","MAKE");
                plan.put("native_group","CREATE");plan.put("project_id","jm-ecostate");
                plan.put("compact","QUICK");plan.put("expanded","COMFORT");
                break;
            case "PLAYTEST":
                plan.put("focus","PLAY");plan.put("session","PLAYTEST");
                plan.put("native_group","WORK");plan.put("project_id","jm-games-house");
                plan.put("compact","QUICK");plan.put("expanded","QUICK");
                break;
            case "RESEARCH":
                plan.put("focus","EVERYDAY");plan.put("session","RESEARCH");
                plan.put("native_group","ASSIST");plan.put("project_id","jm-source");
                plan.put("compact","COMFORT");plan.put("expanded","COMFORT");
                break;
            default:
                plan.put("focus","CREATE");plan.put("session","RECOVERY");
                plan.put("native_group","WORK");plan.put("project_id","jm-source");
                plan.put("compact","COMFORT");plan.put("expanded","COMFORT");
                break;
        }
        return plan;
    }
    public static String preview(SharedPreferences sp,String id)throws Exception{
        JSONObject plan=definition(id);
        String project=plan.getString("project_id");
        JSONObject entry=ProjectShelf.find(sp,project);
        if(entry==null)throw new IllegalArgumentException("Required existing JM project not found: "+project);
        return "JM "+id+"\n\n"+
            "Priority: "+plan.getString("focus")+
            "\nCurrent JM project: "+entry.getString("title")+
            "\nGalaxy guide group: "+plan.getString("native_group")+
            "\nCompact view: "+plan.getString("compact")+
            "\nExpanded view: "+plan.getString("expanded")+
            "\n\nYour root note and existing project routes remain intact."+
            "\nNo Samsung settings, launcher icons or permissions change.";
    }
    private static void receipt(Activity activity,String id,String status,String detail)throws Exception{
        JSONObject report=new JSONObject();
        report.put("schema","JM.FoldSetupPlanReceipt/0.7");
        report.put("id",id);report.put("status",status);
        report.put("detail",detail);
        report.put("timestamp_epoch_ms",System.currentTimeMillis());
        report.put("no_system_settings_changed",true);
        UsbBridge.write(activity,LAST,report.toString(2));
    }
    public static String receiptText(Activity activity){
        try{
            JSONObject o=new JSONObject(UsbBridge.read(activity,LAST));
            return o.optString("id","")+" / "+o.optString("status","")+
                "\n"+o.optString("detail","");
        }catch(Exception e){return "No locally applied JM setup plan yet";}
    }
    public static void run(Activity activity,SharedPreferences sp,String id)throws Exception{
        JSONObject plan=definition(id);
        String target=plan.getString("project_id");
        if(ProjectShelf.find(sp,target)==null)
            throw new IllegalArgumentException("HOLD · Required JM project is not registered");
        JSONObject before=UsbBridge.configuration(sp);
        // Save the complete configuration before writing anything mutable.
        UsbBridge.write(activity,BEFORE,before.toString(2));
        SharedPreferences.Editor edit=sp.edit()
            .putString("focus",plan.getString("focus"))
            .putString("session",plan.getString("session"))
            .putString("native.group",plan.getString("native_group"))
            .putString("layout.compact",plan.getString("compact"))
            .putString("layout.expanded",plan.getString("expanded"))
            .putString("setup.last",id);
        // Validation already succeeded; stage project choice with all other settings.
        ProjectShelf.stageToEditor(edit,ProjectShelf.all(sp),target);
        if(!edit.commit())throw new IOException("JM setup plan commit failed");
        try{
            receipt(activity,id,"ACCEPTED","Owner-approved JM-only preset applied; previous JM config retained");
        }catch(Exception e){
            // Preferences are applied; never invent a saved receipt.
            throw new IOException("Plan applied but receipt could not be saved. Inspect JM settings.",e);
        }
    }
    public static boolean canRecover(Activity activity){
        return new File(activity.getFilesDir(),BEFORE).isFile();
    }
    public static void recover(Activity activity,SharedPreferences sp)throws Exception{
        if(!canRecover(activity))throw new IOException("No setup-plan rollback snapshot");
        JSONObject old=new JSONObject(UsbBridge.read(activity,BEFORE));
        JSONObject current=UsbBridge.configuration(sp);
        // Config is validated before any mutation.
        UsbBridge.checkConfig(old);
        UsbBridge.applyConfig(sp,old);
        UsbBridge.write(activity,BEFORE,current.toString(2));
        receipt(activity,"RECOVER","ACCEPTED","Previous JM configuration restored by owner; Samsung unchanged");
    }
}
