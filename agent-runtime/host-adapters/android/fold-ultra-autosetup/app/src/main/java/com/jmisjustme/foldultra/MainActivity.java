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
  static final String PREF="jm.fold.ultra.prelaunch.v0.2", SCHEMA="JM.FoldUltraSetup/0.2";
  static final int BG=0xff090E19,PANEL=0xff141E30,WHITE=0xffEDF4FF,MUTED=0xffA8B9D0;
  static final int BLUE=0xff77BFFF,PURPLE=0xffC5A0FF,TEAL=0xff74E4D2;
  static final int EXPORT=203,IMPORT=204;
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
  }
  @Override public void onSaveInstanceState(Bundle out){out.putInt("tab",tab);super.onSaveInstanceState(out);}
  @Override protected void onResume(){super.onResume();if(getResources().getConfiguration().screenWidthDp!=lastWidth)render();}
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
    page.setPadding(dp(wide?30:18),dp(26),dp(wide?30:18),dp(30));scroll.addView(page);
    label(page,"JM / ECOSTATE     •     FOLD ULTRA 0.2",12,MUTED,true);space(page,14);
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
        title("REAL ROUTES","Check what is available.",
          "Android confirms installed apps where visible; browser destinations are links, not duplicated files.");
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
    String[] labels={"ROOT","ROUTES","CONTROL"};
    for(int i=0;i<labels.length;i++){
      final int value=i;Button b=new Button(this);b.setAllCaps(false);b.setText(labels[i]);
      b.setTextSize(12);b.setTextColor(i==tab?BG:WHITE);
      b.setBackground(bg(i==tab?BLUE:PANEL,i==tab?0:0xff334a67,12));
      LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(50),1);
      p.setMargins(i==0?0:dp(3),0,i==2?0:dp(3),0);tabs.addView(b,p);
      b.setOnClickListener(v->{tab=value;render();});
    }
    space(page,12);
    if(tab==0)root();else if(tab==1)routes();else control();
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
      .setIcon(Icon.createWithResource(this,android.R.drawable.ic_menu_manage))
      .setIntent(new Intent(this,MainActivity.class).setAction(Intent.ACTION_MAIN)).build();
    if(!m.requestPinShortcut(s,null))Toast.makeText(this,"HOLD · Shortcut not accepted",1).show();
  }
  void file(boolean exporting){
    Intent i=new Intent(exporting?Intent.ACTION_CREATE_DOCUMENT:Intent.ACTION_OPEN_DOCUMENT);
    i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");
    if(exporting)i.putExtra(Intent.EXTRA_TITLE,"JM_FOLD_ULTRA_SETUP_v0_2.json");
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
        try(OutputStream o=getContentResolver().openOutputStream(uri,"w")){
          if(o==null)throw new IOException("Output unavailable");
          o.write(j.toString(2).getBytes(StandardCharsets.UTF_8));
        }
        Toast.makeText(this,"JM configuration exported",1).show();
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
        if(!SCHEMA.equals(schema)&&!"JM.FoldUltraRoot/0.1".equals(schema))
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
        new AlertDialog.Builder(this).setTitle("Import JM configuration?")
          .setMessage("Replace only this app's note, focus and opening progress? Samsung data and launcher stay untouched.")
          .setNegativeButton("Cancel",null)
          .setPositiveButton("Import",(d,w)->{
            sp.edit().putString("root",root).putString("focus",focus)
              .putBoolean("ready",ready).putInt("stage",step).apply();
            tab=0;render();
          }).show();
      }
    }catch(Exception e){
      new AlertDialog.Builder(this).setTitle("HOLD · Nothing imported")
        .setMessage(e.getMessage()).setPositiveButton("OK",null).show();
    }
  }
}
