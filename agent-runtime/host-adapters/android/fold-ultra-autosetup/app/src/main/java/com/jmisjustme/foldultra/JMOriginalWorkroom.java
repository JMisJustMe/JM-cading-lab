package com.jmisjustme.foldultra;

import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.text.Editable;
import android.text.InputFilter;
import android.text.TextWatcher;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;
import org.json.JSONObject;

/**
 * Owner-operated JM original workroom: local source -> structural analysis ->
 * exact comparison -> revision-safe snapshot -> optional native SessionDeck
 * UNSAVED draft. No external account, copied app, API key or new permission.
 * The Structure organ, SessionDeck and ProjectShelf keep separate authority.
 */
public final class JMOriginalWorkroom {
  private JMOriginalWorkroom(){}
  static final String DRAFT="jm.original.v0.1.draft";
  static final String SNAP="jm.original.v0.1.snapshot";
  static final String PREV="jm.original.v0.1.previous";
  static final String REV="jm.original.v0.1.revision";

  static void hold(MainActivity a,String why){
    new AlertDialog.Builder(a).setTitle("HOLD · JM Original Workroom")
        .setMessage(why).setPositiveButton("OK",null).show();
  }
  static String draft(SharedPreferences sp){return sp.getString(DRAFT,"");}
  static String saved(SharedPreferences sp){return sp.getString(SNAP,"");}
  static int revision(SharedPreferences sp){return sp.getInt(REV,0);}

