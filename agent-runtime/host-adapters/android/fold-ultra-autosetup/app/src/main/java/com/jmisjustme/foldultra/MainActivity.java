package com.jmisjustme.foldultra;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.*;
import android.content.res.Configuration;
import android.content.pm.*;
import android.graphics.*;
import android.graphics.drawable.*;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.text.*;
import android.view.*;
import android.widget.*;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
  static final String PREF="jm.fold.ultra.prelaunch.v0.2", SCHEMA="JM.FoldUltraSetup/0.6";
  static final int BG=0xff090E19,PANEL=0xff141E30,WHITE=0xffEDF4FF,MUTED=0xffA8B9D0;
  static final int BLUE=0xff77BFFF,PURPLE=0xffC5A0FF,TEAL=0xff74E4D2;
  static final int EXPORT=203,IMPORT=204,PREFLIGHT_EXPORT=205;
  SharedPreferences sp;
  LinearLayout page;
  boolean wide;
  int widthDp,tab=0,lastWidth=-1;

  @Override public void onCreate(Bundle state){
    super.onCreate(state);sp=getSharedPreferences(PREF,MODE_PRIVATE);
    if(!sp.contains("root"))sp.edit().putString("root",
      getPreferences(0).getString("root","JM FOLD ULTRA · Paired Root")).apply();
    if(state!=null)tab=state.getInt("tab",0);
    getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);
    getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    render();
    if(state==null)inspectIncoming(getIntent());
  }
  @Override protected void onNewIntent(Intent intent){
    super.onNewIntent(intent);setIntent(intent);inspectIncoming(intent);
    UsbBridge.offer(this,sp,()->render());
  }
  @Override public void onSaveInstanceState(Bundle out){out.putInt("tab",tab);super.onSaveInstanceState(out);}
  @Override protected void onResume(){super.onResume();if(getResources().getConfiguration().screenWidthDp!=lastWidth)render();
    UsbBridge.offer(this,sp,()->render());}
  @Override public void onConfigurationChanged(Configuration c){super.onConfigurationChanged(c);render();}
  @Override public void onBackPressed(){
    if(!sp.getBoolean("ready",false) && sp.getInt("stage",0)>0){stage(sp.getInt("stage",0)-1);return;}
    if(sp.getBoolean("ready",false)&&tab>0){tab=0;render();return;}
    super.onBackPressed();
  }
  int dp(float n){return (int)(getResources().getDisplayMetrics().density*n+0.5f);}
  GradientDrawable bg(int fill,int border,int r){
    GradientDrawable d=new GradientDrawable();d.setColor(fill);d.setCornerRadius(dp(r));
    if(border!=0)d.setStroke(dp(1),border);return d;
  }
  GradientDrawable grad(int a,int b,int r){
    GradientDrawable d=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{a,b});
    d.setCornerRadius(dp(r));return d;
  }
  TextView t(String s,int size,int color,boolean strong){
    TextView x=new TextView(this);x.setText(s);x.setTextSize(size);x.setTextColor(color);
    x.setLineSpacing(dp(2),1.05f);
    if(strong)x.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
    return x;
  }
  void label(LinearLayout dest,String s,int size,int col,boolean strong){dest.addView(t(s,size,col,strong));}
  void space(LinearLayout dest,int h){View x=new View(this);dest.addView(x,new LinearLayout.LayoutParams(1,dp(h)));}
  void title(String kicker,String head,String detail){
    label(page,kicker,12,wide?PURPLE:BLUE,true);space(page,10);
    label(page,head,wide?35:29,WHITE,true);space(page,9);
    label(page,detail,15,MUTED,false);space(page,12);
  }
  LinearLayout card(String kicker,String head,String copy,int color){
    LinearLayout x=new LinearLayout(this);x.setOrientation(1);x.setPadding(dp(18),dp(18),dp(18),dp(18));
    x.setBackground(bg(PANEL,color,20));
    LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);
    p.setMargins(0,dp(8),0,dp(8));page.addView(x,p);
    label(x,kicker,11,color,true);space(x,8);
    label(x,head,20,WHITE,true);
    if(!copy.isEmpty()){space(x,7);label(x,copy,14,MUTED,false);}
    return x;
  }
  void btn(LinearLayout target,String s,boolean primary,Runnable action){
    Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextSize(15);
    b.setTextColor(primary?BG:WHITE);b.setElevation(0);
    b.setBackground(primary?grad(BLUE,PURPLE,14):bg(0xff202e47,0xff304463,14));
    LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(56));p.setMargins(0,dp(6),0,dp(3));
    target.addView(b,p);b.setOnClickListener(v->action.run());
  }
  void stage(int n){sp.edit().putInt("stage",Math.max(0,Math.min(4,n))).apply();render();}
  void render(){
    widthDp=getResources().getConfiguration().screenWidthDp;lastWidth=widthDp;wide=widthDp>=500;
    ScrollView scroll=new ScrollView(this);scroll.setBackgroundColor(BG);scroll.setFillViewport(true);
    scroll.setVerticalScrollBarEnabled(false);
    page=new LinearLayout(this);page.setOrientation(1);
    page.setPadding(dp(wide?30:18),dp(wide?44:30),dp(wide?30:18),dp(30));scroll.addView(page);
    label(page,"JM / ECOSTATE     •     FOLD ULTRA 0.6",12,MUTED,true);space(page,14);
    View accent=new View(this);accent.setBackground(grad(BLUE,PURPLE,7));
    page.addView(accent,new LinearLayout.LayoutParams(dp(wide?168:105),dp(4)));space(page,20);
    if(sp.getBoolean("ready",false))dashboard();else prelaunch();
    space(page,30);label(page,"NO RESET · NO ROOT · NO SILENT PERMISSIONS · NO LAUNCHER TAKEOVER",11,MUTED,false);
    space(page,6);label(page,"DEVICE DING: OPEN UNTIL TESTED ON THE FOLD.",11,MUTED,false);
    setContentView(scroll);
  }
  void hero(int height){
    View art=new View(this){
      Paint p=new Paint(3);
      @Override protected void onDraw(Canvas c){
        float w=getWidth(),h=getHeight();
        p.setShader(new LinearGradient(0,0,w,h,0xff123348,0xff2b1b4b,Shader.TileMode.CLAMP));
        c.drawRoundRect(0,0,w,h,dp(22),dp(22),p);p.setShader(null);
        for(int i=0;i<5;i++){
          p.setColor(i%2==0?0x5586bfff:0x556c57cb);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(dp(1));
          c.drawCircle(w*.72f,h*.50f,dp(22+i*17),p);
        }
        p.setColor(0xff99b8f6);p.setStrokeWidth(dp(2));
        Path route=new Path();route.moveTo(w*.10f,h*.74f);
        route.cubicTo(w*.29f,h*.64f,w*.36f,h*.13f,w*.53f,h*.35f);
        route.cubicTo(w*.66f,h*.57f,w*.76f,h*.74f,w*.89f,h*.30f);
        c.drawPath(route,p);p.setStyle(Paint.Style.FILL);
        p.setColor(BLUE);c.drawCircle(w*.10f,h*.74f,dp(5),p);
        p.setColor(TEAL);c.drawCircle(w*.53f,h*.35f,dp(5),p);
        p.setColor(PURPLE);c.drawCircle(w*.89f,h*.30f,dp(6),p);
        p.setTypeface(Typeface.create(Typeface.MONOSPACE,Typeface.BOLD));
        p.setColor(WHITE);p.setTextSize(dp(wide?16:12));
        c.drawText("JM / PAIRED ROOT",dp(17),dp(32),p);
        p.setColor(0xffb6cdea);p.setTextSize(dp(11));
        c.drawText("SOURCE  ↔  WORKFIELD",dp(17),h-dp(20),p);
      }
    };
    art.setContentDescription("JM paired Source and Workfield flowing connection");
    page.addView(art,new LinearLayout.LayoutParams(-1,dp(height)));
  }
  void progress(int n){
    LinearLayout row=new LinearLayout(this);row.setOrientation(0);
    page.addView(row,new LinearLayout.LayoutParams(-1,dp(5)));
    for(int k=0;k<5;k++){
      View v=new View(this);v.setBackground(bg(k<=n?BLUE:0xff273a55,0,6));
      LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,-1,1);
      p.setMargins(k==0?0:dp(3),0,k==4?0:dp(3),0);row.addView(v,p);
    }
    space(page,10);label(page,"PRELAUNCH / "+(n+1)+" OF 5",12,MUTED,true);space(page,16);
  }
  void prelaunch(){
    int n=sp.getInt("stage",0);progress(n);
    switch(n){
      case 0:
        title("INITIAL OPENING / ARRIVAL","Your device.\nYour working field.",
          "An owned JM route into the phone you actually use. No generic launcher imposed.");
        hero(wide?226:180);space(page,9);
        LinearLayout a=card("PRESERVATION","Nothing gets erased.",
          "Your Samsung home pages, apps, existing JM bodies and files stay where they are.",BLUE);
        label(a,"COMPACT  /  Capture and quick access",14,WHITE,true);space(a,7);
        label(a,"EXPANDED  /  Create, test and recover",14,WHITE,true);
        break;
      case 1:
        title("YOUR PRIORITY","Decide what opens first.",
          "This only changes JM's quick routes. Every other route remains available.");
        pick("CREATE","Creator first","JM Ecostate, GitHub, notes");
        pick("PLAY","Playtest first","Games, test tools and quick files");
        pick("EVERYDAY","Everyday first","Files, notes and communication");
        break;
      case 2:
        title("SAME ROOT / TWO FIELDS","A shared starting point.",
          "We respond to available screen width, not an unverified hinge sensor.");
        pairedPreview();
        LinearLayout d=card("CURRENT DISPLAY",""+widthDp+" dp  /  "+(wide?"WORKFIELD":"SOURCE"),
          "Your choice and saved root persist when Android changes screen size.",TEAL);
        label(d,"Physically fold/unfold while this screen is open to check the adaptation.",13,WHITE,false);
        break;
      case 3:
        title("GALAXY + JM","Discover, then connect.",
          "Your Fold brings Now Nudge, Photo Assist, Multi Window and more. JM will route to them, not impersonate them.");
        LinearLayout nativeInfo=card("NATIVE CAPABILITIES","Eight Samsung tools to explore",
          "After entering JM, open the GALAXY tab to inspect features, launch supported apps and mark what you personally test.",PURPLE);
        label(nativeInfo,"NOW NUDGE · NOW BRIEF · AI ASSISTANTS · PHOTO ASSIST",13,WHITE,true);
        space(nativeInfo,7);
        label(nativeInfo,"SCAN · MULTI WINDOW · DeX · MODES & ROUTINES",13,WHITE,true);
        LinearLayout c=card("LOCAL APPS","Owner-device route candidates","Unavailable routes remain HOLD.",BLUE);
        check(c,"My Files","com.sec.android.app.myfiles");
        check(c,"Samsung Notes","com.samsung.android.app.notes");
        check(c,"ChatGPT","com.openai.chatgpt");
        LinearLayout links=card("JM SOURCES","Existing public estate","Open in your preferred browser.",PURPLE);
        btn(links,"JM Ecostate  ↗",false,()->url("https://jmisjustme.github.io/JM-cading-lab/"));
        btn(links,"JM Games  ↗",false,()->url("https://jmisjustme.github.io/JM-cading-lab/games-beyond/"));
        break;
      default:
        title("READY / USER AUTHORITY","Open JM.\nKeep your Samsung.",
          "The preparation is complete inside this app. No other part of your phone is modified.");
        LinearLayout receipt=card("PRELAUNCH RECEIPT","Configured for "+sp.getString("focus","CREATE"),
          "Current surface: "+(wide?"WORKFIELD":"SOURCE")+"  ·  "+widthDp+" dp",TEAL);
        label(receipt,"✓ Stored preferences   ✓ Native launcher routes",14,WHITE,true);
        space(receipt,8);
        label(receipt,"✓ Manual JSON recovery   ✓ No dangerous permissions",14,WHITE,true);
        space(receipt,12);
        label(receipt,"Owner-device runtime and Fold contact: NOT YET VERIFIED.",13,MUTED,false);
        space(receipt,12);
        btn(receipt,"Run local preflight before entry",false,()->{
          runPreflight();
          new AlertDialog.Builder(this).setTitle("Local preflight captured")
            .setMessage("App-level checks were saved. After entry, open CONTROL → PREFLIGHT to review or export. Physical Fold testing remains separate.")
            .setPositiveButton("OK",null).show();
        });
    }
    space(page,16);
    if(n>0)btn(page,"←  Previous stage",false,()->stage(n-1));
    if(n<4)btn(page,n==0?"Begin the opening  →":"Continue  →",true,()->stage(n+1));
    else btn(page,"ENTER JM FOLD ULTRA  →",true,()->{
      sp.edit().putBoolean("ready",true).apply();tab=0;render();
    });
    space(page,9);label(page,"Progress saves locally. Return or reopen without losing your selection.",12,MUTED,false);
  }
  void pick(String id,String head,String detail){
    boolean chosen=id.equals(sp.getString("focus","CREATE"));
    LinearLayout a=card(chosen?"● SELECTED / "+id:"○ OPTION / "+id,head,detail,chosen?TEAL:0xff344964);
    a.setClickable(true);a.setFocusable(true);
    a.setContentDescription(head+(chosen?", selected":", tap to select"));
    a.setOnClickListener(v->{sp.edit().putString("focus",id).apply();render();});
    space(a,7);label(a,chosen?"CURRENT FOCUS":"TAP TO SELECT →",12,chosen?TEAL:BLUE,true);
  }
  void pairedPreview(){
    LinearLayout pair=new LinearLayout(this);pair.setOrientation(wide?0:1);page.addView(pair);
    for(int i=0;i<2;i++){
      boolean open=i==1;
      LinearLayout item=new LinearLayout(this);item.setOrientation(1);
      item.setPadding(dp(16),dp(18),dp(14),dp(14));
      item.setBackground(bg(open?0xff241d3b:0xff142e44,open?PURPLE:BLUE,17));
      LinearLayout.LayoutParams p;
      if(wide){p=new LinearLayout.LayoutParams(0,dp(165),1f);p.setMargins(0,dp(7),open?0:dp(8),dp(6));}
      else {p=new LinearLayout.LayoutParams(-1,dp(120));p.setMargins(0,dp(7),0,0);}
      pair.addView(item,p);
      label(item,open?"02 / EXPANDED":"01 / COMPACT",11,open?PURPLE:BLUE,true);space(item,9);
      label(item,open?"WORKFIELD":"SOURCE",22,WHITE,true);space(item,6);
      label(item,open?"Create · Playtest · Recover":"Capture · Access · Continue",13,MUTED,false);
    }
  }
  boolean has(String pkg){try{return getPackageManager().getLaunchIntentForPackage(pkg)!=null;}catch(Exception x){return false;}}
  void check(LinearLayout target,String name,String pkg){
    boolean yes=has(pkg);
    space(target,11);label(target,(yes?"● AVAILABLE / ":"○ HOLD / ")+name,14,yes?TEAL:MUTED,true);
  }
  void dashboard(){
    title("JM PAIRED ROOT / "+(wide?"WORKFIELD":"SOURCE"),"JM FOLD ULTRA",
      "One JM entrance; separate surface layouts; the same saved configuration.");
    hero(wide?142:110);space(page,16);
    LinearLayout tabs=new LinearLayout(this);tabs.setOrientation(0);page.addView(tabs);
    String[] labels={"ROOT","GALAXY","ROUTES","CONTROL"};
    for(int i=0;i<labels.length;i++){
      final int value=i;Button b=new Button(this);b.setAllCaps(false);b.setText(labels[i]);
      b.setTextSize(12);b.setTextColor(i==tab?BG:WHITE);
      b.setBackground(bg(i==tab?BLUE:PANEL,i==tab?0:0xff334a67,12));
      LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(50),1);
      p.setMargins(i==0?0:dp(3),0,i==2?0:dp(3),0);tabs.addView(b,p);
      b.setOnClickListener(v->{tab=value;render();});
    }
    space(page,12);
    if(tab==0)root();else if(tab==1)nativeHub();else if(tab==2)routes();else if(tab==3)control();else if(tab==4)preflight();else if(tab==5)usbRoom();else projectRoom();
  }
  void root(){
    String focus=sp.getString("focus","CREATE");
    LinearLayout c=card("CURRENT FIELD",focus+" / "+(wide?"WORKFIELD":"SOURCE"),
      wide?"Expanded creative and testing routes.":"One-handed fast routes and capture.",PURPLE);
    if(focus.equals("CREATE")){
      btn(c,"JM Ecostate  ↗",true,()->url("https://jmisjustme.github.io/JM-cading-lab/"));
      btn(c,"GitHub source  ↗",false,()->url("https://github.com/JMisJustMe/JM-cading-lab"));
      btn(c,"Samsung Notes",false,()->app("com.samsung.android.app.notes"));
    }else if(focus.equals("PLAY")){
      btn(c,"JM Games  ↗",true,()->url("https://jmisjustme.github.io/JM-cading-lab/games-beyond/"));
      btn(c,"My Files",false,()->app("com.sec.android.app.myfiles"));
    }else{
      btn(c,"My Files",true,()->app("com.sec.android.app.myfiles"));
      btn(c,"Samsung Notes",false,()->app("com.samsung.android.app.notes"));
      btn(c,"ChatGPT",false,()->app("com.openai.chatgpt"));
    }
    LinearLayout note=card("ONE SHARED AUTHORITY","JM root note","Saved immediately on either display.",TEAL);
    EditText e=new EditText(this);e.setTextColor(WHITE);e.setHintTextColor(MUTED);
    e.setTextSize(15);e.setMinLines(2);e.setHint("Your shared working note");
    e.setInputType(1|android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE);
    e.setFilters(new InputFilter[]{new InputFilter.LengthFilter(10000)});
    e.setText(sp.getString("root","JM FOLD ULTRA · Paired Root"));
    note.addView(e);
    e.addTextChangedListener(new TextWatcher(){
      public void beforeTextChanged(CharSequence x,int s,int c,int a){}
      public void onTextChanged(CharSequence x,int s,int b,int c){sp.edit().putString("root",x.toString()).apply();}
      public void afterTextChanged(Editable x){}
    });
    btn(note,"Export JM configuration",false,()->file(true));
    LinearLayout intake=card("REAL DEVICE WORKFLOW","Share into JM",
      "From a browser, Notes or another app use Android Share → JM Fold Ultra. Review text or a link before adding it to this root note.",BLUE);
    label(intake,"No background reading. No clipboard spying. Shared content is never stored until you approve.",13,MUTED,false);
    LinearLayout action=card("ONE-TOUCH SESSION","Use a session recipe",
      "A recipe changes JM's own quick routes and offers a launch. It cannot silently create a Samsung App Pair.",PURPLE);
    btn(action,"Make  /  JM creator routes",false,()->session("MAKE"));
    btn(action,"Playtest  /  JM games",false,()->session("PLAYTEST"));
    btn(action,"Research  /  apps and AI",false,()->session("RESEARCH"));
    btn(action,"Recovery  /  files and export",false,()->session("RECOVERY"));
    btn(page,"PROJECT CONTACT  /  Open my JM shelf →",true,()->{tab=6;render();});
    btn(page,"USB CONTACT  /  Setup & recovery →",false,()->{tab=5;render();});
    btn(page,"PREFLIGHT  /  Diagnostics & receipts →",true,()->{tab=4;render();});
  }

  static final String[] NATIVE_KEYS={
    "now_nudge","now_brief","assistants","photo_assist",
    "scanner","multi_window","dex","routines"
  };
  int nativeTriedCount(){
    int n=0;for(String key:NATIVE_KEYS)if(sp.getBoolean("tried."+key,false))n++;
    return n;
  }
  void nativeGroup(String group){
    sp.edit().putString("native.group",group).apply();render();
  }
  void nativeHub(){
    title("SAMSUNG NATIVE / JM INHERITANCE","Your Fold already has tools.",
      "Try Samsung's features directly. JM saves only which ones you choose to mark as explored.");
    LinearLayout summary=card("NATIVE CONTACT",""+nativeTriedCount()+" / 8 owner-marked",
      "Marks reflect your own exploration, not automatic verification, data access or integration.",TEAL);
    label(summary,"No Galaxy AI permissions requested. No Samsung settings changed here.",13,MUTED,false);
    space(page,6);
    LinearLayout tabs=new LinearLayout(this);tabs.setOrientation(0);page.addView(tabs);
    String[] groups={"ASSIST","CREATE","WORK"};
    String selected=sp.getString("native.group","ASSIST");
    for(String group:groups){
      Button b=new Button(this);b.setAllCaps(false);b.setText(group);b.setTextSize(12);
      b.setTextColor(group.equals(selected)?BG:WHITE);
      b.setBackground(bg(group.equals(selected)?BLUE:PANEL,group.equals(selected)?0:0xff334a67,12));
      LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(49),1);
      p.setMargins(dp(3),0,dp(3),0);tabs.addView(b,p);
      b.setOnClickListener(v->nativeGroup(group));
    }
    space(page,8);
    if(selected.equals("ASSIST")){
      capability("now_nudge","Now Nudge","SAMSUNG / CONTEXT",
        "Suggestions from supported on-screen messages can lead to Calendar, Maps and split view.",
        "Settings → Galaxy AI → Now Nudge. Requires Samsung account; supported apps and languages only.",
        "settings");
      capability("now_brief","Now Brief","SAMSUNG / DAILY",
        "Briefings and cards for schedules, weather, reminders and selected interests.",
        "Settings → Galaxy AI → Now brief (menu names vary). Review Content to include. Your home-screen widget is a separate entry.",
        "settings");
      capability("assistants","AI assistants","SAMSUNG / CHOICE",
        "Bixby and other installed assistants serve different jobs. No single provider needs to own every task.",
        "Choose your preferred assistant in Android's default-app settings, if supported. Third-party assistant capabilities and availability differ.",
        "settings");
    } else if(selected.equals("CREATE")){
      capability("photo_assist","Photo Assist","GALAXY / VISUAL",
        "Edit, remove or generate visual changes in Samsung Gallery, then compare results.",
        "Open Gallery → select an image → Edit → Galaxy AI or Photo Assist (where available). Save or export results consciously.",
        "gallery");
      capability("scanner","Document scanner","GALAXY / CAPTURE",
        "Digitise paper notes, sketches and receipts using Samsung Camera's document detection.",
        "Open Camera and point at a document; use the scan prompt if shown. This shortcut launches Camera only; no scan is taken by JM.",
        "camera");
    } else {
      capability("multi_window","Multi Window + App Pairs","GALAXY / MULTITASK",
        "Two-way/three-way supported app layouts with resizable windows and saved app pairs.",
        "Open Recents → tap supported app icon → Open in split screen view. Save an app pair using Samsung multi-window controls where offered.",
        "settings");
      capability("dex","Samsung DeX","GALAXY / DESKTOP",
        "Desktop-like working environment when connected to supported external display and peripherals.",
        "Open Quick settings → DeX, or search Settings for DeX. A display, keyboard or mouse may be needed.",
        "settings");
      capability("routines","Modes & Routines","GALAXY / AUTOMATION",
        "Automate supported system actions using conditions and modes, without replacing One UI.",
        "Settings → Modes and Routines. Create a safe, reversible rule and test it before treating it as working.",
        "settings");
    }
    LinearLayout receipt=card("BOUNDARY","What's real right now",
      "The launcher and settings remain Samsung-owned. Our handoffs and owner marks are real; private Galaxy AI APIs, Now Nudge events and DeX control are not claimed.",PURPLE);
    btn(receipt,"Open Samsung Settings",false,()->start(new Intent(Settings.ACTION_SETTINGS)));
  }
  void capability(String key,String name,String kind,String description,String pathway,String handoff){
    boolean marked=sp.getBoolean("tried."+key,false);
    LinearLayout card=card(kind,name,description,marked?TEAL:0xff40577a);
    space(card,9);
    label(card,"TRY ON YOUR FOLD",11,BLUE,true);
    space(card,5);
    label(card,pathway,14,WHITE,false);
    space(card,8);
    btn(card,handoff.equals("gallery")?"Open Samsung Gallery":handoff.equals("camera")?"Open Camera":"Open Android Settings",false,
      ()->nativeHandoff(handoff));
    btn(card,marked?"✓ Explored by me · Undo mark":"Mark explored (owner assertion)",false,()->{
      sp.edit().putBoolean("tried."+key,!marked).apply();
      render();
    });
  }
  void nativeHandoff(String kind){
    if(kind.equals("gallery")){
      Intent intent=getPackageManager().getLaunchIntentForPackage("com.sec.android.gallery3d");
      if(intent==null)Toast.makeText(this,"HOLD · Gallery app route not found",Toast.LENGTH_LONG).show();
      else start(intent);
    }else if(kind.equals("camera")){
      start(new Intent("android.media.action.STILL_IMAGE_CAMERA"));
    }else {
      start(new Intent(Settings.ACTION_SETTINGS));
    }
  }


  void session(String kind){
    String focus=kind.equals("PLAYTEST")?"PLAY":kind.equals("RESEARCH")?"EVERYDAY":"CREATE";
    String nativeGroup=kind.equals("PLAYTEST")?"WORK":kind.equals("RESEARCH")?"ASSIST":"CREATE";
    sp.edit().putString("session",kind).putString("focus",focus)
      .putString("native.group",nativeGroup).apply();
    new AlertDialog.Builder(this).setTitle("JM "+kind+" / Ready")
      .setMessage("JM quick routes are prepared. This does not change Samsung system settings or launch two applications.")
      .setNegativeButton("Stay in JM",(d,w)->render())
      .setPositiveButton("Open first route",(d,w)->{
        render();
        if(kind.equals("PLAYTEST"))url("https://jmisjustme.github.io/JM-cading-lab/games-beyond/");
        else if(kind.equals("RECOVERY"))app("com.sec.android.app.myfiles");
        else if(kind.equals("RESEARCH"))app("com.openai.chatgpt");
        else url("https://jmisjustme.github.io/JM-cading-lab/");
      }).show();
  }
  void inspectIncoming(Intent intent){
    if(intent==null||!Intent.ACTION_SEND.equals(intent.getAction()))return;
    if(!"text/plain".equals(intent.getType()))return;
    CharSequence supplied=intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
    if(supplied==null)return;
    String incoming=supplied.toString().trim();
    if(incoming.isEmpty())return;
    // Clear delivery to prevent a replay on subsequent Activity lifecycle events.
    intent.removeExtra(Intent.EXTRA_TEXT);
    if(incoming.length()>2500){
      Toast.makeText(this,"HOLD · Shared text exceeds 2,500 characters",Toast.LENGTH_LONG).show();
      return;
    }
    String excerpt=incoming.length()>220?incoming.substring(0,220)+"…":incoming;
    new AlertDialog.Builder(this).setTitle("SOURCE CONTACT / Android Share")
      .setMessage("Another app shared text with JM:\n\n"+excerpt+"\n\nAppend to your local root note?")
      .setNegativeButton("Discard",null)
      .setPositiveButton("Add to JM",(d,w)->{
        String previous=sp.getString("root","");
        String proposed=previous+"\n\n[SHARED SOURCE]\n"+incoming;
        if(proposed.length()>10000){
          new AlertDialog.Builder(this).setTitle("HOLD · JM note is full")
            .setMessage("No content was saved. Export or shorten the current JM root first.")
            .setPositiveButton("OK",null).show();return;
        }
        sp.edit().putString("root",proposed)
          .putInt("source.count",sp.getInt("source.count",0)+1).apply();
        tab=0;render();
        Toast.makeText(this,"Shared source saved locally",Toast.LENGTH_SHORT).show();
      }).show();
  }
  void runPreflight(){
    try{
      JSONObject data=DevicePreflight.inspect(this,sp,widthDp,wide);
      boolean saved=sp.edit().putString("preflight.last",data.toString(2)).commit();
      if(!saved)throw new IOException("Local receipt save failed");
    }catch(Exception e){
      new AlertDialog.Builder(this).setTitle("HOLD · Preflight not saved")
        .setMessage(e.toString()).setPositiveButton("OK",null).show();
    }
  }
  void preflight(){
    title("LOCAL QA / REPEATABLE","Your preflight workbench.",
      "One tap runs bounded checks; owner contacts remain separate. Nothing modifies Samsung settings.");
    LinearLayout main=card("DEVICE PROBE","Check this Android installation",
      "Inspects the package, permission list, local save/read, available width, visible app targets and shortcut-request support.",TEAL);
    btn(main,"RUN PREFLIGHT NOW",true,()->{runPreflight();render();});
    String receipt=sp.getString("preflight.last","");
    if(!receipt.isEmpty()){
      try{
        JSONObject o=new JSONObject(receipt);
        LinearLayout summary=card("LOCAL RECEIPT","Automatic PASS "+o.optInt("automatic_pass")+" / HOLD "+o.optInt("automatic_hold"),
          "Owner marks "+o.optInt("owner_assertions")+"; untouched manual checks "+o.optInt("manual_open")+". Not a physical Fold certification.",BLUE);
        label(summary,"Device: "+o.optString("device_manufacturer")+" "+o.optString("device_model")
          +"  ·  API "+o.optInt("android_api"),13,MUTED,false);
        space(summary,8);
        org.json.JSONArray checks=o.getJSONArray("checks");
        for(int i=0;i<checks.length();i++){
          JSONObject entry=checks.getJSONObject(i);
          String status=entry.optString("status","OPEN");
          label(summary,status+"  /  "+entry.optString("label"),13,
            status.equals("PASS")?TEAL:status.equals("HOLD")?PURPLE:MUTED,true);
          space(summary,3);
          label(summary,entry.optString("evidence"),12,MUTED,false);
          space(summary,9);
        }
      }catch(Exception e){
        card("RECEIPT","HOLD · Saved diagnostic cannot be parsed","Run the check again.",PURPLE);
      }
    }else card("RECEIPT","Not run yet","This screen does not pretend the checks already happened.",PURPLE);
    LinearLayout checks=card("OWNER CONTACT / HONEST STATUS","Three tests only you can confirm",
      "These marks are editable declarations, not readings from a hinge sensor.",PURPLE);
    ownerMark(checks,"owner.compact_tested","I saw the compact SOURCE UI");
    ownerMark(checks,"owner.expanded_tested","I saw the expanded WORKFIELD UI");
    ownerMark(checks,"owner.reopen_tested","I closed and reopened; my JM note survived");
    LinearLayout preserve=card("RECOVERY","Receipts and configuration",
      "Reports include the device model and a SHA-256 of the root note, but not its content. Configuration export includes the full note by your choice.",BLUE);
    btn(preserve,"Export diagnostic receipt (.json)",false,()->{
      if(sp.getString("preflight.last","").isEmpty()){
        Toast.makeText(this,"Run preflight first",Toast.LENGTH_LONG).show();return;
      }
      Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      intent.setType("application/json");
      intent.putExtra(Intent.EXTRA_TITLE,"JM_FOLD_ULTRA_PREFLIGHT_v0_4.json");
      try{startActivityForResult(intent,PREFLIGHT_EXPORT);}
      catch(Exception e){Toast.makeText(this,"HOLD · No document picker",Toast.LENGTH_LONG).show();}
    });
    btn(preserve,"Export complete JM configuration",false,()->file(true));
    btn(preserve,"Import JM configuration",false,()->file(false));
    label(page,"FINAL CLAIM BOUNDARY / SOURCE COMPILE ≠ DEVICE DING; OWNER MARK ≠ SENSOR MEASUREMENT",12,MUTED,true);
    btn(page,"← Back to JM Root",false,()->{tab=0;render();});
  }
  void ownerMark(LinearLayout where,String key,String title){
    boolean marked=sp.getBoolean(key,false);
    btn(where,(marked?"✓ ":"○ ")+title,false,()->{
      sp.edit().putBoolean(key,!marked).apply();
      // Existing report is intentionally not re-stamped without a fresh diagnostic.
      render();
    });
  }


  void usbRoom(){
    title("JM / USB CONTACT · 0.5","Your phone. Your approval.",
      "Prepare configurations on a trusted laptop, review them here, and keep a recoverable local copy.");
    LinearLayout status=card("CURRENT CONTACT","USB bridge is owner-gated",
      UsbBridge.status(this),TEAL);
    label(status,"Debug APK + authorised ADB required. A staged request is NOT an applied change.",13,MUTED,false);
    LinearLayout launch=card("INBOUND / CONTROLLED","Receive a laptop request",
      "The laptop stages a small JSON request in this app's private files. This screen presents its requested JM-only changes for your approval.",BLUE);
    btn(launch,"Check pending USB request",true,()->UsbBridge.offer(this,sp,()->render()));
    LinearLayout recovery=card("RECOVERY / ONE AUTHORITY","Prepare a protected snapshot",
      "Only after you tap PREPARE can the laptop copy the current JM configuration. The snapshot contains your root note, so protect the laptop and backup.",PURPLE);
    btn(recovery,"Prepare USB recovery snapshot",true,()->UsbBridge.prepareSnapshot(this,sp));
    btn(recovery,"Recover previous approved restore",false,()->UsbBridge.rollback(this,sp,()->render()));
    btn(recovery,"Export through Android Documents instead",false,()->file(true));
    LinearLayout explain=card("FIRST CONTACT / NO SURRENDER","What your laptop can and cannot do",
      "The developer bridge needs a trusted USB debugging connection and a debuggable JM APK. Its profile and restore commands ALWAYS request your approval on this screen.",TEAL);
    label(explain,"Laptop: inspect device · stage JM route · fetch owner-prepared snapshot · read decision receipt.",13,WHITE,false);
    space(explain,10);
    label(explain,"Not permitted by JM: silent restores · Galaxy AI extraction · Samsung home rearrangement · root or device administrator controls.",13,MUTED,false);
    space(page,12);
    btn(page,"My project shelf →",false,()->{tab=6;render();});
    btn(page,"← JM root",false,()->{tab=0;render();});
  }


  void projectRoom(){
    title("JM / PROJECT CONTACT · 0.6","Actual JM bodies.\nOne connected shelf.",
      "These are references to your projects—not project copies. Unbound projects stay visible without fabricated launch URLs.");
    String filter=sp.getString("project.family","GAMES");
    LinearLayout tags=new LinearLayout(this);tags.setOrientation(0);page.addView(tags);
    for(String family:new String[]{"GAMES","MUSIC","BUILD","ESTATE"}){
      final String f=family;
      Button b=new Button(this);b.setAllCaps(false);b.setText(f);b.setTextSize(wide?13:10);
      b.setTextColor(family.equals(filter)?BG:WHITE);
      b.setBackground(bg(family.equals(filter)?BLUE:PANEL,family.equals(filter)?0:0xff334a67,12));
      LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(48),1);
      p.setMargins(dp(2),0,dp(2),0);tags.addView(b,p);
      b.setOnClickListener(v->{sp.edit().putString("project.family",f).apply();render();});
    }
    space(page,12);
    try{
      org.json.JSONArray data=ProjectShelf.all(sp);
      int shown=0;
      for(int i=0;i<data.length();i++){
        JSONObject row=data.getJSONObject(i);
        if(!filter.equals(row.getString("family")))continue;
        shown++;
        projectCard(row);
      }
      if(shown==0)card("EMPTY FIELD","No "+filter.toLowerCase()+" projects bound",
        "Add a new project reference or switch family. Existing files are not deleted.",PURPLE);
      LinearLayout status=card("ONE BODY / REFERENCES",""+data.length()+" JM project routes registered",
        "A project can exist without an active URL. Only the current owner-confirmed route is launched.",TEAL);
      label(status,"Current: "+ProjectShelf.selected(sp),13,WHITE,true);
    }catch(Exception e){
      card("HOLD / PROJECT SHELF","Cannot read shelf",e.getMessage(),PURPLE);
    }
    btn(page,"Add a JM project reference",true,this::addProject);
    btn(page,"← JM Root",false,()->{tab=0;render();});
  }
  void projectCard(JSONObject entry){
    String id=entry.optString("id","");
    boolean chosen=id.equals(ProjectShelf.selected(sp));
    String link=entry.optString("url","");
    LinearLayout box=card(chosen?"● ACTIVE / "+entry.optString("family"):"○ JM BODY / "+entry.optString("family"),
      entry.optString("title","Untitled"),
      link.isEmpty()?"NO VERIFIED ROUTE · project retained as a reference":
        "READY / "+android.net.Uri.parse(link).getHost(),chosen?TEAL:PURPLE);
    if(!chosen)btn(box,"Set current JM project",false,()->{
      try{ProjectShelf.choose(sp,id);render();}
      catch(Exception e){Toast.makeText(this,"HOLD · Cannot select this project",Toast.LENGTH_LONG).show();}
    });
    if(link.isEmpty())btn(box,"Bind an HTTPS route",false,()->bindProject(entry));
    else{
      btn(box,"OPEN "+entry.optString("title","PROJECT")+" ↗",true,()->ProjectShelf.open(this,entry));
      btn(box,"Edit route",false,()->bindProject(entry));
    }
  }
  void bindProject(JSONObject source){
    EditText url=new EditText(this);url.setTextSize(15);url.setSingleLine(false);
    url.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
    url.setHint("https://your-published-project");
    url.setText(source.optString("url",""));
    url.setSelectAllOnFocus(true);
    LinearLayout layout=new LinearLayout(this);layout.setOrientation(1);
    layout.setPadding(dp(16),dp(7),dp(16),0);layout.addView(url);
    new AlertDialog.Builder(this).setTitle("Bind "+source.optString("title"))
      .setMessage("This updates JM's reference only. Use a trusted public HTTPS location, or leave it empty to mark the route unbound.")
      .setView(layout).setNegativeButton("Cancel",null)
      .setPositiveButton("Save route",(d,w)->{
        try{
          JSONObject data=new JSONObject(source.toString());
          data.put("url",url.getText().toString().trim());
          ProjectShelf.upsert(sp,data);
          render();
        }catch(Exception e){
          new AlertDialog.Builder(this).setTitle("HOLD · Route unchanged")
            .setMessage(e.getMessage()).setPositiveButton("OK",null).show();
        }
      }).show();
  }
  void addProject(){
    LinearLayout layout=new LinearLayout(this);
    layout.setOrientation(1);layout.setPadding(dp(16),dp(4),dp(16),dp(4));
    EditText id=new EditText(this);id.setSingleLine(true);id.setHint("unique-id e.g. new-game");
    EditText title=new EditText(this);title.setSingleLine(true);title.setHint("Project title");
    Spinner family=new Spinner(this);
    String[] families={"GAMES","MUSIC","BUILD","ESTATE"};
    android.widget.ArrayAdapter<String> adapter=new android.widget.ArrayAdapter<>(
      this,android.R.layout.simple_spinner_dropdown_item,families);
    family.setAdapter(adapter);
    layout.addView(id);layout.addView(title);layout.addView(family);
    new AlertDialog.Builder(this).setTitle("Register an existing JM body")
      .setMessage("Reference only. Choose the project family; bind its real route separately.")
      .setView(layout).setNegativeButton("Cancel",null)
      .setPositiveButton("Register",(d,w)->{
        try{
          JSONObject row=new JSONObject();
          row.put("id",id.getText().toString().trim());
          row.put("title",title.getText().toString().trim());
          row.put("family",families[family.getSelectedItemPosition()]);
          row.put("url","");
          ProjectShelf.upsert(sp,row);
          sp.edit().putString("project.family",row.getString("family")).apply();
          render();
        }catch(Exception e){
          new AlertDialog.Builder(this).setTitle("HOLD · Project not added")
            .setMessage(e.getMessage()).setPositiveButton("OK",null).show();
        }
      }).show();
  }

  void routes(){
    title("CONTACT ROUTES","Open existing bodies.","No hidden migration and no pretend connections.");
    LinearLayout local=card("ANDROID","Device apps","Installed apps open normally. Missing ones return HOLD.",BLUE);
    btn(local,"My Files",false,()->app("com.sec.android.app.myfiles"));
    btn(local,"Samsung Notes",false,()->app("com.samsung.android.app.notes"));
    btn(local,"ChatGPT",false,()->app("com.openai.chatgpt"));
    btn(local,"Phone dialler",false,()->start(new Intent(Intent.ACTION_DIAL)));
    LinearLayout remote=card("JM ECOSTATE","Public source houses","These destinations open in your browser.",PURPLE);
    btn(remote,"JM Estate",false,()->url("https://jmisjustme.github.io/JM-cading-lab/"));
    btn(remote,"JM Games",false,()->url("https://jmisjustme.github.io/JM-cading-lab/games-beyond/"));
    btn(remote,"GitHub",false,()->url("https://github.com/JMisJustMe/JM-cading-lab"));
    btn(page,"Browse all JM projects →",true,()->{tab=6;render();});
  }
  void control(){
    title("SETTINGS / OWNER-GOVERNED","Control room.","These operations require your explicit touch or Android's approval.");
    LinearLayout focus=card("ORDER","Change your priority","This affects your JM dashboard only.",PURPLE);
    btn(focus,"Creator first",false,()->focus("CREATE"));
    btn(focus,"Playtest first",false,()->focus("PLAY"));
    btn(focus,"Everyday first",false,()->focus("EVERYDAY"));
    LinearLayout controls=card("AUTOMATION BOUNDARY","Authorised operations","Samsung retains authority over home-screen changes.",BLUE);
    btn(controls,"Request JM home shortcut",true,this::pin);
    btn(controls,"Export configuration JSON",false,()->file(true));
    btn(controls,"Import configuration JSON",false,()->file(false));
    btn(controls,"Explore Galaxy built-ins",false,()->{tab=1;render();});
    btn(controls,"Run device preflight & export receipt",true,()->{tab=4;render();});
    btn(controls,"USB CONTACT / Owner-approved workstation",false,()->{tab=5;render();});
    btn(controls,"My JM project shelf",false,()->{tab=6;render();});
    btn(controls,"Android settings",false,()->start(new Intent(Settings.ACTION_SETTINGS)));
    btn(controls,"Replay prelaunch (retain notes)",false,()->new AlertDialog.Builder(this)
      .setTitle("Replay the opening?")
      .setMessage("Only prelaunch progress resets; your notes and priority stay saved.")
      .setNegativeButton("Cancel",null)
      .setPositiveButton("Replay",(dialog,which)->{sp.edit().putBoolean("ready",false).putInt("stage",0).apply();render();}).show());
    card("CONTACT RECEIPT",""+widthDp+" dp / "+(wide?"WORKFIELD":"SOURCE"),
      "Available width is measured; hinge sensing, launcher rearrangement, Oppo migration and device Ding remain OPEN.",TEAL);
  }
  void focus(String chosen){sp.edit().putString("focus",chosen).apply();render();}
  void start(Intent intent){try{startActivity(intent);}catch(Exception e){Toast.makeText(this,"HOLD · Android cannot open this route",1).show();}}
  void app(String pkg){
    Intent i=getPackageManager().getLaunchIntentForPackage(pkg);
    if(i==null){Toast.makeText(this,"HOLD · App unavailable: "+pkg,1).show();return;}start(i);
  }
  void url(String u){start(new Intent(Intent.ACTION_VIEW,Uri.parse(u)));}
  void pin(){
    ShortcutManager m=getSystemService(ShortcutManager.class);
    if(m==null||!m.isRequestPinShortcutSupported()){
      Toast.makeText(this,"HOLD · Launcher does not permit shortcut request",1).show();return;
    }
    ShortcutInfo s=new ShortcutInfo.Builder(this,"jm-fold-root")
      .setShortLabel("JM Root").setLongLabel("JM Fold Ultra / Paired Root")
      .setIcon(Icon.createWithResource(this,R.drawable.jm_root_mark))
      .setIntent(new Intent(this,MainActivity.class).setAction(Intent.ACTION_MAIN)).build();
    if(!m.requestPinShortcut(s,null))Toast.makeText(this,"HOLD · Shortcut not accepted",1).show();
  }
  void file(boolean exporting){
    Intent i=new Intent(exporting?Intent.ACTION_CREATE_DOCUMENT:Intent.ACTION_OPEN_DOCUMENT);
    i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");
    if(exporting)i.putExtra(Intent.EXTRA_TITLE,"JM_FOLD_ULTRA_SETUP_v0_6.json");
    try{startActivityForResult(i,exporting?EXPORT:IMPORT);}
    catch(Exception e){Toast.makeText(this,"HOLD · Document picker unavailable",1).show();}
  }
  @Override protected void onActivityResult(int req,int result,Intent data){
    super.onActivityResult(req,result,data);
    if(result!=RESULT_OK||data==null||data.getData()==null)return;
    Uri uri=data.getData();
    try{
      if(req==EXPORT){
        JSONObject j=new JSONObject();
        j.put("schema",SCHEMA);j.put("root",sp.getString("root",""));
        j.put("focus",sp.getString("focus","CREATE"));
        j.put("ready",sp.getBoolean("ready",false));j.put("stage",sp.getInt("stage",0));
        JSONObject marks=new JSONObject();for(String key:NATIVE_KEYS)marks.put(key,sp.getBoolean("tried."+key,false));
        j.put("native_owner_marks",marks);j.put("native_group",sp.getString("native.group","ASSIST"));
        j.put("session",sp.getString("session","MAKE"));
        JSONObject ownerTests=new JSONObject();
        ownerTests.put("compact",sp.getBoolean("owner.compact_tested",false));
        ownerTests.put("expanded",sp.getBoolean("owner.expanded_tested",false));
        ownerTests.put("reopen",sp.getBoolean("owner.reopen_tested",false));
        j.put("owner_test_marks",ownerTests);
        j.put("project_shelf",ProjectShelf.all(sp));
        j.put("active_project",ProjectShelf.selected(sp));
        try(OutputStream o=getContentResolver().openOutputStream(uri,"w")){
          if(o==null)throw new IOException("Output unavailable");
          o.write(j.toString(2).getBytes(StandardCharsets.UTF_8));
        }
        Toast.makeText(this,"JM configuration exported",1).show();
      }else if(req==PREFLIGHT_EXPORT){
        String receipt=sp.getString("preflight.last","");
        if(receipt.isEmpty())throw new IOException("Run diagnostics before exporting a receipt");
        try(OutputStream o=getContentResolver().openOutputStream(uri,"w")){
          if(o==null)throw new IOException("Receipt output unavailable");
          o.write(receipt.getBytes(StandardCharsets.UTF_8));
        }
        Toast.makeText(this,"Local preflight receipt exported",Toast.LENGTH_LONG).show();
      }else if(req==IMPORT){
        ByteArrayOutputStream o=new ByteArrayOutputStream();
        try(InputStream in=getContentResolver().openInputStream(uri)){
          if(in==null)throw new IOException("Input unavailable");
          byte[] b=new byte[2048];int n;
          while((n=in.read(b))!=-1){
            if(o.size()+n>65536)throw new IOException("Import exceeds 64 KiB");o.write(b,0,n);
          }
        }
        JSONObject j=new JSONObject(o.toString("UTF-8"));
        String schema=j.optString("schema");
        if(!SCHEMA.equals(schema)&&!"JM.FoldUltraSetup/0.5".equals(schema)&&!"JM.FoldUltraSetup/0.4".equals(schema)&&!"JM.FoldUltraSetup/0.3".equals(schema)&&!"JM.FoldUltraSetup/0.2".equals(schema)&&!"JM.FoldUltraRoot/0.1".equals(schema))
          throw new IllegalArgumentException("Schema not recognised");
        String root=j.getString("root");
        if(root.length()>10000)throw new IllegalArgumentException("Root note too long");
        boolean legacy=!"JM.FoldUltraRoot/0.1".equals(schema);
        String focus=legacy?j.optString("focus","CREATE"):"CREATE";
        if(!focus.equals("CREATE")&&!focus.equals("PLAY")&&!focus.equals("EVERYDAY"))
          throw new IllegalArgumentException("Unknown focus");
        boolean ready=legacy&&j.optBoolean("ready",false);
        int step=legacy?j.optInt("stage",0):0;
        if(step<0||step>4)throw new IllegalArgumentException("Stage invalid");
        if(SCHEMA.equals(schema)){
          ProjectShelf.validateList(j.getJSONArray("project_shelf"));
          String active=j.getString("active_project");
          boolean present=false;
          org.json.JSONArray available=j.getJSONArray("project_shelf");
          for(int n=0;n<available.length();n++){
            if(available.getJSONObject(n).getString("id").equals(active))present=true;
          }
          if(!present)throw new IllegalArgumentException("Active project missing from imported shelf");
        }
        new AlertDialog.Builder(this).setTitle("Import JM configuration?")
          .setMessage("Replace only this app's note, focus and opening progress? Samsung data and launcher stay untouched.")
          .setNegativeButton("Cancel",null)
          .setPositiveButton("Import",(d,w)->{
            sp.edit().putString("root",root).putString("focus",focus)
              .putBoolean("ready",ready).putInt("stage",step).apply();
            if(SCHEMA.equals(schema)||"JM.FoldUltraSetup/0.5".equals(schema)||"JM.FoldUltraSetup/0.4".equals(schema)||"JM.FoldUltraSetup/0.3".equals(schema)) {
              JSONObject marks=j.optJSONObject("native_owner_marks");
              if(marks!=null)for(String key:NATIVE_KEYS)sp.edit().putBoolean("tried."+key,marks.optBoolean(key,false)).apply();
              String group=j.optString("native_group","ASSIST");
              if(group.equals("ASSIST")||group.equals("CREATE")||group.equals("WORK"))sp.edit().putString("native.group",group).apply();
            }
            if(SCHEMA.equals(schema)||"JM.FoldUltraSetup/0.5".equals(schema)||"JM.FoldUltraSetup/0.4".equals(schema)){
              String selectedSession=j.optString("session","MAKE");
              if(selectedSession.equals("MAKE")||selectedSession.equals("PLAYTEST")||
                 selectedSession.equals("RESEARCH")||selectedSession.equals("RECOVERY")){
                sp.edit().putString("session",selectedSession).apply();
              }
              JSONObject owner=j.optJSONObject("owner_test_marks");
              if(owner!=null){
                sp.edit().putBoolean("owner.compact_tested",owner.optBoolean("compact",false))
                  .putBoolean("owner.expanded_tested",owner.optBoolean("expanded",false))
                  .putBoolean("owner.reopen_tested",owner.optBoolean("reopen",false)).apply();
              }
            }
            if(SCHEMA.equals(schema)){
              try{
                org.json.JSONArray projects=ProjectShelf.validateList(j.getJSONArray("project_shelf"));
                String active=j.getString("active_project");
                ProjectShelf.install(sp,projects,active);
              }catch(Exception failure){
                Toast.makeText(this,"HOLD · Imported JM settings, but project shelf was not restored",Toast.LENGTH_LONG).show();
              }
            }
            tab=0;render();
          }).show();
      }
    }catch(Exception e){
      new AlertDialog.Builder(this).setTitle("HOLD · Nothing imported")
        .setMessage(e.getMessage()).setPositiveButton("OK",null).show();
    }
  }
}
