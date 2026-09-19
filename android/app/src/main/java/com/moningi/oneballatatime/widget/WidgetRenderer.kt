package com.moningi.oneballatatime.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import androidx.core.graphics.toColorInt
import com.moningi.oneballatatime.MainActivity
import com.moningi.oneballatatime.R

internal object WidgetRenderer {
  private const val WIDE_BREAKPOINT_DP = 250
  private const val DAY = 86_400_000L

  fun render(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int): RemoteViews {
    val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
    val isWide = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH) >= WIDE_BREAKPOINT_DP
    val views =
      RemoteViews(
        context.packageName,
        if (isWide) R.layout.widget_one_ball_wide else R.layout.widget_one_ball_compact,
      )
    val configuration = WidgetStore.readConfiguration(context, appWidgetId)
    applyTheme(views, configuration.theme)

    val snapshot = WidgetStore.readSnapshot(context)
    if (snapshot == null) {
      renderEmpty(views)
      setOpenIntent(context, views, appWidgetId, DESTINATION_BOARD, null)
      return views
    }

    if (configuration.mode == WidgetMode.COUNTDOWN) {
      val countdown = snapshot.countdowns.firstOrNull { it.id == configuration.countdownId }
      if (countdown != null) {
        renderCountdown(views, countdown, configuration.hideCountdownTitle)
        setOpenIntent(context, views, appWidgetId, DESTINATION_COUNTDOWNS, countdown.id)
      } else {
        renderMissingCountdown(views)
        setOpenIntent(context, views, appWidgetId, DESTINATION_COUNTDOWNS, null)
      }
    } else {
      val today = snapshot.today
      if (today == null) {
        renderEmpty(views)
      } else {
        renderToday(views, WidgetText.forCurrentDay(today, snapshot.timeZone), isWide)
      }
      setOpenIntent(context, views, appWidgetId, DESTINATION_BOARD, null)
    }
    return views
  }

  private fun renderToday(views: RemoteViews, today: TodaySnapshot, isWide: Boolean) {
    val points = WidgetText.points(today.points)
    val target = WidgetText.points(today.target)
    val remainingPoints = WidgetText.points((today.target - today.points).coerceAtLeast(0.0))
    val wins = if (today.completedCount == 1) "1 win" else "${today.completedCount} wins"

    views.setTextViewText(R.id.widget_eyebrow, "THIS IS HOW MUCH LIFE YOU LIVED TODAY")
    views.setTextViewText(R.id.widget_emoji, "💗")
    views.setTextViewText(R.id.widget_title, "One Ball at a Time")
    views.setTextViewText(R.id.widget_headline, "$points / $target pts")
    views.setTextViewText(
      R.id.widget_subtitle,
      if (today.points >= today.target) "$wins · daily target crushed" else "$wins · $remainingPoints pts to your goal",
    )
    views.setProgressBar(R.id.widget_progress, 100, WidgetText.progress(today.points, today.target), false)
    views.setTextViewText(R.id.widget_footer, "Tap to choose the next ball")
    views.setViewVisibility(R.id.widget_chronometer, if (isWide && today.dayEndsAt > System.currentTimeMillis()) View.VISIBLE else View.GONE)
    if (isWide && today.dayEndsAt > System.currentTimeMillis()) {
      applyCountdownChronometer(views, today.dayEndsAt, "Day ends in %s")
    }
    applyAccent(views, DEFAULT_ACCENT)
  }

  private fun renderCountdown(
    views: RemoteViews,
    countdown: CountdownSnapshot,
    hideTitle: Boolean,
  ) {
    val now = System.currentTimeMillis()
    val remaining = countdown.targetAt - now
    views.setTextViewText(R.id.widget_eyebrow, "THINGS WORTH LOOKING FORWARD TO")
    views.setTextViewText(R.id.widget_emoji, countdown.emoji)
    views.setTextViewText(R.id.widget_title, if (hideTitle) "Your countdown" else countdown.title)
    views.setTextViewText(R.id.widget_headline, WidgetText.countdownHeadline(countdown.targetAt, now))
    views.setTextViewText(
      R.id.widget_subtitle,
      "Target · ${WidgetText.targetDate(countdown.targetAt, java.time.ZoneId.systemDefault().id)}",
    )
    views.setProgressBar(
      R.id.widget_progress,
      100,
      WidgetText.timeProgress(countdown.startAt, countdown.targetAt, now),
      false,
    )
    views.setTextViewText(
      R.id.widget_footer,
      when {
        remaining <= 0L -> "Tap to edit or choose your next milestone"
        remaining <= DAY -> "Today. Make it count."
        else -> "Tap to open Countdown Court"
      },
    )
    // RemoteViews Chronometer keeps ticking into negative values after zero.
    // Static copy between provider refreshes is safer than ever showing -00:01.
    views.setViewVisibility(R.id.widget_chronometer, View.GONE)
    applyAccent(views, parseColor(countdown.color))
  }

  private fun renderEmpty(views: RemoteViews) {
    views.setTextViewText(R.id.widget_eyebrow, "ONE BALL AT A TIME")
    views.setTextViewText(R.id.widget_emoji, "🎀")
    views.setTextViewText(R.id.widget_title, "Open the app once")
    views.setTextViewText(R.id.widget_headline, "Your day belongs here")
    views.setTextViewText(R.id.widget_subtitle, "Sign in to bring your score and countdowns onto your Home Screen.")
    views.setTextViewText(R.id.widget_footer, "Tap to open")
    views.setProgressBar(R.id.widget_progress, 100, 0, false)
    views.setViewVisibility(R.id.widget_chronometer, View.GONE)
    applyAccent(views, DEFAULT_ACCENT)
  }

  private fun renderMissingCountdown(views: RemoteViews) {
    views.setTextViewText(R.id.widget_eyebrow, "COUNTDOWN COURT")
    views.setTextViewText(R.id.widget_emoji, "🎯")
    views.setTextViewText(R.id.widget_title, "Choose a countdown")
    views.setTextViewText(R.id.widget_headline, "Something good is coming")
    views.setTextViewText(R.id.widget_subtitle, "Open the app to select what you want to see here.")
    views.setTextViewText(R.id.widget_footer, "Tap to choose")
    views.setProgressBar(R.id.widget_progress, 100, 0, false)
    views.setViewVisibility(R.id.widget_chronometer, View.GONE)
    applyAccent(views, DEFAULT_ACCENT)
  }

  private fun applyCountdownChronometer(views: RemoteViews, targetAt: Long, format: String) {
    val base = SystemClock.elapsedRealtime() + (targetAt - System.currentTimeMillis()).coerceAtLeast(0L)
    views.setChronometer(R.id.widget_chronometer, base, format, true)
    views.setChronometerCountDown(R.id.widget_chronometer, true)
  }

  private fun applyTheme(views: RemoteViews, theme: WidgetTheme) {
    val background =
      when (theme) {
        WidgetTheme.NOTEBOOK -> R.drawable.widget_bg_notebook
        WidgetTheme.PLAID -> R.drawable.widget_bg_plaid
        WidgetTheme.CLEAN -> R.drawable.widget_bg_clean
      }
    views.setInt(R.id.widget_surface, "setBackgroundResource", background)
    views.setViewVisibility(R.id.widget_grid_overlay, if (theme == WidgetTheme.CLEAN) View.GONE else View.VISIBLE)
    if (theme != WidgetTheme.CLEAN) {
      views.setImageViewResource(
        R.id.widget_grid_overlay,
        if (theme == WidgetTheme.PLAID) R.drawable.widget_grid_plaid else R.drawable.widget_grid_notebook,
      )
    }
  }

  private fun applyAccent(views: RemoteViews, accent: Int) {
    views.setTextColor(R.id.widget_headline, accent)
    views.setTextColor(R.id.widget_eyebrow, accent)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      views.setColorStateList(R.id.widget_progress, "setProgressTintList", android.content.res.ColorStateList.valueOf(accent))
    }
  }

  private fun setOpenIntent(
    context: Context,
    views: RemoteViews,
    appWidgetId: Int,
    destination: String,
    countdownId: String?,
  ) {
    val intent =
      Intent(context, MainActivity::class.java).apply {
        action = "$ACTION_OPEN_FROM_WIDGET.$appWidgetId.$destination"
        putExtra(MainActivity.EXTRA_TAB, destination)
        countdownId?.let { putExtra(MainActivity.EXTRA_COUNTDOWN_ID, it) }
        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      }
    val pendingIntent =
      PendingIntent.getActivity(
        context,
        appWidgetId,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
  }

  private fun parseColor(value: String): Int = runCatching { value.toColorInt() }.getOrDefault(DEFAULT_ACCENT)

  const val DESTINATION_BOARD = "board"
  const val DESTINATION_COUNTDOWNS = "countdowns"
  private const val ACTION_OPEN_FROM_WIDGET = "com.moningi.oneballatatime.OPEN_FROM_WIDGET"
  private const val DEFAULT_ACCENT = 0xFFD43F73.toInt()
}
