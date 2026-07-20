using System;
using System.Collections.Generic;
using UnityEngine;

namespace JM.AdvancedGenerator
{
    [Serializable]
    public sealed class JMTraceEvent
    {
        public string atUtc = string.Empty;
        public string gameId = string.Empty;
        public string type = string.Empty;
        public string detail = string.Empty;
        public float value;
        public Vector2 vector;
    }

    [Serializable]
    internal sealed class JMTraceEnvelope
    {
        public string schema = "JM.Unity.TraceBox/0.1";
        public string exportedAtUtc = string.Empty;
        public List<JMTraceEvent> events = new List<JMTraceEvent>();
    }

    public sealed class JMTraceBox : MonoBehaviour
    {
        [SerializeField] private int maximumEvents = 512;
        [SerializeField] private List<JMTraceEvent> events = new List<JMTraceEvent>();

        public IReadOnlyList<JMTraceEvent> Events => events;

        public void Record(
            string gameId,
            string type,
            string detail = "",
            float value = 0f,
            Vector2 vector = default)
        {
            events.Add(new JMTraceEvent
            {
                atUtc = DateTime.UtcNow.ToString("O"),
                gameId = gameId ?? string.Empty,
                type = type ?? string.Empty,
                detail = detail ?? string.Empty,
                value = value,
                vector = vector
            });

            if (events.Count > Mathf.Max(1, maximumEvents))
            {
                events.RemoveAt(0);
            }
        }

        public string ExportJson(bool prettyPrint = true)
        {
            var envelope = new JMTraceEnvelope
            {
                exportedAtUtc = DateTime.UtcNow.ToString("O"),
                events = new List<JMTraceEvent>(events)
            };

            return JsonUtility.ToJson(envelope, prettyPrint);
        }

        public void Clear()
        {
            events.Clear();
        }
    }
}
