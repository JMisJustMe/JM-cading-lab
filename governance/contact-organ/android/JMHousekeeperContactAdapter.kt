package jm.contact

/**
 * JM Housekeeper Contact Organ adapter v1.2.2.
 *
 * This adapter transfers the common Contact Organ into the existing native
 * Housekeeper SAF carrier. It does NOT perform filesystem mutation itself.
 * AndroidHousekeeper/native SAF remains the carrier authority; this adapter
 * observes its results, enforces the Housekeeper proof law, and emits trace/
 * Ding receipts only after an explicitly observed consequence.
 *
 * FROZEN PARENT -> CLEAN DESCENDANT.
 * NO DING, NO CLAIM.
 */
class JMHousekeeperContactAdapter(
    store: JMContactStore = JMContactMemoryStore()
) {
    companion object {
        const val RECIPIENT_ID = "phone-housekeeper"
        const val BODY_ID = "ZIONFOLDER_ESTATE_HOUSEKEEPER_v1_1_2"
        const val BODY_VERSION = "1.1.2"
        const val CONSEQUENCE = "SAFE_SCAN_QUARANTINE_RESTORE_RECEIPT"
        const val TRANSACTION_LAW = "COPY -> SHA VERIFY -> REMOVE SOURCE"
        const val SOURCE_ZIP_SHA256 = "30c0a34e7010b31cbbb1027be6cdf2404e2b09cbb745f7169046622913b991a6"
        const val SOURCE_HTML_SHA256 = "4f166b2bf164d31be97c59260de7d2ece5230c58027a5490f4e1a21a1fb4783e"
        const val APK_SHA256 = "6444bc787d397ca31067883b36669e29a5e87a02f8c86c7616fcafa9f5891f54"

        private val MOVE_KINDS = setOf("QUARANTINE", "REHOUSE", "RESTORE")
        private val ALL_KINDS = MOVE_KINDS + "PURGE"
    }

    private val core = JMContactCore(
        JMContactConfig(
            recipientId = RECIPIENT_ID,
            bodyId = BODY_ID,
            bodyVersion = BODY_VERSION,
            consequence = CONSEQUENCE,
            inheritance = "COMMON_CONTACT_ORGANS",
            authorizationModel = "NONE",
            remoteAuthority = false,
            claimBoundary = "Native Android source/package integration only. Filesystem consequence must be observed from the existing AndroidHousekeeper SAF carrier; physical install/tree contact and owner Ding remain separately claim-gated."
        ),
        store
    )

    fun onTreeReady(treeName: String, observed: Boolean) {
        if (!observed) {
            core.trace(
                "TRACE.HOUSEKEEPER_TREE_NOT_OBSERVED",
                "{\"treeName\":${JMContactCore.q(treeName)}}"
            )
            return
        }
        core.ready(
            "{\"carrier\":\"AndroidHousekeeper/SAF\",\"treeName\":${JMContactCore.q(treeName)},\"transactionLaw\":${JMContactCore.q(TRANSACTION_LAW)}}"
        )
    }

    fun beginScan(treeName: String = "") {
        core.begin(
            "SAFE_SCAN",
            "{\"treeName\":${JMContactCore.q(treeName)},\"mutation\":false}"
        )
    }

    fun scanObserved(
        observed: Boolean,
        entryCount: Int,
        issueCount: Int = 0,
        detailJson: String = "{}"
    ): JMContactEvent? {
        if (!observed) {
            core.fail("HOUSEKEEPER_SCAN_NOT_OBSERVED", detailJson)
            return null
        }
        return core.ding(
            kind = "DING.HOUSEKEEPER_SCAN",
            observed = true,
            detailJson = "{\"entryCount\":$entryCount,\"issueCount\":$issueCount,\"nativeDetail\":$detailJson}"
        )
    }

    fun beginMutation(kind: String, relativePath: String) {
        val k = kind.uppercase()
        require(k in ALL_KINDS) { "Unsupported Housekeeper mutation: $kind" }
        core.begin(
            "HOUSEKEEPER_$k",
            "{\"kind\":${JMContactCore.q(k)},\"relativePath\":${JMContactCore.q(relativePath)},\"transactionLaw\":${JMContactCore.q(TRANSACTION_LAW)}}"
        )
    }

    /**
     * Called only after the existing native carrier returns its observed result.
     * QUARANTINE / REHOUSE / RESTORE must prove the whole transaction:
     * copy completed -> destination hash verified -> source removed after verify.
     * PURGE has no destination copy, but still requires path-safety + observed
     * native deletion. This class never calls ContentResolver/file mutation.
     */
    fun mutationObserved(
        kind: String,
        observed: Boolean,
        pathSafe: Boolean,
        copyCompleted: Boolean = false,
        shaVerified: Boolean = false,
        sourceRemovedAfterVerify: Boolean = false,
        detailJson: String = "{}"
    ): JMContactEvent? {
        val k = kind.uppercase()
        require(k in ALL_KINDS) { "Unsupported Housekeeper mutation: $kind" }

        if (!observed) {
            core.fail("HOUSEKEEPER_${k}_NOT_OBSERVED", detailJson)
            return null
        }
        if (!pathSafe) {
            core.fail("HOUSEKEEPER_${k}_PATH_SAFETY_FAILED", detailJson)
            return null
        }

        if (k in MOVE_KINDS) {
            if (!copyCompleted || !shaVerified || !sourceRemovedAfterVerify) {
                core.fail(
                    "HOUSEKEEPER_${k}_TRANSACTION_PROOF_INCOMPLETE",
                    "{\"copyCompleted\":$copyCompleted,\"shaVerified\":$shaVerified,\"sourceRemovedAfterVerify\":$sourceRemovedAfterVerify,\"law\":${JMContactCore.q(TRANSACTION_LAW)},\"nativeDetail\":$detailJson}"
                )
                return null
            }
        }

        return core.ding(
            kind = "DING.HOUSEKEEPER_$k",
            observed = true,
            detailJson = "{\"kind\":${JMContactCore.q(k)},\"pathSafe\":true,\"copyCompleted\":$copyCompleted,\"shaVerified\":$shaVerified,\"sourceRemovedAfterVerify\":$sourceRemovedAfterVerify,\"law\":${JMContactCore.q(TRANSACTION_LAW)},\"nativeDetail\":$detailJson}"
        )
    }

    fun recoveryObserved(observed: Boolean, detailJson: String = "{}"): JMContactEvent? {
        if (!observed) {
            core.trace("TRACE.HOUSEKEEPER_RECOVERY_NOT_OBSERVED", detailJson)
            return null
        }
        return core.recover(observed = true, detailJson = detailJson)
    }

    fun receiptJson(): String = core.receiptJson()
}
