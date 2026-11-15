package com.jmisjustme.foldultra;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** V3: independent, source-backed project shelf browser and native action controls. */
public final class JMHomeWidget extends AppWidgetProvider {
  static final String NEXT="com.jmisjustme.foldultra.WIDGET_NEXT";
  static final String PREV="com.jmisjustme.foldultra.WIDGET_PREV";
  static final String FILTER="com.jmisjustme.foldultra.WIDGET_FILTER";
  static final String PIN="com.jmisjustme.foldultra.WIDGET_PIN";
  static final String JUMP="com.jmisjustme.foldultra.WIDGET_JUMP";
  static final String REFRESH="com.jmisjustme.foldultra.WIDGET_REFRESH";
  static final String[] GROUPS={"ALL","GAMES","BUILD","MUSIC","BOOKS","ESTATE","COMICS","CARTOONS"};
  private static final String STORE="jm.widget.v3";
  static SharedPreferences state(Context c){return c.getSharedPreferences(STORE,Context.MODE_PRIVATE);}
  private static PendingIntent route(Context c,String path,int request) {
    Intent i=new Intent(Intent.ACTION_VIEW,Uri.parse("jmfoldultra://open/"+path));
    i.setClass(c,MainActivity.class);
    i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
    return PendingIntent.getActivity(c,request,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  }
  // Only syntactically permitted HTTPS URLs may launch externally; reachability is not verified.
  // An unbound or invalid route stays inside the original Projects room.
  private static PendingIntent projectLaunch(Context c,String url,int request) {
    try {
      String safe=ProjectShelf.safeUrl(url);
      if(!safe.isEmpty()) {
        Intent i=new Intent(Intent.ACTION_VIEW,Uri.parse(safe));
        i.addCategory(Intent.CATEGORY_BROWSABLE);
        return PendingIntent.getActivity(c,request,i,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
      }
    }catch(Exception ignored){}
    return route(c,"projects",request);
  }
  private static PendingIntent action(Context c,Class<?> provider,String act,int id,int slot) {
    Intent i=new Intent(c,provider).setAction(act).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id);
    return PendingIntent.getBroadcast(c,id*16+slot,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  }
  static JSONArray projects(Context c) throws Exception {
    return ProjectShelf.all(c.getSharedPreferences(MainActivity.PREF,Context.MODE_PRIVATE));
  }
  static JSONArray filtered(JSONArray all,String group) throws Exception {
    JSONArray result=new JSONArray();
    for(int n=0;n<all.length();n++){
      JSONObject item=all.getJSONObject(n);
      if("ALL".equals(group)||group.equals(item.optString("family")))result.put(item);
    }
    return result;
  }
  static void refreshAll(Context c){
    AppWidgetManager m=AppWidgetManager.getInstance(c);
    int[] compact=m.getAppWidgetIds(new android.content.ComponentName(c,JMHomeWidget.class));
    int[] expanded=m.getAppWidgetIds(new android.content.ComponentName(c,JMHomeWidgetExpanded.class));
    update(c,m,compact);
    update(c,m,expanded);
  }
  static void update(Context c,AppWidgetManager m,int[] ids) {
    for(int id:ids) {
      android.appwidget.AppWidgetProviderInfo info=m.getAppWidgetInfo(id);
      if(info==null||info.provider==null)continue;
      boolean expanded=info.provider.getClassName().endsWith("JMHomeWidgetExpanded");
      Class<?> provider=expanded?JMHomeWidgetExpanded.class:JMHomeWidget.class;
      SharedPreferences s=state(c);
      int groupIndex=Math.floorMod(s.getInt("group."+id,0),GROUPS.length);
      String group=GROUPS[groupIndex];
      int index=s.getInt("index."+id,0);
      String title="No projects in this category",subtitle="Choose another category",count="0 projects";
      String activeId="",activeUrl="";
      try {
        JSONArray items=filtered(projects(c),group);
        count=items.length()+" project"+(items.length()==1?"":"s");
        if(items.length()>0) {
          index=Math.floorMod(index,items.length());
          JSONObject project=items.getJSONObject(index);
          title=project.optString("title","Untitled");
          activeId=project.optString("id","");
          activeUrl=project.optString("url","");
          subtitle=project.optString("family","ESTATE")+"  •  "+(index+1)+"/"+items.length();
        }
      }catch(Exception e) {
        title="Shelf unavailable";subtitle="Open Projects to inspect";count="No data overwritten";
      }
      RemoteViews v=new RemoteViews(c.getPackageName(),expanded?R.layout.jm_home_widget_expanded:R.layout.jm_home_widget_compact);
      v.setTextViewText(R.id.jm_widget_selected,title);
      v.setTextViewText(R.id.jm_widget_subtitle,subtitle);
      v.setTextViewText(R.id.jm_widget_filter,group+"  ▾");
      v.setTextViewText(R.id.jm_widget_count,count);
      v.setTextViewText(R.id.jm_widget_link,activeUrl.isEmpty()?"UNBOUND / Open Shelf":"OPEN PUBLIC HTTPS LINK");
      v.setOnClickPendingIntent(R.id.jm_widget_link,projectLaunch(c,activeUrl,id*16+13));
      boolean pinned=!activeId.isEmpty()&&activeId.equals(s.getString("pin."+id,""));
      v.setTextViewText(R.id.jm_widget_pin,pinned?"★ Pinned":"☆ Pin");
      v.setTextViewText(R.id.jm_widget_jump,"★ Recall");
      v.setOnClickPendingIntent(R.id.jm_widget_pin,action(c,provider,PIN,id,11));
      v.setOnClickPendingIntent(R.id.jm_widget_jump,action(c,provider,JUMP,id,12));
      v.setOnClickPendingIntent(R.id.jm_widget_next,action(c,provider,NEXT,id,1));
      v.setOnClickPendingIntent(R.id.jm_widget_prev,action(c,provider,PREV,id,2));
      v.setOnClickPendingIntent(R.id.jm_widget_filter,action(c,provider,FILTER,id,3));
      v.setOnClickPendingIntent(R.id.jm_widget_refresh,action(c,provider,REFRESH,id,4));
      v.setOnClickPendingIntent(R.id.jm_widget_selected,projectLaunch(c,activeUrl,id*16+5));
      v.setOnClickPendingIntent(R.id.jm_widget_open,route(c,"projects",id*16+6));
      v.setOnClickPendingIntent(R.id.jm_widget_continue,route(c,"continue",id*16+7));
      if(expanded){
        v.setOnClickPendingIntent(R.id.jm_widget_projects,route(c,"projects",id*16+8));
        v.setOnClickPendingIntent(R.id.jm_widget_capture,route(c,"capture",id*16+9));
        v.setOnClickPendingIntent(R.id.jm_widget_galaxy,route(c,"galaxy",id*16+10));
      }
      m.updateAppWidget(id,v);
    }
  }
  static void receive(Context c,Intent i,Class<?> provider) {
    if(i==null)return;
    String a=i.getAction();
    if(!NEXT.equals(a)&&!PREV.equals(a)&&!FILTER.equals(a)&&!REFRESH.equals(a)&&!PIN.equals(a)&&!JUMP.equals(a))return;
    int id=i.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
    if(id==AppWidgetManager.INVALID_APPWIDGET_ID)return;
    AppWidgetManager m=AppWidgetManager.getInstance(c);
    android.appwidget.AppWidgetProviderInfo info=m.getAppWidgetInfo(id);
    if(info==null||info.provider==null||!provider.getName().equals(info.provider.getClassName()))return;
    SharedPreferences s=state(c);
    int groupIndex=Math.floorMod(s.getInt("group."+id,0),GROUPS.length);
    int index=s.getInt("index."+id,0);
    if(FILTER.equals(a)){
      // Skip empty families, but keep ALL as the reset destination.
      try {
        JSONArray all=projects(c);
        for(int k=0;k<GROUPS.length;k++){
          groupIndex=(groupIndex+1)%GROUPS.length;
          if(groupIndex==0||filtered(all,GROUPS[groupIndex]).length()>0)break;
        }
      }catch(Exception ignored){groupIndex=(groupIndex+1)%GROUPS.length;}
      index=0;
    }else if(PIN.equals(a)||JUMP.equals(a)){
      try {
        JSONArray items=filtered(projects(c),GROUPS[groupIndex]);
        if(PIN.equals(a)&&items.length()>0){
          String current=items.getJSONObject(Math.floorMod(index,items.length())).optString("id","");
          String prior=s.getString("pin."+id,"");
          s.edit().putString("pin."+id,current.equals(prior)?"":current).apply();
        }else if(JUMP.equals(a)){
          String pinned=s.getString("pin."+id,"");
          JSONArray all=projects(c);
          for(int n=0;n<all.length();n++){
            JSONObject item=all.getJSONObject(n);
            if(item.optString("id","").equals(pinned)){
              String family=item.optString("family","");
              int target=0;
              for(int k=1;k<GROUPS.length;k++)if(GROUPS[k].equals(family))target=k;
              groupIndex=target;
              JSONArray found=filtered(all,GROUPS[groupIndex]);
              for(int j=0;j<found.length();j++)if(found.getJSONObject(j).optString("id","").equals(pinned)){index=j;break;}
              break;
            }
          }
        }
      }catch(Exception ignored){}
    }
    else if(NEXT.equals(a)||PREV.equals(a)){
      try {
        int count=filtered(projects(c),GROUPS[groupIndex]).length();
        if(count>0)index=Math.floorMod(index+(NEXT.equals(a)?1:-1),count);
      }catch(Exception ignored){}
    }
    s.edit().putInt("group."+id,groupIndex).putInt("index."+id,index).apply();
    update(c,m,new int[]{id});
  }
  @Override public void onReceive(Context c,Intent i){super.onReceive(c,i);receive(c,i,JMHomeWidget.class);}
  @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){update(c,m,ids);}
  @Override public void onDeleted(Context c,int[] ids){
    SharedPreferences.Editor e=state(c).edit();
    for(int id:ids){e.remove("group."+id).remove("index."+id).remove("pin."+id);}e.apply();
  }
}
