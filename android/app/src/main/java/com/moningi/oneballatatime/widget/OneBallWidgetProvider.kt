package com.moningi.oneballatatime.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle

class OneBallWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { update(context, appWidgetManager, it) }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle,
  ) {
    update(context, appWidgetManager, appWidgetId)
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    appWidgetIds.forEach { WidgetStore.deleteConfiguration(context, it) }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (
      intent.action == Intent.ACTION_DATE_CHANGED ||
        intent.action == Intent.ACTION_TIME_CHANGED ||
        intent.action == Intent.ACTION_TIMEZONE_CHANGED
    ) {
      updateAll(context)
    }
  }

  companion object {
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, OneBallWidgetProvider::class.java))
      ids.forEach { update(context, manager, it) }
    }

    fun update(context: Context, appWidgetId: Int) {
      update(context, AppWidgetManager.getInstance(context), appWidgetId)
    }

    private fun update(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      manager.updateAppWidget(appWidgetId, WidgetRenderer.render(context, manager, appWidgetId))
    }
  }
}
