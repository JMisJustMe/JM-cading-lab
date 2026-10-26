package com.jmisjustme.foldultra;

import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONObject;

/** CP03: reuse actual JM saved checkpoint as an explicit, revocable Android share.
 *  Does not read external apps, transmit credentials or auto-send private content.
 */
public final class JMCompanionShare {
  private JMCompanionShare(){}
  public static final class Prepared {
    public final String projectId, projectTitle, payload;
    public final int revision;
    private Prepared(String id,String title,int revision,String payload){
      this.projectId=id;this.projectTitle=title;this.revision=revision;this.payload=payload;
    }
  }
  public static Prepared prepare(SharedPreferences sp) throws Exception {
    String id=ProjectShelf.selected(sp);
    JSONObject project=ProjectShelf.find(sp,id);
    if(project==null)throw new IllegalStateException("Selected JM project no longer exists");
    JSONObject snapshot=SessionDeck.find(sp,id);
    int revision=snapshot.getInt("revision");
    if(revision<1)throw new IllegalStateException("Save a JM session checkpoint before sharing");
    String note=snapshot.getString("note");
    String next=snapshot.getString("next_action");
    String phase=snapshot.getString("phase");
    if(note.trim().isEmpty()&&next.trim().isEmpty())
      throw new IllegalStateException("Saved checkpoint has no content to share");
    if(!note.equals(SessionDeck.draftText(sp,snapshot,"note")) ||
       !next.equals(SessionDeck.draftText(sp,snapshot,"next_action")) ||
       !phase.equals(SessionDeck.draftText(sp,snapshot,"phase")))
      throw new IllegalStateException("Unsaved JM changes: save or discard drafts first");
    String title=project.getString("title");
    String body="JM ECOSTATE · OWNER-APPROVED SAVED CHECKPOINT\\n"+
      "Project: "+title+"\\n"+
      "Family: "+project.getString("family")+"\\n"+
      "Revision: "+revision+"\\n"+
      "Phase: "+phase+"\\n\\n"+
      "SAVED NOTE\\n"+note+"\\n\\nNEXT ACTION\\n"+next;
    // Upper bound defends the receiving app, preview, share intent and trace.
    if(body.length()>5000)throw new IllegalStateException("Checkpoint exceeds safe share bound");
    return new Prepared(id,title,revision,body);
  }
  public static boolean stillCurrent(SharedPreferences sp,Prepared approved){
    try{
      Prepared now=prepare(sp);
      return approved.projectId.equals(now.projectId) &&
        approved.revision==now.revision &&
        approved.payload.equals(now.payload);
    }catch(Exception e){return false;}
  }
  public static Intent chooser(Prepared approved){
    Intent send=new Intent(Intent.ACTION_SEND);
    send.setType("text/plain");
    send.putExtra(Intent.EXTRA_TEXT,approved.payload);
    return Intent.createChooser(send,"Share JM saved checkpoint");
  }
}
