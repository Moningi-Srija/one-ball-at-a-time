package com.moningi.oneballatatime.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import java.time.Instant

class WidgetTextTest {
  @Test
  fun countdownHeadline_usesOneDotPerCalendarDayStyleRounding() {
    val day = 86_400_000L
    assertEquals("69 days left", WidgetText.countdownHeadline(68 * day + 1, 0))
    assertEquals("69 days left", WidgetText.countdownHeadline(69 * day, 0))
    assertEquals("1 day left", WidgetText.countdownHeadline(day, 0))
  }

  @Test
  fun countdownHeadline_switchesToHoursAndMinutesInsideOneDay() {
    assertEquals("8h 10m left", WidgetText.countdownHeadline(29_400_000L, 0))
    assertEquals("1m left", WidgetText.countdownHeadline(1, 0))
    assertEquals("Time’s up", WidgetText.countdownHeadline(0, 0))
  }

  @Test
  fun points_keepsQuarterPointValuesWithoutNoise() {
    assertEquals("0.25", WidgetText.points(0.25))
    assertEquals("6.5", WidgetText.points(6.5))
    assertEquals("25", WidgetText.points(25.0))
  }

  @Test
  fun progressValuesAreClamped() {
    assertEquals(25, WidgetText.progress(6.25, 25.0))
    assertEquals(100, WidgetText.progress(40.0, 25.0))
    assertEquals(0, WidgetText.progress(-2.0, 25.0))
    assertEquals(50, WidgetText.timeProgress(100, 200, 150))
  }

  @Test
  fun currentDay_keepsCurrentSnapshotAndClearsYesterday() {
    val now = Instant.parse("2026-09-19T06:00:00Z").toEpochMilli()
    val current = TodaySnapshot("2026-09-19", 6.5, 25.0, 4, now + 1_000)
    assertSame(current, WidgetText.forCurrentDay(current, "Asia/Kolkata", now, "Asia/Kolkata"))

    val stale = current.copy(dateKey = "2026-09-18")
    val rolled = WidgetText.forCurrentDay(stale, "Asia/Kolkata", now, "Asia/Kolkata")
    assertEquals("2026-09-19", rolled.dateKey)
    assertEquals(0.0, rolled.points, 0.0)
    assertEquals(0, rolled.completedCount)
    assertEquals(25.0, rolled.target, 0.0)
    assertEquals(Instant.parse("2026-09-19T18:30:00Z").toEpochMilli(), rolled.dayEndsAt)
  }

  @Test
  fun currentDay_clearsAggregateWhenDeviceTimezoneChanges() {
    val now = Instant.parse("2026-09-19T06:00:00Z").toEpochMilli()
    val indiaSnapshot = TodaySnapshot("2026-09-19", 12.0, 25.0, 5, now + 1_000)
    val rolled = WidgetText.forCurrentDay(indiaSnapshot, "Asia/Kolkata", now, "America/New_York")

    assertEquals(0.0, rolled.points, 0.0)
    assertEquals(0, rolled.completedCount)
    assertEquals(25.0, rolled.target, 0.0)
  }
}
