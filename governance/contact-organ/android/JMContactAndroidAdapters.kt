package jm.contact

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import java.io.File

class JMContactSharedPreferencesStore(
    context: Context,
    private val key: String
) : JMContactStore {
    private val prefs = context.getSharedPreferences("jm.estate.contact.organ.v1", Context.MODE_PRIVATE)
    private fun k(name: String) = "$key.$name"

    override fun load(): JMContactState? {
        if (!prefs.contains(k("bootId"))) return null
        return JMContactState(
            priorBootId = prefs.getString(k("priorBootId"), null),
            priorBootAt = prefs.getString(k("priorBootAt"), null),
            bootId = prefs.getString(k("bootId"), null) ?: return null,
            bootAt = prefs.getString(k("bootAt"), null) ?: JMContactCore.nowIso(),
            ready = prefs.getBoolean(k("ready"), false),
            active = false,
            revoked = prefs.getBoolean(k("revoked"), false),
            blocked = prefs.getBoolean(k("blocked"), false),
            consequenceEarned = prefs.getBoolean(k("consequenceEarned"), false),
            seq = prefs.getLong(k("seq"), 0L),
            chainHead = prefs.getString(k("chainHead"), null) ?: "0".repeat(64),
            events = mutableListOf()
        )
    }

    override fun save(state: JMContactState) {
        prefs.edit()
            .putString(k("priorBootId"), state.priorBootId)
            .putString(k("priorBootAt"), state.priorBootAt)
            .putString(k("bootId"), state.bootId)
            .putString(k("bootAt"), state.bootAt)
            .putString(k("chainHead"), state.chainHead)
            .putLong(k("seq"), state.seq)
            .putBoolean(k("ready"), state.ready)
            .putBoolean(k("revoked"), state.revoked)
            .putBoolean(k("blocked"), state.blocked)
            .putBoolean(k("consequenceEarned"), state.consequenceEarned)
            .apply()
    }

    override fun clear() {
        prefs.edit()
            .remove(k("priorBootId")).remove(k("priorBootAt"))
            .remove(k("bootId")).remove(k("bootAt")).remove(k("chainHead")).remove(k("seq"))
            .remove(k("ready")).remove(k("revoked")).remove(k("blocked")).remove(k("consequenceEarned"))
            .apply()
    }
}

class JMContactWebViewBridge(
    private val context: Context,
    private val exportDirectory: File = context.filesDir
) {
    @JavascriptInterface
    fun exportContactReceipt(json: String, filename: String): String {
        val safe = filename.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val out = File(exportDirectory, safe.ifBlank { "JM_CONTACT_RECEIPT.json" })
        out.writeText(json, Charsets.UTF_8)
        return out.absolutePath
    }

    companion object {
        fun mount(webView: WebView, bridge: JMContactWebViewBridge) {
            webView.addJavascriptInterface(bridge, "JMAndroid")
        }
    }
}

/*
Carrier adaptation:
browser localStorage -> SharedPreferences / DataStore / Room
browser download -> SAF / ContentResolver / Intent / native share/export
browser WebRTC -> native WebRTC / WebView WebRTC / local network / service
durable credentials -> Android Keystore-backed storage as required
*/