using System;
using System.IO;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

public class JMTargetBridgeUnityContactHarness : MonoBehaviour {
 const float Speed=3.5f;
 JMTargetBridgeUnity bridge; GameObject player,coin;
 string movement="WAIT",contact="WAIT",scoreDelta="WAIT",coinConsumption="WAIT",lowering="HOLD";
 int score=0; bool done=false;

 [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
 static void Boot(){ if(FindFirstObjectByType<JMTargetBridgeUnityContactHarness>()==null) new GameObject("JM TARGET BRIDGE — UNITY CONTACT 001").AddComponent<JMTargetBridgeUnityContactHarness>(); }

 void Start(){
  var l=Resources.Load<TextAsset>("JM_TARGET_BRIDGE_UNITY_LOWERING_v0_7");
  if(l!=null && l.text.Contains("\"host\":\"unity\"") && l.text.Contains("\"source_authority\":\"JM\"") && l.text.Contains("contact.player_coin")) lowering="PASS";
  bridge=gameObject.AddComponent<JMTargetBridgeUnity>();
  player=GameObject.CreatePrimitive(PrimitiveType.Cube); player.name="Player"; player.transform.position=new Vector3(-3,0,0);
  coin=GameObject.CreatePrimitive(PrimitiveType.Sphere); coin.name="Coin"; coin.transform.position=new Vector3(3,0,0);
  if(Camera.main==null){var g=new GameObject("Main Camera");g.tag="MainCamera";var c=g.AddComponent<Camera>();g.transform.position=new Vector3(0,6,-10);g.transform.LookAt(Vector3.zero);}
  if(FindFirstObjectByType<Light>()==null){var g=new GameObject("Directional Light");var lgt=g.AddComponent<Light>();lgt.type=LightType.Directional;g.transform.rotation=Quaternion.Euler(50,-30,0);}
 }
 bool Right(){
  bool p=false;
#if ENABLE_INPUT_SYSTEM
  p|=Keyboard.current!=null && Keyboard.current.rightArrowKey.isPressed;
#endif
#if ENABLE_LEGACY_INPUT_MANAGER
  p|=Input.GetKey(KeyCode.RightArrow);
#endif
  return p;
 }
 void Update(){
  if(lowering!="PASS"||done)return;
  if(Right()){float b=player.transform.position.x;bridge.Dispatch(new JMEnvelope{protocol="JM.TargetBridge/0.1",semantic_protocol="JM.SemanticOps/0.1",semantic_action="MOVE",x=1,y=0,trace_id="unity-move-right"});player.transform.position+=new Vector3(bridge.move.x*Speed*Time.deltaTime,0,0);if(player.transform.position.x>b)movement="PASS";}
  if(player.GetComponent<Collider>().bounds.Intersects(coin.GetComponent<Collider>().bounds)){contact="PASS";score=1;scoreDelta="PASS";Destroy(coin);coinConsumption="PASS";done=movement=="PASS";if(done)Save();}
 }
 void Save(){var json="{\n  \"schema\":\"JM.TargetBridge.HostReturnReceipt/0.2\",\n  \"host\":\"Unity\",\n  \"real_host\":true,\n  \"source_authority\":\"JM\",\n  \"status\":\"PASS\"\n}";File.WriteAllText(Path.Combine(Application.persistentDataPath,"JM_TARGET_BRIDGE_UNITY_RETURN_RECEIPT.json"),json);}
 void OnGUI(){var s=new GUIStyle(GUI.skin.label){fontSize=24};s.normal.textColor=Color.black;GUI.Label(new Rect(30,25,Screen.width-60,180),"JM TARGET BRIDGE → UNITY\nactual JM lowering: "+lowering+" | movement: "+movement+" | contact: "+contact+" | score: "+score+" | coin consumed: "+coinConsumption+"\n"+(done?"BOUNDED HOST CONTACT: PASS":"HOLD RIGHT → move PLAYER into COIN"),s);}
}
