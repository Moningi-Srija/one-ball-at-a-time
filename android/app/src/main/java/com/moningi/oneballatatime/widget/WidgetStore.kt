package com.moningi.oneballatatime.widget

import android.annotation.SuppressLint
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/** SharedPreferences-backed storage for the widget's sanitized foreground snapshot. */
@SuppressLint("UseKtx")
object WidgetStore {
  private const val PREFS_NAME = "one_ball_widget"
  private const val KEY_SNAPSHOT = "snapshot_v1"
  private const val MODE_PREFIX = "mode_"
  private const val COUNTDOWN_PREFIX = "countdown_"
  private const val THEME_PREFIX = "theme_"
  private const val HIDE_TITLE_PREFIX = "hide_title_"

  private const val MAX_COUNTDOWNS = 100
  private const val MAX_SNAPSHOT_CHARS = 131_072
  private const val MAX_ID_LENGTH = 100
  private const val MAX_TITLE_LENGTH = 120
  private const val MAX_EMOJI_LENGTH = 32
  private const val MAX_TIME_ZONE_LENGTH = 80
  private const val MAX_DATE_KEY_LENGTH = 32
  private const val MAX_EPOCH_MILLIS = 253_402_300_799_000L // 9999-12-31T23:59:59Z
  private val hexColor = Regex("^#[0-9a-fA-F]{6}$")
  private val dateKey = Regex("^\\d{4}-\\d{2}-\\d{2}$")
  private val supportedStyles = setOf("ball-ring", "court-grid", "clean-bar")

  /**
   * Parses and stores a sanitized widget-only snapshot.
   *
   * Returning false leaves the last valid snapshot intact. Unknown JSON fields (including notes,
   * credentials, and task data) are ignored and are never copied into SharedPreferences.
   */
  fun saveSnapshot(context: Context, rawJson: String): Boolean {
    val parsed = parseSnapshot(rawJson) ?: return false
    return preferences(context).edit().putString(KEY_SNAPSHOT, serializeSnapshot(parsed)).commit()
  }

  fun readSnapshot(context: Context): WidgetSnapshot? {
    val raw = preferences(context).getString(KEY_SNAPSHOT, null) ?: return null
    return parseSnapshot(raw)
  }

  fun saveConfiguration(context: Context, appWidgetId: Int, configuration: WidgetConfiguration) {
    preferences(context)
      .edit()
      .putString(MODE_PREFIX + appWidgetId, configuration.mode.name)
      .putString(COUNTDOWN_PREFIX + appWidgetId, configuration.countdownId?.take(MAX_ID_LENGTH))
      .putString(THEME_PREFIX + appWidgetId, configuration.theme.name)
      .putBoolean(HIDE_TITLE_PREFIX + appWidgetId, configuration.hideCountdownTitle)
      .apply()
  }

  fun readConfiguration(context: Context, appWidgetId: Int): WidgetConfiguration {
    val prefs = preferences(context)
    return WidgetConfiguration(
      mode = prefs.getString(MODE_PREFIX + appWidgetId, null).toEnumOrDefault(WidgetMode.TODAY),
      countdownId = prefs.getString(COUNTDOWN_PREFIX + appWidgetId, null),
      theme = prefs.getString(THEME_PREFIX + appWidgetId, null).toEnumOrDefault(WidgetTheme.NOTEBOOK),
      hideCountdownTitle = prefs.getBoolean(HIDE_TITLE_PREFIX + appWidgetId, false),
    )
  }

  fun deleteConfiguration(context: Context, appWidgetId: Int) {
    preferences(context)
      .edit()
      .remove(MODE_PREFIX + appWidgetId)
      .remove(COUNTDOWN_PREFIX + appWidgetId)
      .remove(THEME_PREFIX + appWidgetId)
      .remove(HIDE_TITLE_PREFIX + appWidgetId)
      .apply()
  }

