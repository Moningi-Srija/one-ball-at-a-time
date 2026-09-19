package com.moningi.oneballatatime.widget

/**
 * A deliberately small, non-sensitive projection of the web app's state.
 *
 * The widget never receives or persists the user's PIN, session cookie, task log, or countdown
 * notes. Only the aggregate values and display fields required to draw a widget live here.
 */
data class WidgetSnapshot(
  val generatedAt: Long,
  val timeZone: String,
  val today: TodaySnapshot?,
  val countdowns: List<CountdownSnapshot>,
)

data class TodaySnapshot(
  val dateKey: String,
  val points: Double,
  val target: Double,
  val completedCount: Int,
  val dayEndsAt: Long,
)

data class CountdownSnapshot(
  val id: String,
  val title: String,
  val emoji: String,
  val color: String,
  val style: String,
  val startAt: Long,
  val targetAt: Long,
)

enum class WidgetMode {
  TODAY,
  COUNTDOWN,
}

enum class WidgetTheme {
  NOTEBOOK,
  PLAID,
  CLEAN,
}

data class WidgetConfiguration(
  val mode: WidgetMode = WidgetMode.TODAY,
  val countdownId: String? = null,
  val theme: WidgetTheme = WidgetTheme.NOTEBOOK,
  val hideCountdownTitle: Boolean = false,
)
