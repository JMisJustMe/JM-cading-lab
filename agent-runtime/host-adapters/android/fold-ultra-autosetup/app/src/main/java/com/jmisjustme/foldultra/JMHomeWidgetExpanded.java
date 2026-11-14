package com.jmisjustme.foldultra;

/** Independent expanded provider with its own cycle and refresh broadcast identity. */
public final class JMHomeWidgetExpanded extends android.appwidget.AppWidgetProvider {
  @Override public void onReceive(android.content.Context c,android.content.Intent i) {
    super.onReceive(c,i);
    JMHomeWidget.receive(c,i,JMHomeWidgetExpanded.class);
  }
  @Override public void onUpdate(android.content.Context c,
      android.appwidget.AppWidgetManager m,int[] ids) { JMHomeWidget.update(c,m,ids); }
  @Override public void onDeleted(android.content.Context c,int[] ids) {
    android.content.SharedPreferences.Editor e=JMHomeWidget.state(c).edit();
    for(int id:ids)e.remove("group."+id).remove("index."+id);
    e.apply();
  }
}