  public static void render(MainActivity a){
    a.title("JM / ORIGINAL STRUCTURES · CP01","Build from the mechanism.",
        "A working offline JM source organ: inspect, compare, preserve and route your own text. Not a copy of any provider app.");
    SharedPreferences sp=a.sp;
    String snapshot=saved(sp);
    a.card("OWNED ENGINE / OFFLINE",JMOriginalStructures.SCHEMA,
        "No network or model required. Text structure, UTF-8 digests and line differences are calculated here on your device.",MainActivity.TEAL);
    LinearLayout entry=a.card("LIVE SOURCE / OWNER-EDITED","JM source buffer",
        "Up to 10,000 characters. Your edits persist locally without changing a saved checkpoint.",MainActivity.BLUE);
    EditText edit=new EditText(a);
    edit.setTextColor(MainActivity.WHITE);
    edit.setHintTextColor(MainActivity.MUTED);
    edit.setTextSize(16);
    edit.setMinLines(5);
    edit.setMaxLines(12);
    edit.setGravity(android.view.Gravity.TOP|android.view.Gravity.START);
    edit.setSingleLine(false);
    edit.setInputType(android.text.InputType.TYPE_CLASS_TEXT|
       android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE|
       android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
    edit.setFilters(new InputFilter[]{new InputFilter.LengthFilter(JMOriginalStructures.MAX_CHARS)});
    edit.setHint("# My JM structure\n- [ ] First useful action\nA locally-owned original source.");
    edit.setText(draft(sp));
    entry.addView(edit);
    edit.addTextChangedListener(new TextWatcher(){
      @Override public void beforeTextChanged(CharSequence s,int start,int count,int after){}
      @Override public void onTextChanged(CharSequence s,int start,int before,int count){
        // This is the work buffer only. Saved snapshot and SessionDeck do not change.
        sp.edit().putString(DRAFT,s.toString()).apply();
      }
      @Override public void afterTextChanged(Editable e){}
    });
    a.btn(entry,"INSPECT STRUCTURE / run local organ",true,()->{
      try{show(a,"JM structure / live analysis",JMOriginalStructures.inspect(draft(sp)).report());}
      catch(Exception e){hold(a,e.getMessage());}
    });
    a.btn(entry,"EXACT DIFF / saved versus working",false,()->{
      try{show(a,"JM line comparison",JMOriginalStructures.compare(saved(sp),draft(sp)).report());}
      catch(Exception e){hold(a,e.getMessage());}
    });
    LinearLayout custody=a.card("REVISIONS / OWNER AUTHORITY",
        "Snapshot "+revision(sp)+" · "+JMOriginalStructures.sha256(snapshot).substring(0,12),
        "Saved and live source remain separate. Snapshot commits require your review. One previous snapshot is retained.",MainActivity.PURPLE);
    a.btn(custody,"PREVIEW → save JM snapshot",true,()->saveWithConsent(a));
    a.btn(custody,"RECOVER previous → working draft only",false,()->recoverWithConsent(a));
    a.btn(custody,"SHARE local structure report → Android",false,()->shareWithConsent(a));

    try{
      JSONObject project=ProjectShelf.find(sp,ProjectShelf.selected(sp));
      String projectName=project==null?"No selected JM project":project.getString("title");
      LinearLayout handoff=a.card("REAL CROSS-BODY CONTACT","JM Project Draft · "+projectName,
          "Stage a bounded analysis in the existing UNSAVED SessionDeck note. Preserve saved revision, current drafts, phase and next action.",MainActivity.TEAL);
      a.btn(handoff,"REVIEW → add analysis to selected JM project",false,()->stageToProject(a));
    }catch(Exception e){hold(a,"ProjectShelf unreadable: "+e.getMessage());}
    a.btn(a.page,"← JM Root",false,()->{a.tab=0;a.render();});
  }
  static void show(MainActivity a,String title,String message){
    new AlertDialog.Builder(a).setTitle(title).setMessage(message)
      .setPositiveButton("Return to work",null).show();
  }

  static void saveWithConsent(MainActivity a){
    SharedPreferences sp=a.sp;
    try{
      final String candidate=JMOriginalStructures.checked(draft(sp));
      final String old=saved(sp);
      final int rev=revision(sp);
      final String digest=JMOriginalStructures.sha256(candidate);
      new AlertDialog.Builder(a).setTitle("Preserve JM snapshot "+(rev+1)+"?")
          .setMessage("LOCAL JM DATA ONLY\n\nRevision "+rev+" → "+(rev+1)+
              "\nSHA-256 "+digest+"\n\n"+JMOriginalStructures.inspect(candidate).report()+
              "\n\nThis does not commit a SessionDeck checkpoint.")
          .setNegativeButton("Keep editing",null)
          .setPositiveButton("SAVE SNAPSHOT",(d,w)->{
            try{
              if(revision(sp)!=rev||!saved(sp).equals(old)||!draft(sp).equals(candidate))
                throw new IllegalStateException("Source or revision changed since owner preview");
              if(rev==Integer.MAX_VALUE)throw new IllegalStateException("Revision exhausted");
              boolean written=sp.edit().putString(PREV,old)
                  .putString(SNAP,candidate).putInt(REV,rev+1).commit();
              if(!written)throw new IllegalStateException("Snapshot storage refused");
              a.render();
              Toast.makeText(a,"JM snapshot saved · revision "+(rev+1),Toast.LENGTH_LONG).show();
            }catch(Exception e){hold(a,e.getMessage());}
          }).show();
    }catch(Exception e){hold(a,e.getMessage());}
  }
  static void recoverWithConsent(MainActivity a){
    SharedPreferences sp=a.sp;
    final int rev=revision(sp);
    if(rev<1){hold(a,"No previous snapshot exists yet");return;}
    final String previous=sp.getString(PREV,"");
    final String before=draft(sp);
    final String saved=saved(sp);
    new AlertDialog.Builder(a).setTitle("Recover prior JM source?")
        .setMessage("Previous source SHA-256: "+JMOriginalStructures.sha256(previous)+
            "\nRestore only to your UNSAVED working buffer. Snapshot "+rev+
            " and project checkpoints remain unchanged.")
        .setNegativeButton("Keep current draft",null)
        .setPositiveButton("RECOVER TO DRAFT",(d,w)->{
          try{
            if(revision(sp)!=rev||!saved(sp).equals(saved)||!draft(sp).equals(before))
              throw new IllegalStateException("Draft or snapshot changed; recovery refused");
            if(!sp.edit().putString(DRAFT,previous).commit())
              throw new IllegalStateException("Recovery write failed");
            a.render();
          }catch(Exception e){hold(a,e.getMessage());}
        }).show();
  }
  static void shareWithConsent(MainActivity a){
    try{
      final String source=draft(a.sp);
      final String report=JMOriginalStructures.inspect(source).report();
      new AlertDialog.Builder(a).setTitle("Export original JM structure?")
          .setMessage("Android will ask which app receives this REPORT. It includes structure, task labels and SHA-256, not your whole original source. Nothing leaves until you choose a recipient.")
          .setNegativeButton("Keep inside JM",null)
          .setPositiveButton("OPEN ANDROID SHARE",(d,w)->{
            try{
              if(!draft(a.sp).equals(source))throw new IllegalStateException("Source changed since preview");
              Intent share=new Intent(Intent.ACTION_SEND);
              share.setType("text/plain");
              share.putExtra(Intent.EXTRA_TEXT,report);
              a.startActivity(Intent.createChooser(share,"Share JM-owned structure report"));
            }catch(Exception e){hold(a,e.getMessage());}
          }).show();
    }catch(Exception e){hold(a,e.getMessage());}
  }
  static void stageToProject(MainActivity a){
    SharedPreferences sp=a.sp;
    try{
      final String source=draft(sp);
      if(source.trim().isEmpty())throw new IllegalArgumentException("Enter JM source text first");
      final JMOriginalStructures.Analysis analysis=JMOriginalStructures.inspect(source);
      final String id=ProjectShelf.selected(sp);
      final JSONObject project=ProjectShelf.find(sp,id);
      if(project==null)throw new IllegalStateException("Selected JM project disappeared");
      final JSONObject checkpoint=SessionDeck.find(sp,id);
      final int rev=checkpoint.getInt("revision");
      final String prior=SessionDeck.draftText(sp,checkpoint,"note");
      final String phase=SessionDeck.draftText(sp,checkpoint,"phase");
      final String next=SessionDeck.draftText(sp,checkpoint,"next_action");
      final String appendix="\n\n[JM ORIGINAL STRUCTURES · LOCAL]\n"+
          analysis.report().substring(0,Math.min(1800,analysis.report().length()));
      final String proposed=prior+appendix;
      if(proposed.length()>SessionDeck.MAX_NOTES)
        throw new IllegalArgumentException("JM project draft would exceed 4,000 chars");
      new AlertDialog.Builder(a).setTitle("Stage local JM analysis?")
          .setMessage("Project: "+project.getString("title")+"\nSaved revision: "+rev+
              "\nLocal source digest: "+analysis.hash+
              "\n\nOnly structural analysis goes into the UNSAVED project note. No checkpoint is committed or provider contacted.")
          .setNegativeButton("Keep separate",null)
          .setPositiveButton("ADD TO JM PROJECT DRAFT",(d,w)->{
            try{
              JSONObject now=SessionDeck.find(sp,id);
              if(!ProjectShelf.selected(sp).equals(id)||now.getInt("revision")!=rev||
                 !draft(sp).equals(source)||
                 !SessionDeck.draftText(sp,now,"note").equals(prior)||
                 !SessionDeck.draftText(sp,now,"phase").equals(phase)||
                 !SessionDeck.draftText(sp,now,"next_action").equals(next))
                 throw new IllegalStateException("JM source or project authority changed since preview");
              SessionDeck.draft(sp,id,"note",proposed);
              Toast.makeText(a,"Analysis staged in UNSAVED JM project draft",Toast.LENGTH_LONG).show();
              a.tab=8;a.render();
            }catch(Exception e){hold(a,e.getMessage());}
          }).show();
    }catch(Exception e){hold(a,e.getMessage());}
  }
}
