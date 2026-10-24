package com.jmisjustme.foldultra;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.net.URI;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/** References to JM project bodies, not copies of the project files.
 *  No privileged file search, private document reading or automatic downloads.
 */
public final class ProjectShelf {
    public static final String SCHEMA="JM.ProjectShelf/0.6";
    public static final int LIMIT=24;
    private static final String STORAGE="project.shelf";
    private static final String SELECTED="project.active";
    private static final Pattern ID=Pattern.compile("[a-z0-9][a-z0-9-]{1,31}");
    private ProjectShelf(){}

    private static JSONObject entry(String id,String title,String family,String url) throws Exception{
        JSONObject o=new JSONObject();o.put("id",id);o.put("title",title);
        o.put("family",family);o.put("url",url);return o;
    }
    static boolean family(String value){
        return "GAMES".equals(value)||"MUSIC".equals(value)||"BUILD".equals(value)||"ESTATE".equals(value)||
               "COMICS".equals(value)||"CARTOONS".equals(value)||"BOOKS".equals(value);
    }
    public static String safeUrl(String input) throws Exception{
        String url=input==null?"":input.trim();
        if(url.isEmpty())return "";
        if(url.length()>1024)throw new IllegalArgumentException("Link exceeds 1024 characters");
        if(!url.startsWith("https://"))throw new IllegalArgumentException("Use a public HTTPS link");
        if(url.indexOf('\\')>=0 || url.contains("\n") || url.contains("\r") || url.contains(" "))
            throw new IllegalArgumentException("URL contains disallowed characters");
        URI parsed=new URI(url);
        String host=parsed.getHost();
        if(host==null||host.trim().isEmpty()||host.equalsIgnoreCase("localhost")||
            host.endsWith(".local")||host.startsWith("127.")||
            host.startsWith("192.168.")||host.startsWith("10.")||host.startsWith("172.")||
            host.equals("[::1]")||parsed.getUserInfo()!=null||
            parsed.getPort()!=-1||parsed.getFragment()!=null)
            throw new IllegalArgumentException("Link must be a public HTTPS host without credentials, port or fragment");
        return parsed.toASCIIString();
    }
    public static JSONObject validate(JSONObject p) throws Exception{
        String id=p.getString("id");
        String title=p.getString("title").trim();
        String group=p.getString("family");
        String url=safeUrl(p.optString("url",""));
        if(!ID.matcher(id).matches())throw new IllegalArgumentException("Invalid project ID");
        if(title.length()<2||title.length()>64)
            throw new IllegalArgumentException("Project title must be 2–64 characters");
        if(!family(group))throw new IllegalArgumentException("Unknown project family");
        return entry(id,title,group,url);
    }
    private static JSONArray seed() throws Exception{
        JSONArray a=new JSONArray();
        a.put(entry("jm-ecostate","JM Ecostate","ESTATE","https://jmisjustme.github.io/JM-cading-lab/"));
        a.put(entry("jm-games-house","JM Games House","GAMES","https://jmisjustme.github.io/JM-cading-lab/games-beyond/"));
        a.put(entry("jm-source","JM Source Spine","BUILD","https://github.com/JMisJustMe/JM-cading-lab"));
        a.put(entry("five-flip","FIVE//FLIP","GAMES",""));
        a.put(entry("tideless-rebels","TIDELESS REBELS","GAMES",""));
        a.put(entry("slotborn-action","SLOTBORN ACTION","GAMES",""));
        a.put(entry("jm-beatmaker","JM Beatmaker","MUSIC",""));
        a.put(entry("jm-lyric-home","JM Lyric Home","MUSIC",""));
        a.put(entry("jm-buildcad","JM BuildCAD","BUILD",""));
        return a;
    }
    public static JSONArray validateList(JSONArray incoming)throws Exception {
        if(incoming.length()<1 || incoming.length()>LIMIT)
            throw new IllegalArgumentException("Project shelf must have 1–24 entries");
        JSONArray result=new JSONArray();Set<String> seen=new HashSet<>();
        for(int i=0;i<incoming.length();i++){
            JSONObject p=validate(incoming.getJSONObject(i));
            String id=p.getString("id");
            if(!seen.add(id))throw new IllegalArgumentException("Duplicate project ID: "+id);
            result.put(p);
        }
        return result;
    }
    public static JSONArray all(SharedPreferences sp) throws Exception{
        String saved=sp.getString(STORAGE,"");
        if(saved.isEmpty())return seed();
        return validateList(new JSONArray(saved));
    }
    public static JSONObject find(SharedPreferences sp,String id)throws Exception{
        JSONArray a=all(sp);
        for(int i=0;i<a.length();i++)if(a.getJSONObject(i).getString("id").equals(id))
            return a.getJSONObject(i);
        return null;
    }
    public static boolean has(SharedPreferences sp,String id)throws Exception{return find(sp,id)!=null;}
    public static void choose(SharedPreferences sp,String id)throws Exception{
        if(find(sp,id)==null)throw new IllegalArgumentException("Project not present in JM shelf: "+id);
        if(!sp.edit().putString(SELECTED,id).commit())
            throw new IllegalStateException("Project selection could not be saved");
    }
    public static String selected(SharedPreferences sp){return sp.getString(SELECTED,"jm-ecostate");}
    public static int count(SharedPreferences sp)throws Exception{return all(sp).length();}
    public static void stageToEditor(SharedPreferences.Editor editor,JSONArray entries,String selected)throws Exception{
        JSONArray valid=validateList(entries);
        boolean found=false;
        for(int i=0;i<valid.length();i++)
            if(valid.getJSONObject(i).getString("id").equals(selected))found=true;
        if(!found)throw new IllegalArgumentException("Active project missing from list");
        editor.putString(STORAGE,valid.toString()).putString(SELECTED,selected);
    }
    public static void install(SharedPreferences sp,JSONArray entries,String selected)throws Exception{
        JSONArray validated=validateList(entries);
        boolean found=false;
        for(int i=0;i<validated.length();i++){
            if(validated.getJSONObject(i).getString("id").equals(selected))found=true;
        }
        if(!found)throw new IllegalArgumentException("Selected project absent from restored shelf");
        if(!sp.edit().putString(STORAGE,validated.toString()).putString(SELECTED,selected).commit())
            throw new IllegalStateException("JM project shelf write failed");
    }
    public static JSONObject upsert(SharedPreferences sp,JSONObject requested)throws Exception{
        JSONObject p=validate(requested);
        JSONArray current=all(sp),result=new JSONArray();
        String id=p.getString("id"); boolean replaced=false;
        for(int i=0;i<current.length();i++){
            JSONObject existing=current.getJSONObject(i);
            if(existing.getString("id").equals(id)){result.put(p);replaced=true;}
            else result.put(existing);
        }
        if(!replaced){
            if(result.length()>=LIMIT)throw new IllegalArgumentException("Project limit reached (24)");
            result.put(p);
        }
        result=validateList(result);
        if(!sp.edit().putString(STORAGE,result.toString()).putString(SELECTED,id).commit())
            throw new IllegalStateException("Project contact could not be saved");
        return p;
    }
    public static String describe(JSONObject entry){
        if(entry==null)return "Unknown project";
        String url=entry.optString("url","");
        return entry.optString("title","Untitled")+" / "+entry.optString("family","")+
            "\n"+(url.isEmpty()?"UNBOUND: no verified launch route":url);
    }
    public static void open(Activity activity,JSONObject project){
        String link=project.optString("url","");
        if(link.isEmpty()){
            Toast.makeText(activity,"HOLD · No launch route bound to this JM project",Toast.LENGTH_LONG).show();
            return;
        }
        try{
            String safe=safeUrl(link);
            activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(safe)));
        }catch(Exception e){
            Toast.makeText(activity,"HOLD · Project link unavailable",Toast.LENGTH_LONG).show();
        }
    }
}
