package com.jmisjustme.foldultra;

import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

/** Owner-mediated, project-only transfer. No other JM configuration is copied. */
public final class ProjectShelfTransfer {
  static final String SCHEMA="JM.ProjectShelfTransfer/1.0";
  static final String ROLLBACK="project.transfer.rollback";
  private ProjectShelfTransfer(){}
  static JSONObject snapshot(SharedPreferences sp)throws Exception{
    JSONObject o=new JSONObject();
    o.put("schema",SCHEMA);
    o.put("project_shelf",ProjectShelf.all(sp));
    o.put("active_project",ProjectShelf.selected(sp));
    return o;
  }
  static JSONObject validate(JSONObject source)throws Exception{
    if(!SCHEMA.equals(source.optString("schema")))throw new IllegalArgumentException("Not a JM project-only transfer");
    JSONArray shelf=ProjectShelf.validateList(source.getJSONArray("project_shelf"));
    String active=source.getString("active_project");
    boolean found=false;
    for(int n=0;n<shelf.length();n++)if(active.equals(shelf.getJSONObject(n).getString("id")))found=true;
    if(!found)throw new IllegalArgumentException("Active project absent from transferred shelf");
    JSONObject clean=new JSONObject();
    clean.put("schema",SCHEMA);clean.put("project_shelf",shelf);clean.put("active_project",active);
    return clean;
  }
  static void apply(SharedPreferences sp,JSONObject source)throws Exception{
    JSONObject clean=validate(source);
    JSONObject previous=snapshot(sp);
    SharedPreferences.Editor e=sp.edit();
    ProjectShelf.stageToEditor(e,clean.getJSONArray("project_shelf"),clean.getString("active_project"));
    e.putString(ROLLBACK,previous.toString());
    if(!e.commit())throw new IllegalStateException("Project-only transfer not saved");
  }
  static void restore(SharedPreferences sp)throws Exception{
    String saved=sp.getString(ROLLBACK,"");
    if(saved.isEmpty())throw new IllegalStateException("No project-only rollback available");
    JSONObject previous=validate(new JSONObject(saved));
    JSONObject current=snapshot(sp);
    SharedPreferences.Editor e=sp.edit();
    ProjectShelf.stageToEditor(e,previous.getJSONArray("project_shelf"),previous.getString("active_project"));
    e.putString(ROLLBACK,current.toString());
    if(!e.commit())throw new IllegalStateException("Project rollback not saved");
  }
}
