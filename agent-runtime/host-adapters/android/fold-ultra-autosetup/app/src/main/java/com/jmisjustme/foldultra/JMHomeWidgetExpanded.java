package com.jmisjustme.foldultra;

/** Distinct expanded One UI widget identity; delegates to the same safe native routes. */
public final class JMHomeWidgetExpanded extends android.appwidget.AppWidgetProvider {
  @Override public void onUpdate(android.content.Context context,
      android.appwidget.AppWidgetManager manager, int[] ids) {
    new JMHomeWidget().onUpdate(context, manager, ids);
  }
}
