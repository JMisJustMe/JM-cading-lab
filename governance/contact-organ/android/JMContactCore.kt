package jm.contact
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

data class JMContactConfig(val recipientId:String,val bodyId:String,val bodyVersion:String,val consequence:String,
 val inheritance:String="COMMON_CONTACT_ORGANS",val authorizationModel:String="NONE",val remoteAuthority:Boolean=false,
 val claimBoundary:String="Only directly observed consequences earn a Ding. No device, network, filesystem or remote result is synthesized.")
data class JMContactEvent(val seq:Long,val at:String,val bootId:String,val kind:String,val earned:Boolean,val detailJson:String,val previousHash:String,val hash:String)
data class JMContactState(var priorBootId:String?=null,var priorBootAt:String?=null,var bootId:String=UUID.randomUUID().toString(),var bootAt:String=JMContactCore.nowIso(),
 var ready:Boolean=false,var active:Boolean=false,var revoked:Boolean=false,var blocked:Boolean=false,var consequenceEarned:Boolean=false,var seq:Long=0L,
 var chainHead:String="0".repeat(64),val events:MutableList<JMContactEvent> = mutableListOf())
interface JMContactStore{fun load():JMContactState?;fun save(state:JMContactState);fun clear()}
class JMContactMemoryStore:JMContactStore{private var v:JMContactState?=null;override fun load()=v;override fun save(state:JMContactState){v=state};override fun clear(){v=null}}

class JMContactCore(val config:JMContactConfig,private val store:JMContactStore=JMContactMemoryStore()){
 companion object{
  const val OWNER_LAW="OWNER USES; THE BODY PROVES.";const val CLAIM_LAW="NO DING, NO CLAIM."
  const val RUNTIME="SOURCE→SIGNAL→CONTACT_FIELD→ROUTE_PRESSURE→STATE_CHANGE→DING→TRACE→RECOVERY→OUTPUT"
  fun nowIso():String{val f=SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",Locale.US);f.timeZone=TimeZone.getTimeZone("UTC");return f.format(Date())}
  fun sha256(s:String)=MessageDigest.getInstance("SHA-256").digest(s.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
  fun q(s:String)="\""+s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n")+"\""
 }
 val state:JMContactState
 init{val old=store.load();state=old?:JMContactState();if(old!=null){state.priorBootId=state.bootId;state.priorBootAt=state.bootAt;state.bootId=UUID.randomUUID().toString();state.bootAt=nowIso()};store.save(state);trace("TRACE.BOOT","""{"ownerLaw":${q(OWNER_LAW)},"claimLaw":${q(CLAIM_LAW)}}""")}
 @Synchronized fun trace(kind:String,detailJson:String="{}"):JMContactEvent{val seq=++state.seq;val at=nowIso();val prev=state.chainHead;val core="""{"seq":$seq,"at":${q(at)},"bootId":${q(state.bootId)},"kind":${q(kind)},"earned":false,"detail":$detailJson,"previousHash":${q(prev)}}""";val hash=sha256("$prev\n$core");val e=JMContactEvent(seq,at,state.bootId,kind,false,detailJson,prev,hash);state.chainHead=hash;state.events.add(0,e);while(state.events.size>500)state.events.removeAt(state.events.lastIndex);store.save(state);return e}
 @Synchronized private fun earned(kind:String,detailJson:String):JMContactEvent{val seq=++state.seq;val at=nowIso();val prev=state.chainHead;val core="""{"seq":$seq,"at":${q(at)},"bootId":${q(state.bootId)},"kind":${q(kind)},"earned":true,"detail":$detailJson,"previousHash":${q(prev)}}""";val hash=sha256("$prev\n$core");val e=JMContactEvent(seq,at,state.bootId,kind,true,detailJson,prev,hash);state.chainHead=hash;state.events.add(0,e);while(state.events.size>500)state.events.removeAt(state.events.lastIndex);store.save(state);return e}
 fun ready(detailJson:String="{}"){check(!state.revoked&&!state.blocked){"revoked/blocked"};state.ready=true;store.save(state);trace("TRACE.READY",detailJson)}
 fun begin(action:String=config.consequence,detailJson:String="{}"){check(state.ready){"READINESS GATE"};check(!state.revoked&&!state.blocked){"FAIL CLOSED"};state.active=true;store.save(state);trace("TRACE.CONTACT_BEGIN","""{"action":${q(action)},"detail":$detailJson}""")}
 fun ding(kind:String="DING.CONSEQUENCE",observed:Boolean,detailJson:String="{}"):JMContactEvent{check(state.active){"NO DING: no active contact"};check(observed){"NO DING: observed=true required"};check(!state.revoked&&!state.blocked){"NO DING: revoked/blocked"};val e=earned(if(kind.startsWith("DING."))kind else "DING.$kind",detailJson);state.consequenceEarned=true;store.save(state);return e}
 fun fail(error:String,detailJson:String="{}"){state.active=false;store.save(state);trace("TRACE.FAIL","""{"error":${q(error)},"detail":$detailJson}""")}
 fun recover(observed:Boolean,detailJson:String="{}"):JMContactEvent{check(observed);val e=earned("DING.RECOVER",detailJson);state.ready=true;state.active=false;store.save(state);return e}
 private fun authEnabled()=config.remoteAuthority||config.authorizationModel.uppercase()!="NONE"
 fun revoke(observed:Boolean,detailJson:String="{}"):JMContactEvent{check(authEnabled()){"REVOKE not semantically enabled"};check(observed);state.revoked=true;state.active=false;store.save(state);return earned("DING.REVOKE",detailJson)}
 fun block(observed:Boolean,detailJson:String="{}"):JMContactEvent{check(authEnabled()){"BLOCK not semantically enabled"};check(state.revoked);check(observed);state.blocked=true;state.active=false;store.save(state);return earned("DING.BLOCK",detailJson)}
 fun reset(explicit:Boolean){check(explicit);store.clear()}
 fun receiptJson():String{val ev=state.events.joinToString(","){"""{"seq":${it.seq},"at":${q(it.at)},"bootId":${q(it.bootId)},"kind":${q(it.kind)},"earned":${it.earned},"detail":${it.detailJson},"previousHash":${q(it.previousHash)},"hash":${q(it.hash)}}"""};return """{"schema":"jm.estate.contact-organ-receipt/1.0","exportedAt":${q(nowIso())},"ownerLaw":${q(OWNER_LAW)},"claimLaw":${q(CLAIM_LAW)},"runtime":${q(RUNTIME)},"recipientId":${q(config.recipientId)},"bodyId":${q(config.bodyId)},"declaredConsequence":${q(config.consequence)},"claimEarned":${state.consequenceEarned},"claimBoundary":${q(config.claimBoundary)},"chainHead":${q(state.chainHead)},"events":[$ev]}"""}
}