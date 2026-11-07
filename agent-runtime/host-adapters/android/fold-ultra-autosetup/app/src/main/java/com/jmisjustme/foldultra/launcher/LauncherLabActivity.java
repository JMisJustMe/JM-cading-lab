package com.jmisjustme.foldultra.launcher;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.net.Uri;
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
    // CP13 owner correction: permanently retire the unused 60-minute UI flag,
    // without touching the owner's role, app tiles, project or saved layout.
    prefs.edit().remove("owner.onmode.foreground_until_ms").apply();
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
    // QA package launches this room directly; never imply Back edits or opens the
    // separately signed original JM Fold Ultra installation.
    button(getPackageName().endsWith(".homelabqa")
        ? "← Exit JM Home Lab QA" : "← Original JM FOLD ULTRA",()->finish());
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

  private String layoutKey() { return "layout.mode."+selectedRole(); }
  private String menuKey() { return "menu.tiles."+selectedRole(); }

  private String layoutMode() {
    // Restore CP01's existing Fold8 mode without rewriting its original local preference.
    String fallback="FOLD8".equals(selectedRole())
      ? prefs.getString("layout.mode",JMHomeLayout.AUTO) : JMHomeLayout.AUTO;
    String mode=prefs.getString(layoutKey(),fallback);
    try { JMHomeLayout.columns(390,mode);return mode; }
    catch(IllegalArgumentException e) { return JMHomeLayout.AUTO; }
  }

  private String menuOrder() {
    return String.join(",",JMHomeMenu.safeTokens(
      prefs.getString(menuKey(),JMHomeMenu.defaultOrder())));
  }

  private void showHome() {
    String mode=layoutMode();
    int width=Math.max(1,getResources().getConfiguration().screenWidthDp);
    int cols=JMHomeLayout.columns(width,mode);
    screen("Your JM home, your layout","Offline-first preview · "+cols+" columns · "+mode
      +" · "+JMHomeLayout.labelFor(selectedRole())+" profile · Android HOME unchanged.");
    String[] rooms=JMHomeMenu.safeTokens(menuOrder());
    for(int i=0;i<rooms.length;i+=cols) {
      LinearLayout line=new LinearLayout(this);
      line.setOrientation(LinearLayout.HORIZONTAL);
      body.addView(line);
      for(int j=0;j<cols;j++) {
        int at=i+j;
        if(at>=rooms.length) {
          line.addView(new View(this),new LinearLayout.LayoutParams(0,dp(88),1));
        } else {
          String token=rooms[at];
          Button tile=makeButton(JMHomeMenu.label(token),()->openTile(token));
          LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(88),1);
          p.setMargins(dp(3),dp(3),dp(3),dp(3));
          line.addView(tile,p);
        }
      }
    }
    label("HEADLESS / GITHUB · Leave your phone free",15,INK);
    button("JM HEADLESS · Open current checks",()->openGitHubChecks(false));
    label("Owner-tapped GitHub entrance only. Build and emulator work runs on"
      +" GitHub, not inside your phone. No keep-awake timer, device control,"
      +" credentials, new permissions or automatic re-run.",12,SOFT);
    label("Edit these tiles in LAYOUT. JM ROOT and BACK TO JM cannot be hidden.",13,SOFT);
    label("This preview belongs to your existing JM Fold Ultra app, not a second launcher.",13,SOFT);
  }

  private void openTile(String token) {
    switch(token) {
      case "ROOT": finish();break;
      case "WORKROOM": startActivity(new Intent(this,WorkroomActivity.class));break;
      case "DRAWER": showApps();break;
      case "DEVICES": showDevices();break;
      case "LAYOUT": showLayout();break;
      case "BACK": finish();break;
      default: throw new IllegalArgumentException("Unknown home tile");
    }
  }

  private void showLayout() {
    screen("Layout workshop","Saved only inside JM Home Lab. Fold8 and OPPO preferences are independent.");
    String saved=layoutMode();
    label("Profile: "+JMHomeLayout.labelFor(selectedRole())+" · Grid: "+saved,14,INK);
    button("AUTO / 2 compact · 4 expanded",()->choose(JMHomeLayout.AUTO));
    button("COMPACT / 2 columns",()->choose(JMHomeLayout.COMPACT));
    button("EXPANDED / 4 columns",()->choose(JMHomeLayout.EXPANDED));
    label("ARRANGE YOUR HOME TILES",16,INK);
    String order=menuOrder();
    String[] visible=JMHomeMenu.safeTokens(order);
    for(String token:visible) {
      String tile=JMHomeMenu.label(token);
      label("Visible: "+tile,14,INK);
      button("Move "+tile+" up",()->moveTile(token,-1));
      button("Move "+tile+" down",()->moveTile(token,1));
      if(!"ROOT".equals(token) && !"BACK".equals(token))
        button("Hide "+tile,()->toggleTile(token));
    }
    for(String token:new String[]{"WORKROOM","DRAWER","DEVICES","LAYOUT"}) {
      if(!java.util.Arrays.asList(visible).contains(token)) {
        String name=JMHomeMenu.label(token);
        button("Show "+name,()->toggleTile(token));
      }
    }
    button("Restore default JM tiles",()->{
      prefs.edit().remove(menuKey()).apply();
      showLayout();
    });
    label("No widgets, app files, Samsung HOME icons, wallpapers or system settings are modified.",13,SOFT);
  }

  private void moveTile(String token,int direction) {
    String updated=JMHomeMenu.move(menuOrder(),token,direction);
    prefs.edit().putString(menuKey(),updated).apply();
    showLayout();
  }

  private void toggleTile(String token) {
    String updated=JMHomeMenu.toggle(menuOrder(),token);
    prefs.edit().putString(menuKey(),updated).apply();
    showLayout();
  }

  private void choose(String mode) {
    JMHomeLayout.columns(390,mode);
    SharedPreferences.Editor editor=prefs.edit().putString(layoutKey(),mode);
    if("FOLD8".equals(selectedRole()))editor.putString("layout.mode",mode);
    editor.apply();
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

  private String selectedRole() {
    String role=prefs.getString("device.role","FOLD8");
    return "OPPO".equals(role) ? "OPPO" : "FOLD8";
  }

  private void chooseRole(String role) {
    if(!"OPPO".equals(role) && !"FOLD8".equals(role))
      throw new IllegalArgumentException("Unknown local device profile");
    new AlertDialog.Builder(this)
      .setTitle("Use "+JMHomeLayout.labelFor(role)+" layout profile?")
      .setMessage("This sets a local HOME LAB preference. It does not verify the"
        +" device identity, pair hardware, transfer data, or change Android HOME.")
      .setNegativeButton("Keep current",(d,w)->{})
      .setPositiveButton("Use this profile",(d,w)->{
        prefs.edit().putString("device.role",role).apply();
        showDevices();
      }).show();
  }

  private void showDevices() {
    String local=selectedRole();
    String other="FOLD8".equals(local)?"OPPO":"FOLD8";
    screen("Device contact","Roles are local profiles, not paired device identities."
      +" No scanning, remote execution or silent transfers.");
    label("Selected LOCAL profile · "+JMHomeLayout.labelFor(local)
      +" (owner-selected, hardware not verified)",14,INK);
    button("Use Fold8 profile",()->chooseRole("FOLD8"));
    button("Use OPPO profile",()->chooseRole("OPPO"));
    label(JMHomeLayout.labelFor(other)+" · NOT CONTACTED",14,SOFT);
    button("Prepare "+JMHomeLayout.labelFor(other)+" handoff text",
      ()->shareTemplate(other));
    label("GroundZeroJM · NOT CONTACTED (remote access is separate)",14,SOFT);
    button("Prepare GroundZeroJM handoff text",()->shareTemplate("GROUNDZEROJM"));
    label("JM HEADLESS / GITHUB WORKFLOW",15,INK);
    button("View current Home Lab checks",()->openGitHubChecks(false));
    button("View verified baseline CI run",()->openGitHubChecks(true));
    label("An authenticated GitHub owner can review or re-run the verified"
      +" workflow from the GitHub interface. This app only opens the page;"
      +" it does not trigger jobs or request repository credentials.",12,SOFT);
    label("EXISTING DONOR / JM PHONE ↔ LAPTOP v0.5",15,INK);
    label("Recorded v0.2 owner-device contact and v0.5 software QA. "
      +"The separate v0.5.1 host passed 7/7 read-only GET checks on GroundZeroJM. "
      +"This app has not paired devices or authenticated any transport.",13,SOFT);
    button("Check existing v0.5.1 host readiness",()->openExistingHost("/ready"));
    button("Open existing Phone ↔ Laptop control",()->openExistingHost("/profiles/phone-laptop/control"));
    button("Read original Phone ↔ Laptop proof record",()->openDonorRecord());
    label("Actual pairing needs explicit approval on both devices, an authenticated transport,"
      +" revocation and replay-safe receipts. A shared text request proves none of those.",13,SOFT);
  }

  private void openGitHubChecks(boolean lastVerified) {
    // Source-authoritative entrance. Neither the browser nor this app receives
    // stored GitHub tokens. GitHub controls owner authentication and reruns.
    final String base="https://github.com/JMisJustMe/JM-cading-lab";
    final String route=lastVerified
      ? "/actions/runs/42280236211" : "/pull/782/checks";
    try {
      startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(base+route)));
    } catch(RuntimeException e) {
      Toast.makeText(this,"HOLD · GitHub entrance unavailable",Toast.LENGTH_SHORT).show();
    }
  }

  private void openExistingHost(String route) {
    // Explicit owner tap opens the separately preserved hosted donor in a browser.
    // No credentials, pairing, background probing or server mutation from Home Lab.
    if(!"/ready".equals(route) && !"/profiles/phone-laptop/control".equals(route))
      throw new IllegalArgumentException("Unapproved host route");
    final String originalHost="https://jm-cloud-contact-server-v05.onrender.com";
    try {
      startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(originalHost+route)));
    } catch(RuntimeException e) {
      Toast.makeText(this,"HOLD · original host door unavailable",Toast.LENGTH_SHORT).show();
    }
  }

  private void openDonorRecord() {
    // A verified source-record entrance only; never contacts a device or launches commands.
    String record="https://github.com/JMisJustMe/JM-cading-lab/blob/main/"
      +"JM_ESTATE/PHONE_LAPTOP/v0.5/FLAZ_RECEIPT_v1.0.md";
    try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(record))); }
    catch(RuntimeException e) {
      Toast.makeText(this,"HOLD · original source link unavailable",Toast.LENGTH_SHORT).show();
    }
  }

  private void shareTemplate(String target) {
    final String payload=JMDeviceLinkContract.makeRequest(selectedRole(),target,"OPEN_JM_ROOT",true);
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
