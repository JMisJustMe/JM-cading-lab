package com.jmisjustme.foldultra;

import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ShortcutManager;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * Local, explicitly triggered diagnostics. PASS is scoped to checks performed
 * by THIS app. Neither OS integration nor physical Fold validation is implied.
 * No network and no privileged permissions.
 */
public final class DevicePreflight {
    public static final String SCHEMA = "JM.FoldUltraPreflight/0.4";
    private DevicePreflight(){}

    private static void item(JSONArray checks, String id, String status,
                             String label, String evidence) throws Exception {
        JSONObject o=new JSONObject();
        o.put("id",id);o.put("status",status);o.put("label",label);
        o.put("evidence",evidence);checks.put(o);
    }
    private static String sha256(String input) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        byte[] data=digest.digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder s=new StringBuilder(64);
        for(byte b:data)s.append(String.format(Locale.ROOT,"%02x",b&255));
        return s.toString();
    }
    private static boolean installed(Activity a,String pkg){
        try{return a.getPackageManager().getLaunchIntentForPackage(pkg)!=null;}
        catch(Exception e){return false;}
    }

    public static JSONObject inspect(Activity a, SharedPreferences sp, int widthDp,
                                     boolean expanded) throws Exception {
        JSONObject out=new JSONObject();
        out.put("schema",SCHEMA);
        out.put("timestamp_epoch_ms",System.currentTimeMillis());
        out.put("device_manufacturer",Build.MANUFACTURER);
        out.put("device_model",Build.MODEL);
        out.put("android_api",Build.VERSION.SDK_INT);
        out.put("app_package",a.getPackageName());
        out.put("screen_width_dp",widthDp);
        out.put("window_class",expanded?"WORKFIELD":"SOURCE");
        out.put("hinge_state_measured",false);
        out.put("network_tested",false);
        out.put("owner_device_pass_claimed",false);
        out.put("active_focus",sp.getString("focus","CREATE"));
        out.put("native_owner_marks",countMarks(sp));
        out.put("note_sha256",sha256(sp.getString("root","")));
        out.put("note_text_included",false);

        JSONArray checks=new JSONArray();
        item(checks,"API_COMPAT",Build.VERSION.SDK_INT>=26?"PASS":"HOLD",
             "Android runtime", "API "+Build.VERSION.SDK_INT+"; minimum declared API 26");
        item(checks,"PACKAGE_ID","com.jmisjustme.foldultra".equals(a.getPackageName())?"PASS":"HOLD",
             "Android package identity",a.getPackageName());
        String permissionEvidence;
        boolean noPermissions=false;
        try{
            PackageInfo info=a.getPackageManager().getPackageInfo(a.getPackageName(),PackageManager.GET_PERMISSIONS);
            int n=info.requestedPermissions==null?0:info.requestedPermissions.length;
            noPermissions=(n==0);
            permissionEvidence="Manifest requests "+n+" Android permissions";
        }catch(Exception e){permissionEvidence="Package permission inspection unavailable"; }
        item(checks,"PERMISSION_AUDIT",noPermissions?"PASS":"HOLD",
             "Package permission inspection",permissionEvidence);
        String marker="JM-LOCAL-PREFLIGHT-"+System.currentTimeMillis();
        boolean written=sp.edit().putString("preflight.probe",marker).commit();
        boolean readBack=marker.equals(sp.getString("preflight.probe",""));
        item(checks,"LOCAL_STATE",(written&&readBack)?"PASS":"HOLD",
             "Local save/read contact",
             "SharedPreferences commit "+written+"; immediate readback "+readBack+"; cold-reopen not tested");
        item(checks,"WINDOW_WIDTH",widthDp>=260?"PASS":"HOLD",
             "Available-width classification",
             widthDp+" dp; "+(expanded?"WORKFIELD":"SOURCE")+"; physical hinge not measured");
        String root=sp.getString("root","");
        item(checks,"ROOT_STATE",root.length()>0&&root.length()<=10000?"PASS":"HOLD",
             "JM root content present",
             "Local note length "+root.length()+"; exported diagnostic contains digest only");
        String[] names={"MY_FILES","SAMSUNG_NOTES","CHATGPT","SAMSUNG_GALLERY"};
        String[] pkgs={"com.sec.android.app.myfiles","com.samsung.android.app.notes",
                       "com.openai.chatgpt","com.sec.android.gallery3d"};
        for(int i=0;i<names.length;i++){
            boolean found=installed(a,pkgs[i]);
            item(checks,"APP_"+names[i],found?"PASS":"HOLD",
                names[i].replace('_',' '),
                found?"Launch target reported by Android; successful launch still untested":
                      "Not launchable or not visible to this app; does not prove uninstalled");
        }
        ShortcutManager shortcuts=a.getSystemService(ShortcutManager.class);
        boolean pin=shortcuts!=null&&shortcuts.isRequestPinShortcutSupported();
        item(checks,"SHORTCUT_CAPABILITY",pin?"PASS":"HOLD",
             "Shortcut request capability",
             pin?"Android supports requesting a pinned shortcut; user must still approve":"Current launcher does not advertise support");
        item(checks,"COMPACT_OWNER",sp.getBoolean("owner.compact_tested",false)?"OWNER":"OPEN",
             "Compact-screen owner test",
             "Owner assertion only; not independent sensor proof");
        item(checks,"EXPANDED_OWNER",sp.getBoolean("owner.expanded_tested",false)?"OWNER":"OPEN",
             "Expanded-screen owner test",
             "Owner assertion only; not independent sensor proof");
        item(checks,"REOPEN_OWNER",sp.getBoolean("owner.reopen_tested",false)?"OWNER":"OPEN",
             "Close and reopen owner test",
             "Owner assertion only; runtime persistence requires physical contact");
        out.put("checks",checks);
        int passed=0,holds=0,owners=0,open=0;
        for(int i=0;i<checks.length();i++){
            switch(checks.getJSONObject(i).getString("status")){
                case "PASS":passed++;break;
                case "HOLD":holds++;break;
                case "OWNER":owners++;break;
                default:open++;break;
            }
        }
        out.put("automatic_pass",passed);
        out.put("automatic_hold",holds);
        out.put("owner_assertions",owners);
        out.put("manual_open",open);
        out.put("device_ding","OPEN");
        out.put("scope","App-local inspection only; no Galaxy AI, One UI or physical hinge verification");
        return out;
    }
    private static int countMarks(SharedPreferences sp){
        String[] keys={"now_nudge","now_brief","assistants","photo_assist","scanner",
                       "multi_window","dex","routines"};
        int count=0;
        for(String key:keys)if(sp.getBoolean("tried."+key,false))count++;
        return count;
    }
}
