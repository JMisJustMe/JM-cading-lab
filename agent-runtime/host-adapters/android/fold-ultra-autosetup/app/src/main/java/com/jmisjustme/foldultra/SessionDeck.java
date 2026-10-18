package com.jmisjustme.foldultra;

import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

/** Local per-project session checkpoints. No project files, external network,
 * background sync, privileged Samsung APIs, or false cross-device synchronization.
 *
 * Drafts persist separately on each text change; a checkpoint increments a
 * per-project revision. USB proposals must match that revision before and after
 * phone owner approval. One project ID holds one active checkpoint.
 */
public final class SessionDeck {
    public static final String SCHEMA="JM.FoldSessionDeck/0.8";
    public static final String KEY="session.deck";
    static final int MAX_NOTES=4000,MAX_NEXT=220,MAX_ENTRIES=24,MAX_REVISION=100000000;
    private SessionDeck(){}

    static boolean phase(String value){
        return "IDEA".equals(value)||"BUILD".equals(value)
            ||"TEST".equals(value)||"POLISH".equals(value);
    }
    static JSONObject fresh(String id)throws Exception{
        JSONObject value=new JSONObject();
        value.put("project_id",id).put("revision",0)
            .put("phase","IDEA").put("note","").put("next_action","")
            .put("updated_epoch_ms",0);
        return value;
    }
    public static JSONObject validate(JSONObject item)throws Exception{
        String id=item.getString("project_id");
        if(!id.matches("[a-z0-9][a-z0-9-]{1,31}"))
            throw new IllegalArgumentException("Invalid session project ID");
        String phase=item.getString("phase");
        if(!phase(phase))throw new IllegalArgumentException("Invalid JM session phase");
        String note=item.getString("note"),next=item.getString("next_action");
        if(note.length()>MAX_NOTES||next.length()>MAX_NEXT)
            throw new IllegalArgumentException("Session text exceeds bounds");
        if(!item.has("revision")||!(item.get("revision") instanceof Integer))
            throw new IllegalArgumentException("Expected integer session revision");
        int rev=item.getInt("revision");
        if(rev<0||rev>MAX_REVISION)throw new IllegalArgumentException("Invalid session revision");
        long updated=item.optLong("updated_epoch_ms",0);
        if(updated<0)throw new IllegalArgumentException("Invalid session checkpoint timestamp");
        JSONObject clean=fresh(id);
        clean.put("revision",rev).put("phase",phase)
            .put("note",note).put("next_action",next)
            .put("updated_epoch_ms",updated);
        return clean;
    }
    public static JSONArray validateDeck(JSONArray incoming)throws Exception{
        if(incoming.length()>MAX_ENTRIES)throw new IllegalArgumentException("Too many JM session checkpoints");
        JSONArray clean=new JSONArray();java.util.HashSet<String> seen=new java.util.HashSet<>();
        for(int i=0;i<incoming.length();i++){
            JSONObject entry=validate(incoming.getJSONObject(i));
            String id=entry.getString("project_id");
            if(!seen.add(id))throw new IllegalArgumentException("Duplicate JM session project");
            clean.put(entry);
        }
        return clean;
    }
    public static JSONArray all(SharedPreferences sp)throws Exception{
        String body=sp.getString(KEY,"");
        return body.isEmpty()?new JSONArray():validateDeck(new JSONArray(body));
    }
    public static void stage(SharedPreferences.Editor editor,JSONArray body)throws Exception{
        editor.putString(KEY,validateDeck(body).toString());
    }
    public static JSONObject find(SharedPreferences sp,String projectId)throws Exception{
        JSONArray list=all(sp);
        for(int i=0;i<list.length();i++){
            JSONObject e=list.getJSONObject(i);
            if(e.getString("project_id").equals(projectId))return e;
        }
        return fresh(projectId);
    }
    static JSONArray put(SharedPreferences sp,JSONObject entry)throws Exception{
        entry=validate(entry);JSONArray source=all(sp),result=new JSONArray();
        boolean replaced=false;
        for(int i=0;i<source.length();i++){
            JSONObject old=source.getJSONObject(i);
            if(old.getString("project_id").equals(entry.getString("project_id"))){
                result.put(entry);replaced=true;
            }else result.put(old);
        }
        if(!replaced){
            if(result.length()>=MAX_ENTRIES)throw new IllegalArgumentException("Session shelf full");
            result.put(entry);
        }
        return validateDeck(result);
    }
    public static String draftKey(String id,String name){return "session.draft."+id+"."+name;}
    public static void draft(SharedPreferences sp,String projectId,String name,String value){
        int limit="note".equals(name)?MAX_NOTES:"next_action".equals(name)?MAX_NEXT:0;
        if(limit==0||value.length()>limit)
            throw new IllegalArgumentException("Invalid draft field/length");
        sp.edit().putString(draftKey(projectId,name),value).apply();
    }
    public static String draftText(SharedPreferences sp,JSONObject checkpoint,String name){
        String id=checkpoint.optString("project_id","");
        return sp.getString(draftKey(id,name),checkpoint.optString(name,""));
    }
    public static int commit(SharedPreferences sp,String id,int expectedRevision,
                             String phase,String note,String next)throws Exception{
        if(!phase(phase))throw new IllegalArgumentException("Invalid phase");
        if(note==null||next==null||note.length()>MAX_NOTES||next.length()>MAX_NEXT)
            throw new IllegalArgumentException("Session content out of bounds");
        if(ProjectShelf.find(sp,id)==null)throw new IllegalArgumentException("JM project is not registered");
        JSONObject current=find(sp,id);
        int revision=current.getInt("revision");
        if(revision!=expectedRevision)
            throw new IllegalStateException("REVISION CONFLICT: JM session changed since proposal");
        if(revision==MAX_REVISION)throw new IllegalStateException("Session revision exhausted");
        JSONObject nextBody=fresh(id);
        nextBody.put("revision",revision+1).put("phase",phase)
            .put("note",note).put("next_action",next)
            .put("updated_epoch_ms",System.currentTimeMillis());
        JSONArray updated=put(sp,nextBody);
        SharedPreferences.Editor edit=sp.edit();
        stage(edit,updated);
        edit.remove(draftKey(id,"note")).remove(draftKey(id,"next_action"));
        if(!edit.commit())throw new IllegalStateException("Checkpoint not saved");
        return revision+1;
    }
    public static boolean conflicted(SharedPreferences sp,String id,int rev)throws Exception{
        return find(sp,id).getInt("revision")!=rev;
    }
    public static String shortStatus(SharedPreferences sp,String id){
        try{
            JSONObject entry=find(sp,id);
            int rev=entry.getInt("revision");
            return rev==0?"No JM session checkpoint yet":
                entry.getString("phase")+" · checkpoint "+rev+
                " · next: "+(entry.getString("next_action").isEmpty()?
                    "not set":entry.getString("next_action"));
        }catch(Exception e){return "HOLD · Session checkpoint unavailable";}
    }
}
