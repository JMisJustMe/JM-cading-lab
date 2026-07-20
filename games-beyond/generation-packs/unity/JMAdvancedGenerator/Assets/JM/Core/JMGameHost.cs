using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace JM.AdvancedGenerator
{
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
            return JsonUtility.ToJson(proof, prettyPrint);
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
