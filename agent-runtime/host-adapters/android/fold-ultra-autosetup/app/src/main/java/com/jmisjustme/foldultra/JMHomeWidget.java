package com.jmisjustme.foldultra;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/** Owner-placed controls. Widget state is local to the QA package; no source estate is altered. */
public final class JMHomeWidget extends AppWidgetProvider {
  static final String CYCLE = "com.jmisjustme.foldultra.WIDGET_CYCLE";
  static final String REFRESH = "com.jmisjustme.foldultra.WIDGET_REFRESH";
  static final String[] ROOMS = {"galaxy", "projects", "continue", "capture"};
  static final String[] LABELS = {"Galaxy", "Projects", "Continue", "Capture"};

  private static PendingIntent route(Context c, String path, int request) {
    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("jmfoldultra://open/" + path));
    i.setClass(c, MainActivity.class);
    i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    return PendingIntent.getActivity(c, request, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }
  private static PendingIntent action(Context c, Class<?> provider, String act, int id) {
    Intent i = new Intent(c, provider).setAction(act).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id);
    return PendingIntent.getBroadcast(c, id * 7 + (CYCLE.equals(act) ? 1 : 2), i,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }
  static void update(Context c, AppWidgetManager m, int[] ids) {
    for (int id : ids) {
      android.appwidget.AppWidgetProviderInfo info = m.getAppWidgetInfo(id);
      boolean expanded = info != null && info.provider != null &&
          info.provider.getClassName().endsWith("JMHomeWidgetExpanded");
      Class<?> provider = expanded ? JMHomeWidgetExpanded.class : JMHomeWidget.class;
      int index = c.getSharedPreferences("jm.widget.qa",Context.MODE_PRIVATE).getInt("room." + id,0);
      index = Math.floorMod(index, ROOMS.length);
      RemoteViews v = new RemoteViews(c.getPackageName(),
          expanded ? R.layout.jm_home_widget_expanded : R.layout.jm_home_widget_compact);
      v.setTextViewText(R.id.jm_widget_selected, "CURRENT  •  " + LABELS[index] + "  (" + (index+1) + "/4)");
      v.setOnClickPendingIntent(R.id.jm_widget_open,route(c,ROOMS[index],id*7));
      v.setOnClickPendingIntent(R.id.jm_widget_selected,route(c,ROOMS[index],id*7));
      v.setOnClickPendingIntent(R.id.jm_widget_next,action(c,provider,CYCLE,id));
      v.setOnClickPendingIntent(R.id.jm_widget_refresh,action(c,provider,REFRESH,id));
      v.setOnClickPendingIntent(R.id.jm_widget_continue,route(c,"continue",id*7+3));
      if (expanded) {
        v.setOnClickPendingIntent(R.id.jm_widget_projects,route(c,"projects",id*7+4));
        v.setOnClickPendingIntent(R.id.jm_widget_capture,route(c,"capture",id*7+5));
      }
      m.updateAppWidget(id,v);
    }
  }
  static void receive(Context c, Intent i, Class<?> provider) {
    if (i == null) return;
    String a = i.getAction();
    if (!CYCLE.equals(a) && !REFRESH.equals(a)) return;
    int id=i.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
    if (id==AppWidgetManager.INVALID_APPWIDGET_ID) return;
    AppWidgetManager m=AppWidgetManager.getInstance(c);
    android.appwidget.AppWidgetProviderInfo info=m.getAppWidgetInfo(id);
    if(info==null || !info.provider.getClassName().equals(provider.getName()))return;
    if(CYCLE.equals(a)) {
      android.content.SharedPreferences p=c.getSharedPreferences("jm.widget.qa",Context.MODE_PRIVATE);
      p.edit().putInt("room."+id,(p.getInt("room."+id,0)+1)%ROOMS.length).apply();
    }
    update(c,m,new int[]{id});
  }
  @Override public void onReceive(Context c, Intent i) {
    super.onReceive(c,i);
    receive(c,i,JMHomeWidget.class);
  }
  @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){update(c,m,ids);}
  @Override public void onDeleted(Context c,int[] ids) {
    android.content.SharedPreferences.Editor e=c.getSharedPreferences("jm.widget.qa",Context.MODE_PRIVATE).edit();
    for(int id:ids)e.remove("room."+id);
    e.apply();
  }
}
