package com.jmisjustme.foldultra.oshome;

import android.app.Activity;
import android.app.AlertDialog;
import android.appwidget.AppWidgetHost;
import android.appwidget.AppWidgetHostView;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import com.jmisjustme.foldultra.launcher.LauncherLabActivity;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** JM OS HOME QA: opt-in role, local widgets, tap-only app launches, separate package. */
public final class JMOsHomeActivity extends Activity {
  private static final int BG=0xff0a1222, TILE=0xff1c314d, INK=0xffe7f3ff, MUTED=0xffb4cee8;
  private static final int HOST_ID=17431, BIND_REQUEST=141;
  private AppWidgetHost host;
  private AppWidgetManager widgets;
  private SharedPreferences prefs;
  private LinearLayout content;
  private int pending=-1;
  private int dp(int n){return (int)(getResources().getDisplayMetrics().density*n+0.5f);}
  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    prefs=getSharedPreferences("jm.os.home.qa.widgets",MODE_PRIVATE);
    widgets=AppWidgetManager.getInstance(this);
    host=new AppWidgetHost(this,HOST_ID);
    getWindow().setStatusBarColor(BG);
    getWindow().setNavigationBarColor(BG);
    render();
  }
  @Override protected void onStart(){ super.onStart(); try { host.startListening(); } catch(RuntimeException ignored) {} }
  @Override protected void onStop(){ host.stopListening(); super.onStop(); }
  private void text(String t,int size,int color){
    TextView label=new TextView(this);label.setText(t);label.setTextSize(size);label.setTextColor(color);
    label.setPadding(dp(4),dp(8),dp(4),dp(10));content.addView(label);
  }
  private void button(String title,Runnable action){
    Button b=new Button(this);b.setText(title);b.setTextSize(13);b.setAllCaps(false);
    b.setTextColor(INK);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(TILE));
    b.setOnClickListener(v->action.run());
    LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(56));
    p.setMargins(0,dp(2),0,dp(3));content.addView(b,p);
  }
  private List<Integer> ids(){
    List<Integer> result=new ArrayList<>();
    String stored=prefs.getString("widget.ids","");
    for(String v:stored.split(",")){try{int id=Integer.parseInt(v);if(id>0&&!result.contains(id))result.add(id);}catch(NumberFormatException ignored){}}
    return result;
  }
  private void save(List<Integer> ids) {
    StringBuilder b=new StringBuilder();
    for(int id:ids){if(b.length()>0)b.append(',');b.append(id);}
    prefs.edit().putString("widget.ids",b.toString()).apply();
  }
  private void render(){
    ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(BG);
    content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);
    content.setPadding(dp(18),dp(18),dp(18),dp(30));scroll.addView(content);setContentView(scroll);
    text("JM OS  ·  HOME",27,INK);
    text("Fold Ultra original • Optional HOME candidate • Native touch • Your Samsung Home remains available.",13,MUTED);
    button("Open original JM Home Lab",()->startActivity(new Intent(this,LauncherLabActivity.class)));
    button("Open JM Fold Ultra",()->{
      Intent i=new Intent();i.setClassName("com.jmisjustme.foldultra","com.jmisjustme.foldultra.MainActivity");
      try{startActivity(i);}catch(RuntimeException e){toast("Original JM Fold Ultra not available");}
    });
    button("Browse installed apps",()->showApps());
    text("INTERACTIVE ANDROID WIDGETS",18,INK);
    button("★ Choose installed JM widgets (v1 / v2 / v3)",()->selectJmWidgets());
    button("+ Add a widget (owner approval)",()->selectWidget());
    List<Integer> saved=ids();
    if(saved.isEmpty()) text("Your widget shelf is empty. Add JM Widget v3 or another available Android widget.",13,MUTED);
    for(int id:saved){
      AppWidgetProviderInfo info=widgets.getAppWidgetInfo(id);
      if(info==null){text("Widget "+id+" unavailable — remove it below or restore its provider.",12,MUTED);}
      else{
        text(String.valueOf(info.loadLabel(getPackageManager())),15,INK);
        try{
          AppWidgetHostView view=host.createView(this,id,info);
          int widgetHeight=dp(230);
          LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,widgetHeight);
          p.setMargins(0,dp(4),0,dp(6));content.addView(view,p);
        }catch(RuntimeException e){text("Widget temporarily unavailable",12,MUTED);}
      }
      button("Remove widget from this JM home",()->removeWidget(id));
    }
    text("SAFE HOME CONTROL",16,INK);
    button("Android Home settings (choose launcher yourself)",()->{
      try{startActivity(new Intent("android.settings.HOME_SETTINGS"));}
      catch(RuntimeException e){toast("Open Settings → Apps → Default apps → Home app");}
    });
    text("No root, no AOSP, no private imports, no remote control, and no Samsung HOME switch without your choice.",12,MUTED);
  }
  private void showApps(){
    Intent request=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
    PackageManager pm=getPackageManager();
    List<ResolveInfo> installed=new ArrayList<>(pm.queryIntentActivities(request,0));
    Collections.sort(installed,(a,b)->String.valueOf(a.loadLabel(pm)).compareToIgnoreCase(String.valueOf(b.loadLabel(pm))));
    List<String> names=new ArrayList<>();
    List<ResolveInfo> entries=new ArrayList<>();
    for(ResolveInfo x:installed){
      if(x.activityInfo==null || x.activityInfo.packageName.equals(getPackageName()))continue;
      names.add(String.valueOf(x.loadLabel(pm)));entries.add(x);
    }
    new AlertDialog.Builder(this).setTitle("Choose an installed app")
      .setItems(names.toArray(new String[0]),(dialog,idx)->{
        ResolveInfo r=entries.get(idx);
        Intent i=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        i.setClassName(r.activityInfo.packageName,r.activityInfo.name);
        try{startActivity(i);}catch(RuntimeException e){toast("App unavailable");}
      }).setNegativeButton("Cancel",null).show();
  }
  private void selectJmWidgets(){
    // These are established installed JM QA provider identities, not invented widget bodies.
    // Explicit receiver checks avoid dependence on OEM widget-picker sorting/visibility.
    String[] packages={"com.jmisjustme.foldultra.widgetqa",
      "com.jmisjustme.foldultra.widgetv2qa","com.jmisjustme.foldultra.widgetv3qa"};
    String[] versions={"v1","v2","v3"};
    String[] classes={"com.jmisjustme.foldultra.JMHomeWidget",
      "com.jmisjustme.foldultra.JMHomeWidgetExpanded"};
    String[] kinds={"Compact","Expanded"};
    List<ComponentName> found=new ArrayList<>();
    List<String> labels=new ArrayList<>();
    for(int i=0;i<packages.length;i++){
      for(int j=0;j<classes.length;j++){
        ComponentName receiver=new ComponentName(packages[i],classes[j]);
        try{
          getPackageManager().getReceiverInfo(receiver,0);
          found.add(receiver);
          labels.add("JM Widget "+versions[i]+" · "+kinds[j]);
        }catch(PackageManager.NameNotFoundException ignored){}
      }
    }
    if(found.isEmpty()){toast("No installed JM widget receiver is visible");return;}
    new AlertDialog.Builder(this).setTitle("Choose a JM widget")
      .setItems(labels.toArray(new String[0]),(dialog,which)->bind(found.get(which)))
      .setNegativeButton("Cancel",null).show();
  }
  private void selectWidget(){
    List<AppWidgetProviderInfo> all=widgets.getInstalledProviders();
    if(all==null||all.isEmpty()){toast("No available widget providers");return;}
    Collections.sort(all,(a,b)->String.valueOf(a.loadLabel(getPackageManager())).compareToIgnoreCase(String.valueOf(b.loadLabel(getPackageManager()))));
    String[] names=new String[all.size()];
    for(int i=0;i<all.size();i++){AppWidgetProviderInfo x=all.get(i);names[i]=String.valueOf(x.loadLabel(getPackageManager()))+" · "+x.provider.getPackageName();}
    new AlertDialog.Builder(this).setTitle("Choose a widget provider")
      .setItems(names,(dialog,which)->bind(all.get(which).provider))
      .setNegativeButton("Cancel",null).show();
  }
  private void bind(ComponentName provider){
    pending=host.allocateAppWidgetId();
    if(widgets.bindAppWidgetIdIfAllowed(pending,provider)){persistPending();return;}
    Intent request=new Intent(AppWidgetManager.ACTION_APPWIDGET_BIND);
    request.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,pending);
    request.putExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER,provider);
    try{startActivityForResult(request,BIND_REQUEST);}
    catch(RuntimeException e){host.deleteAppWidgetId(pending);pending=-1;toast("Widget approval unavailable");}
  }
  private void persistPending(){
    if(pending<0)return;
    if(widgets.getAppWidgetInfo(pending)==null){host.deleteAppWidgetId(pending);pending=-1;toast("Widget not bound");return;}
    List<Integer> saved=ids();if(!saved.contains(pending))saved.add(pending);
    save(saved);pending=-1;render();
  }
  @Override protected void onActivityResult(int request,int result,Intent data){
    super.onActivityResult(request,result,data);
    if(request!=BIND_REQUEST)return;
    if(result==RESULT_OK){persistPending();}
    else{if(pending>=0)host.deleteAppWidgetId(pending);pending=-1;render();}
  }
  private void removeWidget(int id){
    new AlertDialog.Builder(this).setTitle("Remove from JM Home?")
      .setMessage("Only this candidate's widget placement will be removed. The source app and original widgets remain installed.")
      .setNegativeButton("Keep",null)
      .setPositiveButton("Remove",(dialog,which)->{
        List<Integer> list=ids();list.remove(Integer.valueOf(id));save(list);
        host.deleteAppWidgetId(id);render();
      }).show();
  }
  private void toast(String t){Toast.makeText(this,t,Toast.LENGTH_LONG).show();}
}
