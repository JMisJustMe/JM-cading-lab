package jm.contact

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import java.util.UUID

interface JMCrossTransport { fun send(json: String) }

class JMCrossDeviceProtocol(
    private val organ: JMContactCore,
    private val transport: JMCrossTransport,
    private val secret: String
) {
    private var revoked = false
    private var seq = 0L

    private fun hmac(text: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(text.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
    }

    fun startPair(): String {
        organ.ready("""{"crossDevice":true,"stage":"pair"}""")
        organ.begin("PAIR")
        val c = UUID.randomUUID().toString()
        transport.send("""{"t":"PAIR_CHALLENGE","challenge":${JMContactCore.q(c)}}""")
        return c
    }

    fun makePairProof(challenge: String): String = hmac("PAIR|$challenge")

    fun verifyPairProof(challenge: String, proof: String): Boolean {
        val ok = proof == makePairProof(challenge)
        if (ok) organ.ding("DING.PAIR", true, """{"observed":true}""")
        else organ.fail("PAIR_PROOF_INVALID")
        return ok
    }

    fun signState(body: String): Pair<Long, String> {
        seq += 1
        return seq to hmac("STATE|$seq|$body")
    }

    fun verifyState(sequence: Long, body: String, signature: String): Boolean {
        val ok = signature == hmac("STATE|$sequence|$body")
        if (ok) organ.ding("DING.STATE_RECEIVED", true, """{"observed":true,"seq":$sequence}""")
        else organ.fail("STATE_SIGNATURE_INVALID", """{"seq":$sequence}""")
        return ok
    }

    fun makeAck(sequence: Long, stateSignature: String): String =
        hmac("ACK|$sequence|$stateSignature")

    fun verifyAck(sequence: Long, stateSignature: String, ack: String): Boolean {
        val ok = ack == makeAck(sequence, stateSignature)
        if (ok) organ.ding("DING.SIGNED_ACK", true, """{"observed":true,"seq":$sequence}""")
        else organ.fail("ACK_SIGNATURE_INVALID", """{"seq":$sequence}""")
        return ok
    }

    fun markRecovery(observed: Boolean = true) =
        organ.recover(observed, """{"observed":$observed}""")

    fun markRemoteRecovery(observed: Boolean = true) =
        organ.ding("DING.RECOVER_REMOTE", observed, """{"observed":$observed}""")

    fun markRevoked(side: String = "local") {
        revoked = true
        organ.revoke(true, """{"observed":true,"side":${JMContactCore.q(side)}}""")
    }

    fun markBlockedSend(side: String = "sender") {
        check(revoked) { "revoke must precede block" }
        organ.block(true, """{"observed":true,"side":${JMContactCore.q(side)}}""")
    }
}