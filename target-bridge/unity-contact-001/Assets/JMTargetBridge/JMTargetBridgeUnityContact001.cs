using System;
using System.Collections.Generic;
using UnityEngine;

namespace JM.TargetBridge
{
    /// <summary>
    /// Bounded Unity host-contact specimen emitted from JM TARGET BRIDGE.
    /// Expected route:
    /// Right Arrow -> Player movement -> Player/Coin contact -> score 0->1 -> Coin consumed.
    ///
    /// This is a compatibility harness, not a Unity-authored game.
    /// Source authority remains JM.
    /// </summary>
    public sealed class JMTargetBridgeUnityContact001 : MonoBehaviour
    {
        private const string BodyId = "jm.target-bridge.mini-collect-contact/unity-v0.1";

        private static bool booted;

        private GameObject player;
        private GameObject coin;
        private Renderer playerRenderer;
        private Renderer coinRenderer;

        private int score;
        private bool completed;

        private readonly List<TraceEntry> trace = new List<TraceEntry>();

        private Receipt receipt;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Boot()
        {
            if (booted)
                return;

            booted = true;
            var root = new GameObject("JM TARGET BRIDGE — UNITY CONTACT 001");
            DontDestroyOnLoad(root);
            root.AddComponent<JMTargetBridgeUnityContact001>();
        }

        private void Start()
        {
            EnsureCamera();
            EnsureLight();

            player = GameObject.CreatePrimitive(PrimitiveType.Cube);
            player.name = "Player";
            player.transform.position = new Vector3(-4f, 0f, 0f);
            player.transform.localScale = new Vector3(1.6f, 1.2f, 1f);
            playerRenderer = player.GetComponent<Renderer>();

            coin = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            coin.name = "Coin";
            coin.transform.position = new Vector3(3f, 0f, 0f);
            coin.transform.localScale = Vector3.one * 1.1f;
            coinRenderer = coin.GetComponent<Renderer>();

            receipt = new Receipt
            {
                schema = "JM.TargetBridge.UnityReceipt/0.1",
                source_authority = "JM",
                host = "Unity",
                real_host = true,
                body_id = BodyId,
                unity_version = Application.unityVersion,
                observations = new Observations(),
                values = new Values { score_before = 0, score_after = 0 },
                unresolved_preserved = new[]
                {
                    "hazard.consequence",
                    "goal.after_collecting",
                    "starting_player_hp"
                }
            };

            Debug.Log("JM TARGET BRIDGE UNITY CONTACT 001 READY — hold Right Arrow.");
        }

        private void Update()
        {
            if (player == null)
                return;

            if (Input.GetKey(KeyCode.RightArrow))
            {
                float beforeX = player.transform.position.x;
                player.transform.position += Vector3.right * (3f * Time.deltaTime);
                float afterX = player.transform.position.x;

                if (afterX > beforeX)
                {
                    receipt.observations.movement = "PASS";
                    PushOnce("movement", "input=RightArrow; before_x=" + beforeX.ToString("F4") + "; after_x=" + afterX.ToString("F4"));
                }
            }

            if (!completed && coin != null && playerRenderer != null && coinRenderer != null &&
                playerRenderer.bounds.Intersects(coinRenderer.bounds))
            {
                receipt.observations.contact = "PASS";
                PushOnce("contact", "left=Player; right=Coin; contact_true=true");

                int scoreBefore = score;
                score = 1;
                receipt.values.score_before = scoreBefore;
                receipt.values.score_after = score;

                if (scoreBefore == 0 && score == 1)
                {
                    receipt.observations.score_delta = "PASS";
                    PushOnce("score_delta", "before=0; after=1");
                }

                Destroy(coin);
                coin = null;
                receipt.observations.coin_consumption = "PASS";
                PushOnce("coin_consumption", "before=true; after=false");

                CompleteIfReady();
            }
        }

        private void CompleteIfReady()
        {
            bool allPass =
                receipt.observations.movement == "PASS" &&
                receipt.observations.contact == "PASS" &&
                receipt.observations.score_delta == "PASS" &&
                receipt.observations.coin_consumption == "PASS";

            if (!allPass || completed)
                return;

            completed = true;
            receipt.completed = true;
            receipt.completed_at_realtime_seconds = Time.realtimeSinceStartup;
            receipt.trace = trace.ToArray();

            Debug.Log("JM TARGET BRIDGE UNITY CONTACT PASS\n" + JsonUtility.ToJson(receipt, true));
        }

        private void PushOnce(string type, string detail)
        {
            for (int i = 0; i < trace.Count; i++)
            {
                if (trace[i].type == type)
                    return;
            }

            trace.Add(new TraceEntry
            {
                seq = trace.Count + 1,
                type = type,
                detail = detail
            });
        }

        private static void EnsureCamera()
        {
            if (Camera.main != null)
                return;

            var cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 4.5f;
            cameraObject.transform.position = new Vector3(0f, 0f, -10f);
        }

        private static void EnsureLight()
        {
            if (UnityEngine.Object.FindObjectOfType<Light>() != null)
                return;

            var lightObject = new GameObject("Directional Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.1f;
            lightObject.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
        }

        private void OnGUI()
        {
            if (receipt == null)
                return;

            GUILayout.BeginArea(new Rect(20f, 20f, Mathf.Max(420f, Screen.width - 40f), 210f), GUI.skin.box);
            GUILayout.Label("JM TARGET BRIDGE → UNITY");
            GUILayout.Label(
                "movement: " + receipt.observations.movement +
                " | contact: " + receipt.observations.contact +
                " | score: " + score +
                " | coin consumed: " + receipt.observations.coin_consumption
            );

            if (completed)
                GUILayout.Label("BOUNDED HOST CONTACT: PASS");
            else
                GUILayout.Label("HOLD RIGHT ARROW → move PLAYER into COIN.");

            GUILayout.Label("Compatibility harness only. Source authority remains JM.");
            GUILayout.Label("HOLDs preserved: hazard consequence; goal-after-collecting predicate; starting Player HP.");
            GUILayout.EndArea();
        }

        [Serializable]
        private sealed class Receipt
        {
            public string schema;
            public string source_authority;
            public string host;
            public bool real_host;
            public string body_id;
            public string unity_version;
            public Observations observations;
            public Values values;
            public string[] unresolved_preserved;
            public bool completed;
            public float completed_at_realtime_seconds;
            public TraceEntry[] trace;
        }

        [Serializable]
        private sealed class Observations
        {
            public string movement = "WAIT";
            public string contact = "WAIT";
            public string score_delta = "WAIT";
            public string coin_consumption = "WAIT";
        }

        [Serializable]
        private sealed class Values
        {
            public int score_before;
            public int score_after;
        }

        [Serializable]
        private sealed class TraceEntry
        {
            public int seq;
            public string type;
            public string detail;
        }
    }
}
