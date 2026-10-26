package com.jmisjustme.foldultra;

import android.content.SharedPreferences;
import org.json.JSONObject;

/**
 * Owner-mediated external Android Share -> existing native JM SessionDeck draft.
 * Source identity is NOT authenticated; no network, API token, new permission,
 * external app scraping or automatic checkpoint commit. Integration != replacement.
 */
public final class JMCompanionInbox {
  private JMCompanionInbox(){}
  static final String LABEL="[SHARED SOURCE · UNVERIFIED EXTERNAL TEXT]\n";
  public static final class Plan {
    public final String projectId,projectTitle,source,priorDraft,proposedDraft;
    public final String priorPhase,priorNext;
    public final int revision;
    private Plan(String id,String title,int rev,String text,String prior,String proposed,
                 String phase,String next) {
      projectId=id;projectTitle=title;revision=rev;source=text;priorDraft=prior;
      proposedDraft=proposed;priorPhase=phase;priorNext=next;
    }
  }
  public static Plan prepare(SharedPreferences sp,String incoming)throws Exception {
    if(incoming==null)throw new IllegalArgumentException("Missing shared source");
    String source=incoming.trim();
    if(source.isEmpty()||source.length()>2500)
      throw new IllegalArgumentException("Shared source must be 1 to 2,500 characters");
    String id=ProjectShelf.selected(sp);
    JSONObject project=ProjectShelf.find(sp,id);
    if(project==null)throw new IllegalStateException("No selected JM project available");
    JSONObject saved=SessionDeck.find(sp,id);
    String prior=SessionDeck.draftText(sp,saved,"note");
    String phase=SessionDeck.draftText(sp,saved,"phase");
    String next=SessionDeck.draftText(sp,saved,"next_action");
    int rev=saved.getInt("revision");
    String fragment=LABEL+source;
    String proposed=prior.isEmpty()?fragment:prior+"\n\n"+fragment;
    if(proposed.length()>SessionDeck.MAX_NOTES)
      throw new IllegalStateException("JM project draft would exceed 4,000 characters");
    return new Plan(id,project.getString("title"),rev,source,prior,proposed,phase,next);
  }
  public static void stage(SharedPreferences sp,Plan approved)throws Exception {
    if(approved==null)throw new IllegalArgumentException("No approved source plan");
    // Repeat every contextual check immediately before applying the approved
    // draft. The current project, checkpoint revision AND existing drafts must
    // still match exactly; no overwrite after stale owner preview.
    Plan now=prepare(sp,approved.source);
    if(!now.projectId.equals(approved.projectId) ||
       now.revision!=approved.revision ||
       !now.priorDraft.equals(approved.priorDraft) ||
       !now.proposedDraft.equals(approved.proposedDraft) ||
       !now.priorPhase.equals(approved.priorPhase) ||
       !now.priorNext.equals(approved.priorNext))
      throw new IllegalStateException("JM project or draft changed since preview");
    SessionDeck.draft(sp,approved.projectId,"note",approved.proposedDraft);
  }
}
