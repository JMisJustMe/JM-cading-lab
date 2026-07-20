using System.Collections.Generic;
using UnityEngine;

namespace JM.AdvancedGenerator.TBoys
{
    public sealed class TBSlowHazard : MonoBehaviour
    {
        private readonly Dictionary<int, float> nextTraceAt = new Dictionary<int, float>();
        private TBProofRuntime runtime;
        private float velocityMultiplier = 0.94f;

        public void Initialize(TBProofRuntime owner, float multiplier)
        {
            runtime = owner;
            velocityMultiplier = Mathf.Clamp(multiplier, 0.70f, 0.995f);
        }

        private void OnTriggerStay(Collider other)
        {
            TBBody body = other.GetComponentInParent<TBBody>();
            if (body == null || body.Rigidbody == null)
            {
                return;
            }

            body.Rigidbody.linearVelocity *= velocityMultiplier;
            int id = body.GetInstanceID();
            if (!nextTraceAt.TryGetValue(id, out float nextAt) || Time.time >= nextAt)
            {
                nextTraceAt[id] = Time.time + 0.7f;
                runtime?.RegisterArenaContact(body, "HOLD_HAZARD", body.Rigidbody.linearVelocity.magnitude);
            }
        }
    }
}
