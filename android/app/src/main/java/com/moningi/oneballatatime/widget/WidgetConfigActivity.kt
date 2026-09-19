package com.moningi.oneballatatime.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.moningi.oneballatatime.MainActivity
import com.moningi.oneballatatime.R

/** Lets every Home Screen widget independently choose its content and paper style. */
class WidgetConfigActivity : Activity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private val countdownChoiceByViewId = mutableMapOf<Int, String>()
    private var renderedSnapshotAt: Long? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)

        appWidgetId = intent?.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }
        setContentView(buildContent())
    }

    override fun onResume() {
        super.onResume()
        val latestSnapshotAt = WidgetStore.readSnapshot(this)?.generatedAt
        if (latestSnapshotAt != renderedSnapshotAt) setContentView(buildContent())
    }

    private fun buildContent(): View {
        countdownChoiceByViewId.clear()
        val saved = WidgetStore.readConfiguration(this, appWidgetId)
        val snapshot = WidgetStore.readSnapshot(this)
        renderedSnapshotAt = snapshot?.generatedAt
        val scroll = ScrollView(this).apply {
            setBackgroundColor(PAPER)
            clipToPadding = false
            ViewCompat.setOnApplyWindowInsetsListener(this) { view, insets ->
                val bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
                )
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                insets
            }
        }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(32), dp(24), dp(32))
        }

        content.addView(label("ONE BALL AT A TIME", 13f, PINK, Typeface.BOLD))
        content.addView(label("Choose your Home Screen view", 28f, INK, Typeface.BOLD).withMargins(top = 8))
        content.addView(
            label(
                "You can add this widget more than once—one for today and another for a trip, interview, or anything you’re looking forward to.",
                16f,
                MUTED,
            ).withMargins(top = 10, bottom = 24),
        )

        content.addView(label("WHAT SHOULD IT SHOW?", 12f, PINK, Typeface.BOLD))
        val choices = RadioGroup(this).apply {
            orientation = RadioGroup.VERTICAL
            setPadding(0, dp(6), 0, dp(10))
        }
        val todayChoice = radio("💗  Today’s score")
        choices.addView(todayChoice)

        snapshot?.countdowns
            ?.sortedWith(compareBy<CountdownSnapshot> { it.targetAt < System.currentTimeMillis() }.thenBy { it.targetAt })
            ?.forEach { countdown ->
                val choice = radio("${countdown.emoji}  ${countdown.title}")
                countdownChoiceByViewId[choice.id] = countdown.id
                choices.addView(choice)
            }

        val selectedCountdownView = countdownChoiceByViewId.entries
            .firstOrNull { it.value == saved.countdownId }
            ?.key
        choices.check(
            if (saved.mode == WidgetMode.COUNTDOWN && selectedCountdownView != null) {
                selectedCountdownView
            } else {
                todayChoice.id
            },
        )
        content.addView(choices)

        if (snapshot == null) {
            content.addView(
                label(
                    "Open the app and sign in once to sync your private score and countdowns. Your PIN and task notes never enter the widget snapshot.",
                    14f,
                    MUTED,
                ).card().withMargins(bottom = 20),
            )
            content.addView(Button(this).apply {
                text = getString(R.string.widget_config_open_app)
                isAllCaps = false
                setTextColor(PINK)
                backgroundTintList = ColorStateList.valueOf(Color.WHITE)
                setOnClickListener { startActivity(Intent(this@WidgetConfigActivity, MainActivity::class.java)) }
            })
        }

        content.addView(label("PAPER STYLE", 12f, PINK, Typeface.BOLD).withMargins(top = 18, bottom = 6))
        val themes = Spinner(this).apply {
            adapter = ArrayAdapter(
                this@WidgetConfigActivity,
                android.R.layout.simple_spinner_dropdown_item,
                listOf("Pink notebook", "Pink plaid", "Clean paper"),
            )
            setSelection(
                when (saved.theme) {
                    WidgetTheme.NOTEBOOK -> 0
                    WidgetTheme.PLAID -> 1
                    WidgetTheme.CLEAN -> 2
                },
            )
        }
        content.addView(themes)

        val hideTitle = CheckBox(this).apply {
            text = getString(R.string.widget_config_hide_title)
            textSize = 14f
            setTextColor(INK)
            isChecked = saved.hideCountdownTitle
            buttonTintList = ColorStateList.valueOf(PINK)
            setPadding(0, dp(10), 0, dp(12))
        }
        content.addView(hideTitle)

        val addButton = Button(this).apply {
            text = getString(R.string.widget_config_add)
            isAllCaps = false
            textSize = 16f
            setTextColor(Color.WHITE)
            backgroundTintList = ColorStateList.valueOf(PINK)
            setPadding(dp(16), dp(12), dp(16), dp(12))
            setOnClickListener {
                val countdownId = countdownChoiceByViewId[choices.checkedRadioButtonId]
                val theme = when (themes.selectedItemPosition) {
                    1 -> WidgetTheme.PLAID
                    2 -> WidgetTheme.CLEAN
                    else -> WidgetTheme.NOTEBOOK
                }
                WidgetStore.saveConfiguration(
                    this@WidgetConfigActivity,
                    appWidgetId,
                    WidgetConfiguration(
                        mode = if (countdownId == null) WidgetMode.TODAY else WidgetMode.COUNTDOWN,
                        countdownId = countdownId,
                        theme = theme,
                        hideCountdownTitle = hideTitle.isChecked,
                    ),
                )
                OneBallWidgetProvider.update(this@WidgetConfigActivity, appWidgetId)
                setResult(
                    RESULT_OK,
                    Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId),
                )
                finish()
            }
        }
        content.addView(addButton.withMargins(top = 10))

        scroll.addView(content)
        return scroll
    }

    private fun label(text: String, size: Float, color: Int, style: Int = Typeface.NORMAL) =
        TextView(this).apply {
            this.text = text
            textSize = size
            setTextColor(color)
            setTypeface(typeface, style)
            setLineSpacing(0f, 1.12f)
        }

    private fun radio(text: String) = RadioButton(this).apply {
        id = View.generateViewId()
        this.text = text
        textSize = 16f
        setTextColor(INK)
        buttonTintList = ColorStateList.valueOf(PINK)
        setPadding(0, dp(8), 0, dp(8))
    }

    private fun TextView.card(): TextView = apply {
        setPadding(dp(16), dp(14), dp(16), dp(14))
        background = GradientDrawable().apply {
            setColor(Color.WHITE)
            cornerRadius = dp(14).toFloat()
            setStroke(dp(1), GRID)
        }
    }

    private fun <T : View> T.withMargins(
        top: Int = 0,
        bottom: Int = 0,
    ): T = apply {
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply {
            topMargin = dp(top)
            bottomMargin = dp(bottom)
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        private val PAPER = Color.rgb(255, 248, 251)
        private val GRID = Color.rgb(240, 194, 212)
        private val PINK = Color.rgb(192, 55, 106)
        private val INK = Color.rgb(64, 38, 49)
        private val MUTED = Color.rgb(120, 83, 98)
    }
}
