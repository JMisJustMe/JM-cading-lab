using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace JM.AdvancedGenerator
{
    [Serializable]
    internal sealed class JMProofEnvelope
    {
        public string schema = "JM.Unity.GameProof/0.1";
        public string exportedAtUtc = string.Empty;
        public JMProofSnapshot proof = new JMProofSnapshot();
        public List<JMTraceEvent> trace = new List<JMTraceEvent>();
    }

    public sealed class JMGameHost : MonoBehaviour
    {
        [Tooltip("A MonoBehaviour that implements IJMGameAdapter.")]
        [SerializeField] private MonoBehaviour adapterBehaviour;
        [SerializeField] private JMTraceBox traceBox;

        private IJMGameAdapter adapter;
        private int intentCount;

        public JMTraceBox TraceBox => traceBox;
        public int IntentCount => intentCount;
        public string GameId => adapter?.GameId ?? "UNMOUNTED";

        private void Awake()
        {
            traceBox ??= GetComponent<JMTraceBox>();
            traceBox ??= gameObject.AddComponent<JMTraceBox>();

            if (GetComponent<JMProofPanel>() == null)
            {
                gameObject.AddComponent<JMProofPanel>();
            }

            adapterBehaviour ??= FindAdapterBehaviour();
            adapter = adapterBehaviour as IJMGameAdapter;

            if (adapter == null)
            {
                Debug.LogError("JMGameHost requires a MonoBehaviour implementing IJMGameAdapter.", this);
                enabled = false;
                return;
            }

            adapter.Initialize(this);
            traceBox.Record(GameId, "host.boot", SceneManager.GetActiveScene().name);
            Debug.Log($"JM HOST DING · {GameId} · {SceneManager.GetActiveScene().name}", this);
        }

        private void Update()
        {
            adapter?.Tick(Time.deltaTime);
        }

        public void SubmitIntent(JMGameIntent intent)
        {
            if (adapter == null)
            {
                return;
            }

            intentCount++;
            traceBox.Record(GameId, "intent." + intent.type, intent.source, intent.value, intent.vector);
            adapter.HandleIntent(intent);
        }

        public string ExportProofJson(bool prettyPrint = true)
        {
            if (adapter == null)
            {
                return "{}";
            }

            JMProofSnapshot proof = adapter.CaptureProof();
            proof.intentCount = intentCount;
            proof.scene = SceneManager.GetActiveScene().name;
            proof.createdAtUtc = DateTime.UtcNow.ToString("O");
            traceBox.Record(GameId, "proof.export", proof.status + " · " + proof.summary);

            var envelope = new JMProofEnvelope
            {
                exportedAtUtc = DateTime.UtcNow.ToString("O"),
                proof = proof,
                trace = new List<JMTraceEvent>(traceBox.Events)
            };
            return JsonUtility.ToJson(envelope, prettyPrint);
        }

        public void AssignAdapter(MonoBehaviour behaviour)
        {
            adapterBehaviour = behaviour;
        }

        private MonoBehaviour FindAdapterBehaviour()
        {
            MonoBehaviour[] behaviours = GetComponents<MonoBehaviour>();
            foreach (MonoBehaviour behaviour in behaviours)
            {
                if (behaviour is IJMGameAdapter)
                {
                    return behaviour;
                }
            }

            return null;
        }
    }
}
