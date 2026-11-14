package com.jmisjustme.foldultra;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/** Owner-placed One UI widgets. No launcher takeover, network, or privileged permissions. */
public final class JMHomeWidget extends AppWidgetProvider {
  private static PendingIntent route(Context context, String path, int request) {
    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("jmfoldultra://open/" + path));
    intent.setClass(context, MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    return PendingIntent.getActivity(context, request, intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }
  @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    for (int id : ids) {
      android.appwidget.AppWidgetProviderInfo info = manager.getAppWidgetInfo(id);
      boolean expanded = info != null && info.provider != null
          && info.provider.getClassName().endsWith("JMHomeWidgetExpanded");
      int layout = expanded ? R.layout.jm_home_widget_expanded : R.layout.jm_home_widget_compact;
      RemoteViews views = new RemoteViews(context.getPackageName(), layout);
      views.setOnClickPendingIntent(R.id.jm_widget_open, route(context, "galaxy", 100 + id * 5));
      views.setOnClickPendingIntent(R.id.jm_widget_continue, route(context, "continue", 101 + id * 5));
      if (expanded) {
        views.setOnClickPendingIntent(R.id.jm_widget_projects, route(context, "projects", 102 + id * 5));
        views.setOnClickPendingIntent(R.id.jm_widget_capture, route(context, "capture", 103 + id * 5));
      }
      manager.updateAppWidget(id, views);
    }
  }
}
