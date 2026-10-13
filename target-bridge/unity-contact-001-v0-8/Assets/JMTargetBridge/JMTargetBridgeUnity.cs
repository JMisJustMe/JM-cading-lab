using System;
using UnityEngine;

[Serializable] public class JMEnvelope {
    public string protocol;
    public string semantic_protocol;
    public string semantic_action;
    public string capability;
    public string source_profile;
    public string trace_id;
    public string target;
    public float x;
    public float y;
    public float value;
}

public class JMTargetBridgeUnity : MonoBehaviour {
    public Vector2 move;
    public float aim;
    public int shots;
    public bool paused;
    public string lastTrace;

    public void DispatchJson(string json) {
        var e = JsonUtility.FromJson<JMEnvelope>(json);
        if (e == null || e.semantic_protocol != "JM.SemanticOps/0.1") throw new ArgumentException("semantic protocol HOLD");
        Dispatch(e);
    }
    public void Dispatch(JMEnvelope e) {
        switch(e.semantic_action) {
            case "MOVE": move = new Vector2(e.x,e.y); break;
            case "AIM": aim = e.value; break;
            case "FIRE": shots += 1; break;
            case "FEEDBACK": Handheld.Vibrate(); break;
            case "PAUSE": paused = !paused; break;
            default: throw new ArgumentException("unknown semantic action");
        }
        lastTrace=e.trace_id;
    }
}
