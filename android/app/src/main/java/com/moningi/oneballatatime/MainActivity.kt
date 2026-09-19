package com.moningi.oneballatatime

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewClientCompat
import androidx.webkit.WebViewFeature
import com.moningi.oneballatatime.widget.OneBallWidgetProvider
import com.moningi.oneballatatime.widget.WidgetStore

/**
 * A deliberately small native shell around the private One Ball at a Time site.
 *
 * Authentication stays inside WebView's cookie jar. The only data allowed across the
 * JavaScript bridge is the sanitized widget snapshot parsed by [WidgetStore].
 */
class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var webViewDestroyed = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(255, 249, 252))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.mediaPlaybackRequiresUserGesture = true
            settings.setGeolocationEnabled(false)
            settings.safeBrowsingEnabled = true
            webChromeClient = WebChromeClient()
            webViewClient = OneBallWebViewClient()
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, false)
        }

        ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
            )
            val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, keyboard.bottom))
            insets
        }

        installWidgetBridge()
        setContentView(webView)
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (!webViewDestroyed && webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            },
        )

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(urlForIntent(intent))
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        webView.loadUrl(urlForIntent(intent))
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (!webViewDestroyed) webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            if (!webViewDestroyed && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                WebViewCompat.removeWebMessageListener(webView, WIDGET_BRIDGE_NAME)
            }
            if (!webViewDestroyed) webView.destroy()
        }
        super.onDestroy()
    }

    private fun installWidgetBridge() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return

        WebViewCompat.addWebMessageListener(
            webView,
            WIDGET_BRIDGE_NAME,
            setOf(APP_ORIGIN),
        ) { sourceView, message, sourceOrigin, isMainFrame, _ ->
            if (!isMainFrame || sourceOrigin.toString() != APP_ORIGIN) return@addWebMessageListener
            val sourcePage = sourceView.url?.toUri() ?: return@addWebMessageListener
            if (!isAllowedAppUrl(sourcePage) || sourcePage.path != "/") return@addWebMessageListener
            val data = message.data ?: return@addWebMessageListener
            if (WidgetStore.saveSnapshot(applicationContext, data)) {
                OneBallWidgetProvider.updateAll(applicationContext)
            }
        }
    }

    private fun urlForIntent(intent: Intent): String {
        val requestedTab = intent.getStringExtra(EXTRA_TAB)
            ?.takeIf { it == "board" || it == "countdowns" }
        val countdownId = intent.getStringExtra(EXTRA_COUNTDOWN_ID)
            ?.take(80)
            ?.takeIf { requestedTab == "countdowns" }

        return APP_URL.toUri().buildUpon().apply {
            requestedTab?.let { appendQueryParameter("tab", it) }
            countdownId?.let { appendQueryParameter("countdown", it) }
        }.build().toString()
    }

    @SuppressLint("MissingOnRenderProcessGone")
    private inner class OneBallWebViewClient : WebViewClientCompat() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
            openExternallyUnlessAllowed(request.url)

        @Deprecated("Used for old WebView callbacks")
        override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean =
            openExternallyUnlessAllowed(url.toUri())

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            Toast.makeText(
                this@MainActivity,
                "One Ball needs a quick reload.",
                Toast.LENGTH_SHORT,
            ).show()
            view.destroy()
            webViewDestroyed = true
            recreate()
            return true
        }
    }

    private fun openExternallyUnlessAllowed(uri: Uri): Boolean {
        if (isAllowedAppUrl(uri)) return false
        if (uri.scheme == "http" || uri.scheme == "https") {
            runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        }
        return true
    }

    private fun isAllowedAppUrl(uri: Uri): Boolean =
        uri.scheme == "https" && uri.host == APP_HOST && (uri.port == -1 || uri.port == 443)

    companion object {
        const val APP_HOST = "one-ball-at-a-time.onrender.com"
        const val APP_ORIGIN = "https://$APP_HOST"
        const val APP_URL = "$APP_ORIGIN/"
        const val WIDGET_BRIDGE_NAME = "oneBallWidget"
        const val EXTRA_TAB = "one_ball_target_tab"
        const val EXTRA_COUNTDOWN_ID = "one_ball_countdown_id"
    }
}
