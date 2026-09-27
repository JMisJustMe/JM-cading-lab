using System;
using UnityEngine;
[Serializable] public class JMEnvelope {
 public string protocol, semantic_protocol, semantic_action, capability, source_profile, trace_id, target;
 public float x,y,value;
}
public class JMTargetBridgeUnity : MonoBehaviour {
 public Vector2 move; public float aim; public int shots; public bool paused; public string lastTrace;
 public void Dispatch(JMEnvelope e) {
  if(e==null || e.semantic_protocol!="JM.SemanticOps/0.1") throw new ArgumentException("semantic protocol HOLD");
  switch(e.semantic_action){
   case "MOVE": move=new Vector2(e.x,e.y); break;
   case "AIM": aim=e.value; break;
   case "FIRE": shots++; break;
   case "FEEDBACK": Handheld.Vibrate(); break;
   case "PAUSE": paused=!paused; break;
   default: throw new ArgumentException("unknown semantic action");
  }
  lastTrace=e.trace_id;
 }
}
