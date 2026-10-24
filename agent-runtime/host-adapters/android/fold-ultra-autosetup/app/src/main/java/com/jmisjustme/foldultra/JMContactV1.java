package com.jmisjustme.foldultra;

import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;

/** JM-owned navigation receipts and bounded portable metadata. Not a Samsung provider API. */
public final class JMContactV1 {
  public static final String SCHEMA="JM.FoldLivingContact/1.0";
  static final String RECEIPTS="jm.contact.receipts";
  public static final int MAX_RECEIPTS=48;
  private JMContactV1(){}

  static JSONArray validateReceipts(JSONArray input)throws Exception{
    if(input==null||input.length()>MAX_RECEIPTS)throw new IllegalArgumentException("Contact ledger over limit");
    JSONArray clean=new JSONArray();
    for(int i=0;i<input.length();i++){
      JSONObject x=input.getJSONObject(i);
      String name=x.getString("name"),kind=x.getString("kind"),proof=x.getString("proof");
      if(!name.matches("[A-Z_0-9]{3,40}")||
         !kind.matches("[A-Z_0-9]{3,40}")||proof.length()>160)
        throw new IllegalArgumentException("Invalid contact record");
      long time=x.getLong("epoch_ms");
      if(time<1)throw new IllegalArgumentException("Invalid receipt time");
      clean.put(new JSONObject().put("name",name).put("kind",kind)
        .put("proof",proof).put("epoch_ms",time)
        .put("physical_verified",false));
    }
    return clean;
  }
  public static JSONArray receipts(SharedPreferences sp)throws Exception{
    return validateReceipts(new JSONArray(sp.getString(RECEIPTS,"[]")));
  }
  public static void record(SharedPreferences sp,String name,String kind,String proof)throws Exception{
    JSONArray existing=receipts(sp),next=new JSONArray();
    for(int i=Math.max(0,existing.length()-MAX_RECEIPTS+1);i<existing.length();i++)
      next.put(existing.getJSONObject(i));
    JSONObject row=new JSONObject().put("name",name).put("kind",kind)
       .put("proof",proof).put("epoch_ms",System.currentTimeMillis())
       .put("physical_verified",false);
    JSONArray normalized=validateReceipts(next.put(row));
    if(!sp.edit().putString(RECEIPTS,normalized.toString()).commit())
      throw new IllegalStateException("Contact receipt could not be saved");
  }
  public static JSONObject extras(SharedPreferences sp)throws Exception{
    JSONObject e=new JSONObject().put("schema",SCHEMA);
    // Prior v0.9 backups did not carry these. They remain separately identified.
    JSONObject pending=CloudReturnBridge.pending(sp);
    if(pending!=null)e.put("living_home_pending",pending);
    e.put("living_home_applied",CloudReturnBridge.appliedForExport(sp));
    e.put("contact_receipts",receipts(sp));
    e.put("intake_registry",JMIntakeV1.registry(sp));
    return e;
  }
  public static JSONObject validateExtras(JSONObject e)throws Exception{
    if(e==null||!SCHEMA.equals(e.optString("schema","")))
      throw new IllegalArgumentException("Unrecognised JM Contact extension");
    if(e.has("living_home_pending")){
      JSONObject pending=e.getJSONObject("living_home_pending");
      CloudReturnBridge.verifyPending(pending);
    }
    CloudReturnBridge.validateApplied(e.getJSONArray("living_home_applied"));
    validateReceipts(e.getJSONArray("contact_receipts"));
    JMIntakeV1.validateRegistry(e.getJSONArray("intake_registry"));
    return e;
  }
  public static void stageExtras(SharedPreferences.Editor ed,JSONObject extensions)throws Exception{
    if(extensions==null)return; // Backups before v1.0 never claimed these bodies.
    validateExtras(extensions);
    if(extensions.has("living_home_pending"))
      ed.putString(CloudReturnBridge.PENDING_KEY,extensions.getJSONObject("living_home_pending").toString());
    else ed.remove(CloudReturnBridge.PENDING_KEY);
    ed.putString(CloudReturnBridge.APPLIED_KEY,extensions.getJSONArray("living_home_applied").toString());
    ed.putString(RECEIPTS,extensions.getJSONArray("contact_receipts").toString());
    // Intake payload files never travel with JSON. Do not restore dangling metadata.
    // They remain on this device unless explicitly exported. Imported external
    // registry entries are omitted rather than falsely treated as recovered content.
  }
  public static JSONObject exportReceipt(SharedPreferences sp)throws Exception{
    return new JSONObject().put("schema",SCHEMA).put("contacts",receipts(sp))
      .put("physical_owner_execution_claimed",false)
      .put("external_bixby_galaxy_ai_control_claimed",false);
  }
}
