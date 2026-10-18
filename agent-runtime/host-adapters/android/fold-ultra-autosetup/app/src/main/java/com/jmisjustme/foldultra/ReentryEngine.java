package com.jmisjustme.foldultra;

import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.IOException;
import java.util.HashSet;

/**
 * Explicit JM return points, not device-wide rollback.
 * Return creates the NEXT checkpoint instead of rewinding revision history.
 * The prior current checkpoint becomes the next return point in the SAME commit.
 */
public final class ReentryEngine {
    public static final String SCHEMA="JM.FoldReentry/0.9";
    static final String KEY="reentry.points";
    static final int LIMIT=24;
    private ReentryEngine(){}

    static JSONObject fromSession(JSONObject session)throws Exception{
        JSONObject checkpoint=SessionDeck.validate(session);
        JSONObject result=new JSONObject();
        result.put("project_id",checkpoint.getString("project_id"));
        result.put("source_revision",checkpoint.getInt("revision"));
        result.put("phase",checkpoint.getString("phase"));
        result.put("note",checkpoint.getString("note"));
        result.put("next_action",checkpoint.getString("next_action"));
        result.put("recorded_epoch_ms",System.currentTimeMillis());
        return result;
    }
    public static JSONObject validatePoint(JSONObject body)throws Exception{
        JSONObject linked=new JSONObject();
        linked.put("project_id",body.getString("project_id"));
        linked.put("revision",body.getInt("source_revision"));
        linked.put("phase",body.getString("phase"));
        linked.put("note",body.getString("note"));
        linked.put("next_action",body.getString("next_action"));
        linked.put("updated_epoch_ms",0);
        SessionDeck.validate(linked);
        long captured=body.getLong("recorded_epoch_ms");
        if(captured<0)throw new IllegalArgumentException("Invalid return timestamp");
        JSONObject clean=new JSONObject();
        clean.put("project_id",body.getString("project_id"));
        clean.put("source_revision",body.getInt("source_revision"));
        clean.put("phase",body.getString("phase"));
        clean.put("note",body.getString("note"));
        clean.put("next_action",body.getString("next_action"));
        clean.put("recorded_epoch_ms",captured);
        return clean;
    }
    public static JSONArray validateList(JSONArray incoming)throws Exception{
        if(incoming.length()>LIMIT)throw new IllegalArgumentException("Return-point shelf exceeds 24");
        HashSet<String> seen=new HashSet<>();JSONArray result=new JSONArray();
        for(int i=0;i<incoming.length();i++){
            JSONObject item=validatePoint(incoming.getJSONObject(i));
            if(!seen.add(item.getString("project_id")))
                throw new IllegalArgumentException("Duplicate JM return point");
            result.put(item);
        }
        return result;
    }
    public static void checkLinks(JSONArray points,JSONArray projects)throws Exception{
        JSONArray valid=validateList(points);
        for(int i=0;i<valid.length();i++){
            String id=valid.getJSONObject(i).getString("project_id");
            boolean registered=false;
            for(int j=0;j<projects.length();j++)
                if(id.equals(projects.getJSONObject(j).getString("id")))registered=true;
            if(!registered)throw new IllegalArgumentException("Orphan JM return point: "+id);
        }
    }
    public static JSONArray all(SharedPreferences prefs)throws Exception{
        String raw=prefs.getString(KEY,"");
        return raw.isEmpty()?new JSONArray():validateList(new JSONArray(raw));
    }
    public static JSONObject point(SharedPreferences prefs,String id)throws Exception{
        JSONArray list=all(prefs);
        for(int i=0;i<list.length();i++){
            JSONObject item=list.getJSONObject(i);
            if(item.getString("project_id").equals(id))return item;
        }
        return null;
    }
    static JSONArray upsert(SharedPreferences prefs,JSONObject proposed)throws Exception{
        JSONObject validated=validatePoint(proposed);
        JSONArray existing=all(prefs),updated=new JSONArray();
        boolean wasFound=false;
        for(int i=0;i<existing.length();i++){
            JSONObject point=existing.getJSONObject(i);
            if(point.getString("project_id").equals(validated.getString("project_id"))){
                updated.put(validated);wasFound=true;
            }else updated.put(point);
        }
        if(!wasFound){
            if(updated.length()>=LIMIT)throw new IllegalStateException("Return point shelf full");
            updated.put(validated);
        }
        return validateList(updated);
    }
    public static void stage(SharedPreferences.Editor e,JSONArray incoming)throws Exception{
        e.putString(KEY,validateList(incoming).toString());
    }
    public static JSONObject capture(SharedPreferences prefs,String id,int expectedRevision)throws Exception{
        if(ProjectShelf.find(prefs,id)==null)throw new IllegalArgumentException("Unknown JM project");
        JSONObject current=SessionDeck.find(prefs,id);
        if(current.getInt("revision")!=expectedRevision)
            throw new IllegalStateException("STALE current revision; return point not captured");
        if(expectedRevision==0)
            throw new IllegalStateException("Checkpoint the project before capturing a Return Point");
        JSONObject recorded=fromSession(current);
        SharedPreferences.Editor editor=prefs.edit();
        stage(editor,upsert(prefs,recorded));
        if(!editor.commit())throw new IOException("Return-point capture not saved");
        return recorded;
    }
    public static int restore(SharedPreferences prefs,String id,int expectedCurrent,
                              int expectedPointRevision)throws Exception{
        if(ProjectShelf.find(prefs,id)==null)throw new IllegalArgumentException("Unknown JM project");
        JSONObject current=SessionDeck.find(prefs,id);
        int actual=current.getInt("revision");
        if(actual!=expectedCurrent)throw new IllegalStateException("STALE current checkpoint; no recovery applied");
        if(actual>=SessionDeck.MAX_REVISION)throw new IllegalStateException("Revision exhausted");
        JSONObject saved=point(prefs,id);
        if(saved==null)throw new IllegalStateException("No Return Point saved for this project");
        if(saved.getInt("source_revision")!=expectedPointRevision)
            throw new IllegalStateException("STALE return point; no recovery applied");
        JSONObject returned=new JSONObject();
        returned.put("project_id",id);
        returned.put("revision",actual+1);
        returned.put("phase",saved.getString("phase"));
        returned.put("note",saved.getString("note"));
        returned.put("next_action",saved.getString("next_action"));
        returned.put("updated_epoch_ms",System.currentTimeMillis());
        JSONArray updatedDeck=SessionDeck.put(prefs,returned);
        JSONArray updatedPoints=upsert(prefs,fromSession(current));
        SharedPreferences.Editor e=prefs.edit();
        SessionDeck.stage(e,updatedDeck);
        stage(e,updatedPoints);
        e.remove(SessionDeck.draftKey(id,"phase"))
         .remove(SessionDeck.draftKey(id,"note"))
         .remove(SessionDeck.draftKey(id,"next_action"));
        if(!e.commit())throw new IOException("Return did not commit");
        return actual+1;
    }
    public static String status(SharedPreferences sp,String projectId){
        try{
            JSONObject mark=point(sp,projectId);
            if(mark==null)return "No Return Point yet · checkpoint a session first";
            return mark.getString("phase")+" · saved from revision "+
                mark.getInt("source_revision")+" · "+mark.getString("next_action");
        }catch(Exception e){return "HOLD · Return Point could not be read";}
    }
}
