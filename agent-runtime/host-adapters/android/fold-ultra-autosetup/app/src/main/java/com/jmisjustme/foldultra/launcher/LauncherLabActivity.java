package com.jmisjustme.foldultra.launcher;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.jmisjustme.foldultra.workroom.WorkroomActivity;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;

/**
 * Internal optional experiment inside the original com.jmisjustme.foldultra app.
 * Deliberately NOT an Android HOME handler, remote controller, default-home replacement,
 * package scanner, or background service. All app launches are explicit owner taps.
 */
public final class LauncherLabActivity extends Activity {
  private static final int BG=0xff09101D, PANEL=0xff192840, INK=0xffE5F1FF, SOFT=0xffA9C2DB;
  private SharedPreferences prefs;
  private LinearLayout body;

  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    prefs=getSharedPreferences("jm.fold.ultra.home.lab.cp01", MODE_PRIVATE);
    getWindow().setStatusBarColor(BG);
    getWindow().setNavigationBarColor(BG);
    showHome();
  }

  private int dp(int n){return (int)(getResources().getDisplayMetrics().density*n+0.5f);}

  private void screen(String heading, String description) {
    ScrollView scroll=new ScrollView(this);
    scroll.setFillViewport(true);
    scroll.setBackgroundColor(BG);
    body=new LinearLayout(this);
    body.setOrientation(LinearLayout.VERTICAL);
    body.setPadding(dp(18),dp(20),dp(18),dp(24));
    scroll.addView(body);
    setContentView(scroll);
    label("JM / HOME LAB · CP01",14,SOFT);
    label(heading,26,INK);
    label(description,14,SOFT);
    button("← Original JM FOLD ULTRA",()->finish());
    LinearLayout tabs=new LinearLayout(this);
    tabs.setOrientation(LinearLayout.HORIZONTAL);
    body.addView(tabs);
    smallTab(tabs,"HOME",()->showHome());
    smallTab(tabs,"APPS",()->showApps());
    smallTab(tabs,"DEVICES",()->showDevices());
    smallTab(tabs,"LAYOUT",()->showLayout());
  }

  private void label(String text,int size,int color) {
    TextView v=new TextView(this);
    v.setText(text);
    v.setTextColor(color);
    v.setTextSize(size);
    v.setPadding(dp(2),dp(5),dp(2),dp(8));
    body.addView(v);
  }

  private Button makeButton(String text,Runnable action) {
    Button button=new Button(this);
    button.setAllCaps(false);
    button.setText(text);
    button.setTextColor(INK);
    button.setTextSize(13);
    button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(PANEL));
    button.setOnClickListener(v->action.run());
    return button;
  }

  private void button(String text,Runnable action) {
    Button b=makeButton(text,action);
    body.addView(b,new LinearLayout.LayoutParams(-1,dp(52)));
  }

  private void smallTab(LinearLayout row,String text,Runnable action) {
    Button b=makeButton(text,action);
    b.setTextSize(11);
    LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(50),1);
    p.setMargins(dp(1),dp(1),dp(1),dp(1));
    row.addView(b,p);
  }

  private void showHome() {
    String mode=prefs.getString("layout.mode",JMHomeLayout.AUTO);
    int width=Math.max(1,getResources().getConfiguration().screenWidthDp);
    int cols=JMHomeLayout.columns(width,mode);
    screen("Your JM home, your layout","Offline-first preview · "+cols+" columns · "+mode
      +" · Samsung default HOME is unchanged.");
    String[] rooms=JMHomeLayout.rooms();
    for(int i=0;i<rooms.length;i+=cols) {
      LinearLayout line=new LinearLayout(this);
      line.setOrientation(LinearLayout.HORIZONTAL);
      body.addView(line);
      for(int j=0;j<cols;j++) {
        int at=i+j;
        if(at>=rooms.length) {
          line.addView(new View(this),new LinearLayout.LayoutParams(0,dp(88),1));
        } else {
          Button tile=makeButton(rooms[at],()->openTile(at));
          LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(88),1);
          p.setMargins(dp(3),dp(3),dp(3),dp(3));
          line.addView(tile,p);
        }
      }
    }
    label("This preview belongs to your existing JM Fold Ultra app, not a second launcher.",13,SOFT);
  }

  private void openTile(int at) {
    switch(at) {
      case 0: finish();break;
      case 1: startActivity(new Intent(this,WorkroomActivity.class));break;
      case 2: showApps();break;
      case 3: showDevices();break;
      case 4: showLayout();break;
      case 5: finish();break;
      default: throw new IllegalArgumentException("Unknown home tile");
    }
  }

  private void showLayout() {
    screen("Layout workshop","Your compact and expanded grids are stored only in this preview.");
    String saved=prefs.getString("layout.mode",JMHomeLayout.AUTO);
    label("Selected: "+saved+". Fold sizing is read from Android screenWidthDp.",14,INK);
    button("AUTO / 2 compact · 4 expanded",()->choose(JMHomeLayout.AUTO));
    button("COMPACT / 2 columns",()->choose(JMHomeLayout.COMPACT));
    button("EXPANDED / 4 columns",()->choose(JMHomeLayout.EXPANDED));
    label("No widgets, wallpapers, system settings or Samsung launcher arrangement are modified.",13,SOFT);
  }

  private void choose(String mode) {
    JMHomeLayout.columns(390,mode);
    prefs.edit().putString("layout.mode",mode).apply();
    showHome();
  }

  private void showApps() {
    screen("App drawer","Launch installed, discoverable Android apps only by tapping one.");
    PackageManager pm=getPackageManager();
    Intent query=new Intent(Intent.ACTION_MAIN);
    query.addCategory(Intent.CATEGORY_LAUNCHER);
    List<ResolveInfo> found=pm.queryIntentActivities(query,0);
    List<ResolveInfo> apps=new ArrayList<>();
    HashSet<String> seen=new HashSet<>();
    for(ResolveInfo r:found) {
      if(r.activityInfo==null)continue;
      String identity=r.activityInfo.packageName+"/"+r.activityInfo.name;
      if(seen.add(identity))apps.add(r);
    }
    Collections.sort(apps,(a,b)->String.valueOf(a.loadLabel(pm))
      .compareToIgnoreCase(String.valueOf(b.loadLabel(pm))));
    EditText filter=new EditText(this);
    filter.setSingleLine(true);
    filter.setTextColor(INK);
    filter.setHintTextColor(SOFT);
    filter.setHint("Search apps");
    body.addView(filter);
    LinearLayout results=new LinearLayout(this);
    results.setOrientation(LinearLayout.VERTICAL);
    body.addView(results);
    drawApps(results,apps,"");
    filter.addTextChangedListener(new TextWatcher() {
      public void beforeTextChanged(CharSequence s,int start,int count,int after){}
      public void onTextChanged(CharSequence s,int start,int before,int count){
        drawApps(results,apps,s.toString());
      }
      public void afterTextChanged(Editable s){}
    });
  }

  private void drawApps(LinearLayout target,List<ResolveInfo> apps,String search) {
    target.removeAllViews();
    String needle=search.toLowerCase(Locale.ROOT).trim();
    int shown=0;
    for(ResolveInfo r:apps) {
      String name=String.valueOf(r.loadLabel(getPackageManager()));
      if(!name.toLowerCase(Locale.ROOT).contains(needle)
        && !r.activityInfo.packageName.toLowerCase(Locale.ROOT).contains(needle))continue;
      Button b=makeButton(name,()->launchApp(r));
      target.addView(b,new LinearLayout.LayoutParams(-1,dp(52)));
      shown++;
    }
    if(shown==0) {
      TextView empty=new TextView(this);
      empty.setText("No visible matching apps. Android package-visibility rules still apply.");
      empty.setTextColor(SOFT);
      target.addView(empty);
    }
  }

  private void launchApp(ResolveInfo r) {
    try {
      Intent open=new Intent(Intent.ACTION_MAIN);
      open.addCategory(Intent.CATEGORY_LAUNCHER);
      open.setClassName(r.activityInfo.packageName,r.activityInfo.name);
      startActivity(open);
    } catch(RuntimeException e) {
      Toast.makeText(this,"HOLD · app launch unavailable",Toast.LENGTH_SHORT).show();
    }
  }

  private void showDevices() {
    screen("Device contact","Roles are declared, not paired. No scanning, remote execution or silent transfers.");
    label("Fold8 Ultra · local launcher preview only (not paired)",14,INK);
    label("OPPO · NOT CONTACTED",14,SOFT);
    button("Prepare OPPO handoff text",()->shareTemplate("OPPO"));
    label("GroundZeroJM · NOT CONTACTED (remote access is separate)",14,SOFT);
    button("Prepare GroundZeroJM handoff text",()->shareTemplate("GROUNDZEROJM"));
    label("Actual pairing needs explicit approval on both devices, an authenticated transport,"
      +" revocation and replay-safe receipts. A shared text request proves none of those.",13,SOFT);
  }

  private void shareTemplate(String target) {
    final String payload=JMDeviceLinkContract.makeRequest("FOLD8",target,"OPEN_JM_ROOT",true);
    new AlertDialog.Builder(this)
      .setTitle("Share a request-only template?")
      .setMessage("No private JM notes or pairing keys are included. Sharing does not connect"
        +" or control "+JMHomeLayout.labelFor(target)+". You select the recipient.")
      .setNegativeButton("Cancel",(d,w)->{})
      .setPositiveButton("Choose recipient",(d,w)->{
        Intent send=new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_TEXT,payload);
        startActivity(Intent.createChooser(send,"JM request-only handoff"));
      }).show();
  }
}
