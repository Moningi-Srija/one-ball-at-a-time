package com.moningi.oneballatatime.widget

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.ceil

internal object WidgetText {
  private const val MINUTE = 60_000L
  private const val HOUR = 60 * MINUTE
  private const val DAY = 24 * HOUR

  fun points(value: Double): String =
    BigDecimal.valueOf(value)
      .setScale(2, RoundingMode.HALF_UP)
      .stripTrailingZeros()
      .toPlainString()

  fun countdownHeadline(targetAt: Long, now: Long): String {
    val remaining = targetAt - now
    if (remaining <= 0L) return "Time’s up"
    if (remaining >= DAY) {
      val days = ceil(remaining.toDouble() / DAY).toLong()
      return if (days == 1L) "1 day left" else "$days days left"
    }
    if (remaining >= HOUR) {
      val hours = remaining / HOUR
      val minutes = (remaining % HOUR) / MINUTE
      return if (minutes == 0L) "${hours}h left" else "${hours}h ${minutes}m left"
    }
    val minutes = maxOf(1L, ceil(remaining.toDouble() / MINUTE).toLong())
    return "${minutes}m left"
  }

  fun targetDate(epochMillis: Long, timeZone: String): String {
    val zone = runCatching { ZoneId.of(timeZone) }.getOrDefault(ZoneId.systemDefault())
    return TARGET_FORMATTER.withLocale(Locale.getDefault()).withZone(zone).format(Instant.ofEpochMilli(epochMillis))
  }

  fun progress(value: Double, target: Double): Int =
    if (target <= 0.0) 0 else ((value / target) * 100.0).toInt().coerceIn(0, 100)

  fun timeProgress(startAt: Long, targetAt: Long, now: Long): Int {
    if (targetAt <= startAt) return if (now >= targetAt) 100 else 0
    return (((now - startAt).toDouble() / (targetAt - startAt)) * 100.0).toInt().coerceIn(0, 100)
  }

  /** Never label yesterday's cached score as today's while the app is closed overnight. */
  fun forCurrentDay(
    today: TodaySnapshot,
    snapshotTimeZone: String,
    now: Long = System.currentTimeMillis(),
    currentTimeZone: String = ZoneId.systemDefault().id,
  ): TodaySnapshot {
    val zone = runCatching { ZoneId.of(currentTimeZone) }.getOrDefault(ZoneId.systemDefault())
    val snapshotZone = runCatching { ZoneId.of(snapshotTimeZone) }.getOrDefault(zone)
    val instant = Instant.ofEpochMilli(now)
    val current = instant.atZone(zone)
    val dateKey = current.toLocalDate().toString()
    val sameDayRules = snapshotZone.rules == zone.rules
    if (sameDayRules && today.dateKey == dateKey) return today
    val nextDayStart = current.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
    return today.copy(
      dateKey = dateKey,
      points = 0.0,
      completedCount = 0,
      dayEndsAt = nextDayStart,
    )
  }

  private val TARGET_FORMATTER = DateTimeFormatter.ofPattern("EEE, d MMM · h:mm a")
}