  internal fun parseSnapshot(rawJson: String): WidgetSnapshot? =
    if (rawJson.length > MAX_SNAPSHOT_CHARS) {
      null
    } else {
      runCatching {
        val root = JSONObject(rawJson)
        val now = System.currentTimeMillis()
        val generatedAt = root.safeEpoch("generatedAt", now)
        val timeZone = root.optString("timeZone", "").trim().take(MAX_TIME_ZONE_LENGTH)
        val todayJson = root.optJSONObject("today") ?: error("Missing today snapshot")
        val countdownArray = root.optJSONArray("countdowns") ?: error("Missing countdown list")
        val today = parseToday(todayJson) ?: error("Invalid today snapshot")
        val countdowns = parseCountdowns(countdownArray)
        WidgetSnapshot(
          generatedAt = generatedAt,
          timeZone = timeZone,
          today = today,
          countdowns = countdowns,
        )
      }
      .getOrNull()
    }

  private fun parseToday(json: JSONObject): TodaySnapshot? {
    val parsedDateKey = json.optString("dateKey", "").trim().take(MAX_DATE_KEY_LENGTH)
    val points = json.optDouble("points", Double.NaN)
    val target = json.optDouble("target", Double.NaN)
    val dayEndsAt = json.safeEpoch("dayEndsAt", 0L)
    if (!dateKey.matches(parsedDateKey) || !points.isFinite() || !target.isFinite() || dayEndsAt <= 0L) return null
    return TodaySnapshot(
      dateKey = parsedDateKey,
      points = points.coerceIn(0.0, 1_000_000.0),
      target = target.coerceIn(0.0, 1_000_000.0),
      completedCount = json.optInt("completedCount", 0).coerceIn(0, 100_000),
      dayEndsAt = dayEndsAt,
    )
  }

  private fun parseCountdowns(array: JSONArray?): List<CountdownSnapshot> {
    if (array == null) return emptyList()
    val parsed = ArrayList<CountdownSnapshot>(minOf(array.length(), MAX_COUNTDOWNS))
    val seenIds = HashSet<String>()
    for (index in 0 until minOf(array.length(), MAX_COUNTDOWNS)) {
      val json = array.optJSONObject(index) ?: continue
      val id = json.optString("id", "").trim().take(MAX_ID_LENGTH)
      val title = json.optString("title", "").trim().take(MAX_TITLE_LENGTH)
      val targetAt = json.safeEpoch("targetAt", 0L)
      val startAt = json.safeEpoch("startAt", targetAt)
      if (id.isBlank() || title.isBlank() || targetAt <= startAt || !seenIds.add(id)) continue

      val candidateColor = json.optString("color", "").trim()
      val candidateStyle = json.optString("style", "clean-bar").trim().lowercase(Locale.ROOT)
      parsed +=
        CountdownSnapshot(
          id = id,
          title = title,
          emoji = json.optString("emoji", "").trim().take(MAX_EMOJI_LENGTH).ifBlank { "🎯" },
          color = candidateColor.takeIf(hexColor::matches) ?: "#D43F73",
          style = candidateStyle.takeIf(supportedStyles::contains) ?: "clean-bar",
          startAt = startAt,
          targetAt = targetAt,
        )
    }
    return parsed
  }

  private fun serializeSnapshot(snapshot: WidgetSnapshot): String =
    JSONObject()
      .put("generatedAt", snapshot.generatedAt)
      .put("timeZone", snapshot.timeZone)
      .put(
        "today",
        snapshot.today?.let {
          JSONObject()
            .put("dateKey", it.dateKey)
            .put("points", it.points)
            .put("target", it.target)
            .put("completedCount", it.completedCount)
            .put("dayEndsAt", it.dayEndsAt)
        },
      )
      .put(
        "countdowns",
        JSONArray().also { array ->
          snapshot.countdowns.forEach { countdown ->
            array.put(
              JSONObject()
                .put("id", countdown.id)
                .put("title", countdown.title)
                .put("emoji", countdown.emoji)
                .put("color", countdown.color)
                .put("style", countdown.style)
                .put("startAt", countdown.startAt)
                .put("targetAt", countdown.targetAt),
            )
          }
        },
      )
      .toString()

  private fun JSONObject.safeEpoch(name: String, fallback: Long): Long =
    optLong(name, fallback).coerceIn(0L, MAX_EPOCH_MILLIS)

  private inline fun <reified T : Enum<T>> String?.toEnumOrDefault(default: T): T =
    this?.let { value -> enumValues<T>().firstOrNull { it.name == value } } ?: default

  private fun preferences(context: Context) =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
