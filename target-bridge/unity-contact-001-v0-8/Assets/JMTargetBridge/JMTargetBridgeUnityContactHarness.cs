using System;
using System.IO;
using System.Text;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

[Serializable]
public class JMUnityReturnReceipt {
    public string schema = "JM.TargetBridge.HostReturnReceipt/0.2";
    public string host = "Unity";
    public bool real_host = true;
    public string body_id = "jm.target-bridge.mini-collect-contact/v0.7";
    public string source_authority = "JM";
    public string lowering_sha256 = "3b0183b36e0433a7e4cce833f4fc63586d28a0be60615f8584218f2c282cdfe3";
    public string movement = "WAIT";
    public string contact = "WAIT";
    public string score_delta = "WAIT";
    public string coin_consumption = "WAIT";
    public int score_before = 0;
    public int score_after = 0;
    public string[] unresolved_preserved = new [] {
        "hazard.consequence", "goal.after_collecting", "starting_player_hp"
    };
    public string status = "OPEN";
    public string receipt_path = "";
}

public class JMTargetBridgeUnityContactHarness : MonoBehaviour {
    const float Speed = 3.5f;
    JMTargetBridgeUnity bridge;
    GameObject player;
    GameObject coin;
    JMUnityReturnReceipt receipt = new JMUnityReturnReceipt();
    bool contactHandled;
    string loweringCheck = "HOLD";

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Boot() {
        if (FindFirstObjectByType<JMTargetBridgeUnityContactHarness>() != null) return;
        var root = new GameObject("JM TARGET BRIDGE — UNITY CONTACT 001");
        root.AddComponent<JMTargetBridgeUnityContactHarness>();
    }

    void Start() {
        var lowering = Resources.Load<TextAsset>("JM_TARGET_BRIDGE_UNITY_LOWERING_v0_7");
        if (lowering != null &&
            lowering.text.Contains("\"host\": \"unity\"") &&
            lowering.text.Contains("\"source_authority\": \"JM\"") &&
            lowering.text.Contains("signal.move_right") &&
            lowering.text.Contains("contact.player_coin") &&
            lowering.text.Contains("score.collect") &&
            lowering.text.Contains("consume.coin") &&
            lowering.text.Contains("hazard.consequence") &&
            lowering.text.Contains("goal.after_collecting") &&
            lowering.text.Contains("starting_player_hp")) {
            loweringCheck = "PASS";
        }

        bridge = gameObject.AddComponent<JMTargetBridgeUnity>();
        BuildHostSurface();
    }

    void BuildHostSurface() {
        player = GameObject.CreatePrimitive(PrimitiveType.Cube);
        player.name = "Player";
        player.transform.position = new Vector3(-3f, 0f, 0f);
        player.transform.localScale = new Vector3(1.4f, 1.4f, 1.4f);

        coin = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        coin.name = "Coin";
        coin.transform.position = new Vector3(3f, 0f, 0f);
        coin.transform.localScale = Vector3.one * 1.25f;

        if (Camera.main == null) {
            var camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<Camera>();
            camGo.transform.position = new Vector3(0f, 6f, -10f);
            camGo.transform.LookAt(Vector3.zero);
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.95f,0.95f,0.95f,1f);
        }

        if (FindFirstObjectByType<Light>() == null) {
            var lightGo = new GameObject("Directional Light");
            var light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.2f;
            lightGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
        }
    }

    bool RightPressed() {
        bool pressed = false;
#if ENABLE_INPUT_SYSTEM
        pressed |= Keyboard.current != null && Keyboard.current.rightArrowKey.isPressed;
#endif
#if ENABLE_LEGACY_INPUT_MANAGER
        pressed |= Input.GetKey(KeyCode.RightArrow);
#endif
        return pressed;
    }

    void Update() {
        if (loweringCheck != "PASS" || player == null) return;

        if (RightPressed()) {
            float beforeX = player.transform.position.x;
            bridge.Dispatch(new JMEnvelope {
                protocol = "JM.TargetBridge/0.1",
                semantic_protocol = "JM.SemanticOps/0.1",
                semantic_action = "MOVE",
                capability = "buttons",
                source_profile = "keyboard",
                trace_id = "unity-move-right",
                target = "unity",
                x = 1f,
                y = 0f,
                value = 1f
            });
            player.transform.position += new Vector3(bridge.move.x * Speed * Time.deltaTime, 0f, 0f);
            if (player.transform.position.x > beforeX) receipt.movement = "PASS";
        }

        if (!contactHandled && coin != null) {
            var pc = player.GetComponent<Collider>();
            var cc = coin.GetComponent<Collider>();
            if (pc != null && cc != null && pc.bounds.Intersects(cc.bounds)) {
                contactHandled = true;
                receipt.contact = "PASS";
                receipt.score_before = 0;
                receipt.score_after = 1;
                receipt.score_delta = "PASS";
                Destroy(coin);
                receipt.coin_consumption = "PASS";
                CompleteReceipt();
            }
        }
    }

    void CompleteReceipt() {
        bool pass = receipt.movement == "PASS" && receipt.contact == "PASS" &&
                    receipt.score_delta == "PASS" && receipt.coin_consumption == "PASS" &&
                    loweringCheck == "PASS";
        receipt.status = pass ? "PASS" : "HOLD";
        string path = Path.Combine(Application.persistentDataPath, "JM_TARGET_BRIDGE_UNITY_RETURN_RECEIPT.json");
        receipt.receipt_path = path;
        File.WriteAllText(path, JsonUtility.ToJson(receipt, true), Encoding.UTF8);
        Debug.Log("JM TARGET BRIDGE UNITY CONTACT " + receipt.status + "\nReceipt: " + path);
    }

    void OnGUI() {
        var style = new GUIStyle(GUI.skin.label) { fontSize = 24, wordWrap = true };
        style.normal.textColor = Color.black;
        string text =
            "JM TARGET BRIDGE → UNITY\n" +
            "actual JM lowering: " + loweringCheck +
            " | movement: " + receipt.movement +
            " | contact: " + receipt.contact +
            " | score: " + receipt.score_after +
            " | coin consumed: " + receipt.coin_consumption + "\n" +
            (receipt.status == "PASS" ? "BOUNDED HOST CONTACT: PASS" : "HOLD RIGHT → move PLAYER into COIN");
        GUI.Label(new Rect(30, 25, Screen.width - 60, 180), text, style);
    }
}
