package com.jmisjustme.foldultra;

import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashSet;

/**
 * Native, owner-approved receiver for an EXISTING Living Home CP07 ledger.
 * Read-only parsing -> pending review -> explicit atomic session checkpoint.
 * This does not authenticate a remote provider or contact a cloud server.
 */
public final class CloudReturnBridge {
  public static final String LEDGER_SCHEMA="JM.LivingHome.CP07.CloudReturn/1.0";
  public static final String PENDING_KEY="livinghome.return.pending";
  public static final String APPLIED_KEY="livinghome.return.applied";
  public static final int MAX_LEDGER_BYTES=250000;
  private CloudReturnBridge(){}

  private static String text(JSONObject j,String k,int max) throws Exception {
    String v=j.getString(k);
    if(v.isEmpty()||v.length()>max)throw new IllegalArgumentException("Invalid "+k+" length");
    return v;
  }
  private static String digest(String value)throws Exception {
    byte[] sum=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
    StringBuilder b=new StringBuilder();
    for(byte x:sum)b.append(String.format(java.util.Locale.ROOT,"%02x",x&255));
    return b.toString();
  }
  private static boolean matches(JSONObject row,JSONObject active)throws Exception {
    String localId=active.getString("id"),localTitle=active.getString("title");
    if(localTitle.equalsIgnoreCase(row.optString("project","")))return true;
    JSONObject out=row.optJSONObject("outgoing");
    JSONObject source=out==null?null:out.optJSONObject("source");
    return source!=null&&localId.equals(source.optString("id",""));
  }
  /** Refuse silent project substitution and keep only bounded, evidence-scoped fields. */
  public static JSONObject select(String json,JSONObject active,int revision)throws Exception {
    if(json==null||json.getBytes(StandardCharsets.UTF_8).length>MAX_LEDGER_BYTES)
      throw new IOException("Living Home ledger exceeds 250 KB");
    JSONObject doc=new JSONObject(json);
    if(!LEDGER_SCHEMA.equals(doc.optString("schema","")))
      throw new IllegalArgumentException("Expected the genuine CP07 Cloud Return ledger schema");
    JSONArray rows=doc.getJSONArray("missions");
    if(rows.length()>80)throw new IllegalArgumentException("Too many mission records");
    JSONObject chosen=null;
    for(int i=0;i<rows.length();i++){
      JSONObject r=rows.getJSONObject(i);
      if(!"RETURN_RECEIVED_UNVERIFIED".equals(r.optString("state","")))continue;
      if(!matches(r,active))continue;
      String mission=text(r,"missionId",128),challenge=text(r,"challenge",32);
      if(!mission.matches("[a-zA-Z0-9_.:-]{1,128}")||!challenge.matches("[0-9a-f]{32}"))
        throw new IllegalArgumentException("Invalid mission challenge");
      String result=text(r,"returnText",3000);
      int resultSignal=r.getInt("returnSignalId");
      if(resultSignal<1)throw new IllegalArgumentException("Missing received signal ID");
      JSONObject outgoing=r.getJSONObject("outgoing");
      if(!"JM.LivingHome.CloudMission/1.0".equals(outgoing.optString("schema",""))||
          !mission.equals(outgoing.optString("missionId",""))||
          !challenge.equals(outgoing.optString("challenge","")))
        throw new IllegalArgumentException("Mission source/challenge mismatch");
      JSONObject clean=new JSONObject();
      clean.put("schema","JM.FoldCloudReturnPending/1");
      clean.put("project_id",active.getString("id"));
      clean.put("project_title",active.getString("title"));
      clean.put("mission_id",mission);
      clean.put("challenge",challenge);
      clean.put("return_signal_id",resultSignal);
      clean.put("result",result);
      clean.put("native_expected_revision",revision);
      clean.put("evidence_state","RETURN_RECEIVED_UNVERIFIED");
      clean.put("fingerprint",digest(mission+"\n"+challenge+"\n"+resultSignal));
      chosen=clean;
    }
    if(chosen==null)throw new IllegalArgumentException("No matching received return for the active JM project");
    return chosen;
  }
  public static JSONObject pending(SharedPreferences sp)throws Exception {
    String raw=sp.getString(PENDING_KEY,"");
    if(raw.isEmpty())return null;
    JSONObject p=new JSONObject(raw);
    if(!"JM.FoldCloudReturnPending/1".equals(p.optString("schema","")))throw new IllegalArgumentException("Unknown cloud return");
    if(!p.getString("challenge").matches("[0-9a-f]{32}"))throw new IllegalArgumentException("Challenge changed");
    if(p.getString("result").length()>3000||p.getString("fingerprint").length()!=64)
      throw new IllegalArgumentException("Receipt corrupted");
    if(!digest(p.getString("mission_id")+"\n"+p.getString("challenge")+"\n"+p.getInt("return_signal_id")).equals(p.getString("fingerprint")))
      throw new IllegalArgumentException("Return identity changed");
    return p;
  }
  public static void stage(SharedPreferences sp,JSONObject p)throws Exception {
    if(!sp.edit().putString(PENDING_KEY,p.toString()).commit())throw new IOException("Pending return not saved");
  }
  private static JSONArray applied(SharedPreferences sp)throws Exception{
    String raw=sp.getString(APPLIED_KEY,"");
    JSONArray a=raw.isEmpty()?new JSONArray():new JSONArray(raw);
    if(a.length()>100)throw new IllegalArgumentException("Applied receipt history invalid");
    HashSet<String> marks=new HashSet<>();
    for(int i=0;i<a.length();i++){
      String m=a.getString(i);
      if(!m.matches("[0-9a-f]{64}")||!marks.add(m))throw new IllegalArgumentException("Applied receipt history corrupted");
    }
    return a;
  }
  public static int apply(SharedPreferences sp)throws Exception {
    JSONObject p=pending(sp);
    if(p==null)throw new IllegalStateException("No pending Living Home return");
    String id=p.getString("project_id");
    if(ProjectShelf.find(sp,id)==null||!ProjectShelf.selected(sp).equals(id))
      throw new IllegalStateException("Active project changed; return refused");
    JSONArray history=applied(sp);
    String fingerprint=p.getString("fingerprint");
    for(int i=0;i<history.length();i++)
      if(fingerprint.equals(history.getString(i)))throw new IllegalStateException("Replay refused: receipt already applied");
    JSONObject old=SessionDeck.find(sp,id);
    int rev=old.getInt("revision");
    if(rev!=p.getInt("native_expected_revision"))throw new IllegalStateException("STALE checkpoint: re-import against current project state");
    for(String field:new String[]{"phase","note","next_action"}){
      String key=SessionDeck.draftKey(id,field);
      if(sp.contains(key)&&!sp.getString(key,"").equals(old.optString(field,"")))
        throw new IllegalStateException("Unsaved JM draft exists: checkpoint it before applying this return");
    }
    String evidence="\n\n[LIVING HOME RETURN · unverified provider text]\n"+
      "Mission: "+p.getString("mission_id")+"\nSignal: "+p.getInt("return_signal_id")+"\n"+
      p.getString("result");
    String nextNote=old.getString("note")+evidence;
    if(nextNote.length()>SessionDeck.MAX_NOTES)
      throw new IllegalStateException("JM session note full; no content changed");
    JSONObject next=new JSONObject();
    next.put("project_id",id).put("revision",rev+1)
      .put("phase",old.getString("phase")).put("note",nextNote)
      .put("next_action",old.getString("next_action"))
      .put("updated_epoch_ms",System.currentTimeMillis());
    JSONArray deck=SessionDeck.put(sp,next);
    history.put(fingerprint);
    if(history.length()>100){JSONArray sliced=new JSONArray();for(int i=history.length()-100;i<history.length();i++)sliced.put(history.getString(i));history=sliced;}
    SharedPreferences.Editor edit=sp.edit();
    SessionDeck.stage(edit,deck);
    edit.putString(APPLIED_KEY,history.toString()).remove(PENDING_KEY);
    for(String f:new String[]{"phase","note","next_action"})edit.remove(SessionDeck.draftKey(id,f));
    if(!edit.commit())throw new IOException("Atomic JM cloud return commit failed");
    return rev+1;
  }
}
