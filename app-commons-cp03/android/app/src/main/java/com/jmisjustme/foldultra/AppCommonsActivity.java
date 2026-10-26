package com.jmisjustme.foldultra;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputFilter;
import android.text.TextWatcher;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

/** Independent original JM native Android app, no provider dependencies.
 * App identity and data namespace are SEPARATE from the existing Fold Ultra.
 * Source/JVM organs inherit by exact file SHA in the CP03 tree; do not modify.
 * UI paints only local state; successful writes are established by readback. */
public final class AppCommonsActivity extends Activity {
  static final String PREF="jm.appcommons.cp03.native";
  static final int PICK=601,SAVE_JSON=602;
  static final int BG=0xff0b1220,CARD=0xff182339,WHITE=0xffedf5ff,MUTED=0xffb2c5df,CYAN=0xff71e2dc;
  SharedPreferences sp; EditText source; TextView status; boolean suppress=false, custodyHold=false;
  String pendingExport=null,pendingDraft=null,pendingSaved=null;int pendingRev=-1;
  @Override public void onCreate(Bundle state){super.onCreate(state);
    getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);
    sp=getSharedPreferences(PREF,MODE_PRIVATE);
    try{String draft=sp.getString("draft","");String hash=sp.getString("draftHash",JMAppCommonsCapsule.sha(""));
      if(!hash.equals(JMAppCommonsCapsule.sha(draft)))throw new IllegalStateException("Draft digest mismatch");
      String saved=sp.getString("saved","");if(!sp.getString("savedHash",JMAppCommonsCapsule.sha("")).equals(JMAppCommonsCapsule.sha(saved)))
        throw new IllegalStateException("Snapshot digest mismatch");
      JMOriginalStructures.checked(draft);JMOriginalStructures.checked(saved);
    }catch(Exception e){custodyHold=true;}
    paint();
  }
  TextView text(String value,int size,int color){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setLineSpacing(3f,1.08f);return t;}
  void line(LinearLayout root,String value,int size,int color){TextView t=text(value,size,color);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,7,0,7);root.addView(t,p);}
  void button(LinearLayout parent,String label,Runnable work){Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setContentDescription(label);
    b.setTextColor(WHITE);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xff2d4362));
    LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,5,0,5);parent.addView(b,p);b.setOnClickListener(v->work.run());}
  void status(String result){status.setText(result);}
  void show(String title,String message){new AlertDialog.Builder(this).setTitle(title).setMessage(message).setPositiveButton("Return",null).show();}
  void hold(String message){status("HOLD · "+message);show("JM APP//COMMONS HOLD",message);}
  String draft(){return source.getText().toString();}
  int rev(){return sp.getInt("rev",0);}
  String saved(){return sp.getString("saved","");}
  boolean writeDraft(String value){
    if(custodyHold){status("HOLD · existing store not overwritten");return false;}
    try{JMOriginalStructures.checked(value);
      if(!sp.edit().putString("draft",value).putString("draftHash",JMAppCommonsCapsule.sha(value)).commit())
        throw new IllegalStateException("Storage refused");
      if(!value.equals(sp.getString("draft","")))throw new IllegalStateException("Post-write readback mismatch");
      return true;
    }catch(Exception e){status("HOLD · "+e.getMessage());return false;}
  }
  void paint(){
    ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(BG);
    LinearLayout body=new LinearLayout(this);body.setPadding(22,26,22,24);body.setOrientation(LinearLayout.VERTICAL);scroll.addView(body);
    line(body,"JM  /  APP//COMMONS",27,CYAN);
    line(body,"CP03 · ORIGINAL NATIVE WORKROOM",15,WHITE);
    line(body,"A separate Android application. Original Fold Ultra, ProjectShelf and SessionDeck stay untouched.",13,MUTED);
    source=new EditText(this);source.setGravity(Gravity.TOP|Gravity.START);source.setTextColor(WHITE);
    source.setHintTextColor(MUTED);source.setHint("# My original JM project\n- [ ] Build a real consequence");
    source.setTextSize(16);source.setMinLines(7);source.setMaxLines(14);source.setSingleLine(false);
    source.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE);
    source.setFilters(new InputFilter[]{new InputFilter.LengthFilter(10000)});
    source.setBackgroundTintList(android.content.res.ColorStateList.valueOf(CYAN));
    source.setText(custodyHold?"":sp.getString("draft",""));body.addView(source);
    status=text(custodyHold?"HOLD · Stored source failed validation; no automatic rewrite":"LOCAL READY · Revision "+rev(),13,CYAN);
    body.addView(status);
    source.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int c,int d){}
      public void onTextChanged(CharSequence s,int start,int before,int count){if(!suppress)writeDraft(s.toString());}
      public void afterTextChanged(Editable s){}
    });
    button(body,"INSPECT LOCAL SOURCE",()->{try{show("JM native inspection",JMOriginalStructures.inspect(draft()).report());}
      catch(Exception e){hold(e.getMessage());}});
    button(body,"EXACT DIFF / SNAPSHOT",()->{try{show("JM native exact line comparison",JMOriginalStructures.compare(saved(),draft()).report());}
      catch(Exception e){hold(e.getMessage());}});
    button(body,"SAVE REVIEWED SNAPSHOT",()->snapshot());
    button(body,"VERIFY + IMPORT .JSON",()->chooseImport());
    button(body,"EXPORT VERIFIED .JSON",()->export());
    if(custodyHold)button(body,"RESET INVALID LOCAL STATE (OWNER APPROVAL)",()->{
      new AlertDialog.Builder(this).setTitle("Reset invalid state?")
       .setMessage("This discards this application's corrupted local data. Other JM apps remain separate.")
       .setNegativeButton("KEEP DATA",null).setPositiveButton("RESET",(d,w)->{
          if(!sp.edit().clear().commit()){hold("Reset storage refused");return;}
          custodyHold=false;paint();
       }).show();});
    line(body,"SHARED CONTRACT · JM.AppCommons.Capsule/0.1\nNO PROVIDER ACCESS · NO EXTRA PERMISSIONS\nIMPORT ONLY AFTER OWNER REVIEW",12,MUTED);
    setContentView(scroll);
  }
  void snapshot(){
    try{if(custodyHold)throw new IllegalStateException("Corrupt storage hold");
      final String candidate=JMOriginalStructures.checked(draft()),old=saved();final int before=rev();
      if(candidate.equals(old)){status("UNCHANGED · Snapshot remains revision "+before);return;}
      final String digest=JMAppCommonsCapsule.sha(candidate);
      new AlertDialog.Builder(this).setTitle("Preserve native snapshot "+(before+1)+"?")
       .setMessage("SHA-256 "+digest+"\nOnly this independent app's snapshot is changed.")
       .setNegativeButton("KEEP EDITING",null).setPositiveButton("SAVE",(d,w)->{
         try{if(rev()!=before||!saved().equals(old)||!draft().equals(candidate))
              throw new IllegalStateException("Draft or snapshot changed since review");
           if(before==Integer.MAX_VALUE)throw new IllegalStateException("Revision full");
           if(!sp.edit().putString("saved",candidate).putString("savedHash",digest).putInt("rev",before+1).commit())
              throw new IllegalStateException("Storage refused");
           if(!saved().equals(candidate))throw new IllegalStateException("Saved snapshot readback failed");
           status("SNAPSHOT SAVED · Revision "+(before+1)+" · "+digest.substring(0,16));
         }catch(Exception e){hold(e.getMessage());}
       }).show();
    }catch(Exception e){hold(e.getMessage());}
  }
  void chooseImport(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);
    i.setType("application/json");try{startActivityForResult(i,PICK);}catch(Exception e){hold("Document picker unavailable");}}
  void export(){try{
    if(custodyHold)throw new IllegalStateException("Stored state is in HOLD");
    pendingDraft=JMOriginalStructures.checked(draft());pendingSaved=saved();pendingRev=rev();
    String capsule=JMAppCommonsCapsule.emit("JM App Commons Native",pendingDraft,pendingRev>0?pendingSaved:null,
      Instant.now().toString(),"Native r"+pendingRev);
    JMAppCommonsCapsule.Received r=JMAppCommonsCapsule.verify(capsule);pendingExport=capsule;
    new AlertDialog.Builder(this).setTitle("Export full source?")
      .setMessage(r.evidence()+"\n\nContains FULL source. The chosen document destination only receives content after your explicit approval.")
      .setNegativeButton("KEEP LOCAL",(d,w)->pendingExport=null)
      .setPositiveButton("CHOOSE FILE",(d,w)->{
        Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.setType("application/json");
        i.addCategory(Intent.CATEGORY_OPENABLE);i.putExtra(Intent.EXTRA_TITLE,"JM_APP_COMMONS_NATIVE_CP03.json");
        try{startActivityForResult(i,SAVE_JSON);}catch(Exception e){hold("Export chooser unavailable");}
      }).show();
  }catch(Exception e){hold(e.getMessage());}}
  @Override protected void onActivityResult(int request,int result,Intent data){
    super.onActivityResult(request,result,data);
    if(result!=RESULT_OK||data==null||data.getData()==null){pendingExport=null;return;}
    try{
      if(request==PICK){readAndReview(data.getData());return;}
      if(request==SAVE_JSON){
        if(pendingExport==null||custodyHold||!draft().equals(pendingDraft)||
            !saved().equals(pendingSaved)||rev()!=pendingRev)
          throw new IllegalStateException("Export source changed since approval");
        byte[] bytes=pendingExport.getBytes(StandardCharsets.UTF_8);
        try(OutputStream out=getContentResolver().openOutputStream(data.getData(),"w")){
          if(out==null)throw new IllegalStateException("Document destination refused");out.write(bytes);out.flush();
        }
        status("EXPORT WRITTEN · "+bytes.length+" UTF-8 bytes");
      }
    }catch(Exception e){hold(e.getMessage());}
    finally{pendingExport=null;}
  }
  void readAndReview(Uri uri){
    try{ByteArrayOutputStream out=new ByteArrayOutputStream();
      try(InputStream in=getContentResolver().openInputStream(uri)){
        if(in==null)throw new IllegalStateException("Document stream unavailable");
        byte[] block=new byte[4096];int n;
        while((n=in.read(block))!=-1){if(out.size()+n>JMAppCommonsCapsule.MAX_CAPSULE_BYTES)
          throw new IllegalArgumentException("Capsule exceeds 200000 UTF-8 bytes");out.write(block,0,n);}
      }
      JMAppCommonsCapsule.Received verified=JMAppCommonsCapsule.verify(
        new String(out.toByteArray(),StandardCharsets.UTF_8));
      JMOriginalStructures.checked(verified.source);
      final String before=draft(),savedBefore=saved();final int beforeRev=rev();
      new AlertDialog.Builder(this).setTitle("Adopt verified external JM source?")
        .setMessage(verified.evidence()+"\n\nSOURCE PREVIEW:\n"+
          verified.source.substring(0,Math.min(800,verified.source.length()))+
          "\n\nOnly this app's UNSAVED draft will change. Preserved native snapshot remains untouched.")
        .setNegativeButton("KEEP MY SOURCE",null)
        .setPositiveButton("ADOPT TO DRAFT",(d,w)->{
          try{if(custodyHold||rev()!=beforeRev||!saved().equals(savedBefore)||!draft().equals(before))
               throw new IllegalStateException("Native source changed since review");
            if(!writeDraft(verified.source))throw new IllegalStateException("Imported draft write refused");
            suppress=true;source.setText(verified.source);suppress=false;
            status("NATIVE IMPORT VERIFIED · "+verified.sourceHash.substring(0,18)+"… · snapshot unchanged");
          }catch(Exception e){suppress=false;hold(e.getMessage());}
        }).show();
    }catch(Exception e){hold("Import rejected: "+e.getMessage());}
  }
}
