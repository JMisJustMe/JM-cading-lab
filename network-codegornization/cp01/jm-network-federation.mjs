/**
 * JM NETWORK CODEGORNIZATION CP01
 * Actual native donor executions are imported, not emulated by name.
 * Boundary: sandbox local queue; NO SMTP, DNS, cloud transport or owner-device claim.
 * Any supplied role/validated flags are fixture data, NOT authentication.
 */
import { FlowTalk, JMLogic, JM32 } from '../../coding-estate/sovereign-ten/direct/language-native.mjs';
import { RouteScript, RouteVM, RouteOS, TraceBoxRuntime, Dings } from '../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';
import { digest } from '../../coding-estate/sovereign-ten/direct/native-core.mjs';
import { CombiBind, ChoiceBox } from '../../coding-estate/sovereign-batch-six/direct/runtime-composition-native.mjs';

const CHOICE = `choicebox NetworkChannel {
  prompt = "Select network corridor"
  choices = [mail,device,storage]
  default = mail
  state_path = network.channel
}`;
const FLOW = `context { channel = "local" }
utterance "queue a governed contact"
as intent transfer()
respond {
  emit ContactRequested
  route NetworkRoute
}`;
const LOGIC = `rule OwnerQueue {
  when intent.transfer and user.role == "owner" and network.valid == true
  then network.allowed = true
  recover {
    network.allowed = false
  }
}`;
const POLICY = `policy NetworkPolicy {
  clause OwnerAllow {
    when network.allowed == true
    oblige network.authorized = true
  }
  clause NotAllowed {
    when network.allowed != true
    sanction network.authorized = false
  }
}`;
const ROUTE = `route NetworkRoute {
  start:
    branch network.authorized == true -> queue
    branch network.authorized != true -> denied
  queue:
    call queueDelivery()
    network.result = "queued"
    end
  denied:
    network.result = "denied"
    end
}`;
const BIND = `combine NativeRouteBind {
  left = FlowTalk
  right = RouteScript
  compatible = [route,trace]
  output = NetworkRoute
  rollback = DetachNativeRoute
}`;
const DING = `ding LocalQueueDing {
  claim = claim(action="queue", carrier="sandbox")
  proof = proof(policy="NetworkPolicy", route="NetworkRoute")
  signatures = ["local-test"]
  traces = ["T1"]
  evidence = ["queue-local"]
}`;

const graph = RouteScript.lower(RouteScript.parse(ROUTE)).graphs[0];
const bytecode = RouteVM.compile(graph);
const bindLeft = Object.freeze({ identity:'FlowTalk', caps:{route:true, trace:true} });
const bindRight = Object.freeze({ identity:'RouteScript', caps:{route:true, trace:true} });
const FIXTURE_ROLES = new Set(['owner','guest']);
const CORRIDORS = new Set(['mail','device','storage']);

export const originalNativeBodies = Object.freeze([
  'FlowTalk','JMLogic','JM32-1DA','RouteScript','RouteVM','RouteOS',
  'TraceBox','Dings','CombiBind','Choice Box'
]);

export function validateEnvelope(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) throw new TypeError('ENVELOPE_REQUIRED');
  if (!CORRIDORS.has(e.channel)) throw new TypeError('UNKNOWN_CORRIDOR');
  if (typeof e.id !== 'string' || !/^[A-Za-z0-9_-]{3,64}$/.test(e.id)) throw new TypeError('INVALID_ID');
  if (typeof e.message !== 'string' || !e.message.trim() || e.message.length > 2048) throw new TypeError('INVALID_MESSAGE');
  if (!FIXTURE_ROLES.has(e.role)) throw new TypeError('INVALID_ROLE_FIXTURE');
  if (typeof e.validated !== 'boolean') throw new TypeError('VALIDATION_FIXTURE_REQUIRED');
  return {id:e.id,channel:e.channel,message:e.message,role:e.role,validated:e.validated};
}

export class JMNetworkFederation {
  constructor() {
    this.outbox=[];
    this.seen=new Set();
  }
  process(untrusted) {
    const e=validateEnvelope(untrusted);
    const choice=ChoiceBox.execute(CHOICE,e.channel,{network:{}});
    const flow=FlowTalk.execute(FLOW,{channel:e.channel});
    const binding=CombiBind.execute(BIND,bindLeft,bindRight);
    const state={
      intent:{[flow.resolution.intent.name]:true},
      user:{role:e.role},
      network:{
        id:e.id,channel:choice.state.network.channel,
        valid:e.validated && !this.seen.has(e.id),
        allowed:false,authorized:false,result:'pending',
        payload:e.message
      }
    };
    const logic=JMLogic.execute(LOGIC,state);
    const policy=JM32.execute(POLICY,logic.runtime.state);
    const os=new RouteOS();
    const services={
      queueDelivery:(_named,routeState)=>{
        if (routeState.network.authorized !== true) throw new Error('ROUTE_NOT_AUTHORIZED');
        if (this.seen.has(routeState.network.id)) throw new Error('REPLAY_DENIED');
        this.outbox.push({
          id:routeState.network.id,
          channel:routeState.network.channel,
          payload:routeState.network.payload,
          carrier:'local-memory-queue'
        });
        this.seen.add(routeState.network.id);
        return true;
      }
    };
    os.registerRoute(graph.routeName,bytecode,graph,services);
    const route=os.callService(graph.routeName,policy.runtime.state);
    const result=route.state.network.result;
    const traceId='network-'+e.id;
    const trace=new TraceBoxRuntime();
    trace.create(traceId);
    for (const [body,events] of [
      ['FlowTalk',flow.response.trace],
      ['JMLogic',logic.runtime.trace],
      ['JM32-1DA',policy.runtime.trace],
      ['RouteOS',route.execution.trace],
    ]) {
      for (const ev of events) trace.append(traceId,{
        type:ev.type,body,proofDigest:ev.digest,
        // No raw mailbox contents or credentials are written into the trace.
      });
    }
    const traceCount=trace.replay(traceId).length;
    const queueDing=result==='queued' ? Dings.execute(DING).runtime[0] : null;
    if(queueDing) Dings.verify(queueDing);
    return {
      schema:'JM.NetworkContact/0.1',
      id:e.id,channel:e.channel,result,
      queueLength:this.outbox.length,deliveryScope:'SANDBOX_LOCAL_MEMORY_ONLY',
      bodyProof:{
        FlowTalk:flow.response.receipt.resultDigest,
        JMLogic:logic.runtime.receipt.resultDigest,
        'JM32-1DA':policy.runtime.receipt.resultDigest,
        RouteScript:graph.entry,
        RouteVM:bytecode.header.checksum,
        RouteOS:route.traceId,
        TraceBox:traceCount,
        Dings:queueDing?.dingDigest??null,
        CombiBind:binding.receipt.resultDigest,
        ChoiceBox:choice.receipt.resultDigest
      },
      traceDigest:digest(trace.replay(traceId).map(x=>({type:x.type,body:x.body,proofDigest:x.proofDigest}))),
      messageDigest:digest(e.message),
      boundary:'Fixture role and validation flags are not authentication. No real remote or SMTP delivery.'
    };
  }
  snapshot() {
    return structuredClone({outbox:this.outbox,seen:[...this.seen]});
  }
}
