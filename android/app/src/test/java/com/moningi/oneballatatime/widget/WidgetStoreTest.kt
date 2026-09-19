package com.moningi.oneballatatime.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class WidgetStoreTest {
  @Test
  fun parseSnapshot_acceptsSanitizedPayloadAndZeroTarget() {
    val parsed =
      WidgetStore.parseSnapshot(
        """
        {
          "generatedAt": 1790000000000,
          "timeZone": "Asia/Kolkata",
          "today": {
            "dateKey": "2026-09-19",
            "points": 6.5,
            "target": 0,
            "completedCount": 4,
            "dayEndsAt": 1790006400000,
            "privateTaskNames": ["must never survive"]
          },
          "countdowns": [{
            "id": "interview",
            "title": "First Interview",
            "emoji": "😎",
            "color": "#c0376a",
            "style": "court-grid",
            "startAt": 1780000000000,
            "targetAt": 1800000000000,
            "note": "must never survive"
          }],
          "pin": "must never survive",
          "log": [{"title": "must never survive"}]
        }
        """.trimIndent(),
      )

    assertNotNull(parsed)
    assertEquals(0.0, parsed!!.today!!.target, 0.0)
    assertEquals(1, parsed.countdowns.size)
    assertEquals("First Interview", parsed.countdowns.single().title)
  }

  @Test
  fun parseSnapshot_rejectsMissingOrMalformedTodayState() {
    assertNull(WidgetStore.parseSnapshot("{}"))
    assertNull(WidgetStore.parseSnapshot("""{"today":{},"countdowns":[]}"""))
    assertNull(
      WidgetStore.parseSnapshot(
        """{"today":{"dateKey":"not-a-date","points":1,"target":25,"dayEndsAt":1},"countdowns":[]}""",
      ),
    )
  }

  @Test
  fun parseSnapshot_rejectsOversizedPayloadBeforeJsonParsing() {
    assertNull(WidgetStore.parseSnapshot("x".repeat(131_073)))
  }
}
