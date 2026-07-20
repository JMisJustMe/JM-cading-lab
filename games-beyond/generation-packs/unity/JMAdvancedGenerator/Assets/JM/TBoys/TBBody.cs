using UnityEngine;

namespace JM.AdvancedGenerator.TBoys
{
    public sealed class TBBody : MonoBehaviour
    {
        [SerializeField] private string characterId = string.Empty;
        [SerializeField] private string teamId = string.Empty;
        [SerializeField] private string movementWord = string.Empty;

        private TBProofRuntime runtime;
        private Rigidbody body;
        private Vector3 homePosition;
        private Vector3 baseScale;
        private float curveUntil;
        private bool selected;

        public string CharacterId => characterId;
        public string TeamId => teamId;
        public string MovementWord => movementWord;
        public Rigidbody Rigidbody => body;
        public bool IsSettled => body == null || body.linearVelocity.sqrMagnitude < 0.075f;

        public void Initialize(
            TBProofRuntime owner,
            string id,
            string team,
            string word,
            Vector3 startPosition,
            float mass,
            float damping)
        {
            runtime = owner;
            characterId = id ?? string.Empty;
            teamId = team ?? string.Empty;
            movementWord = word ?? string.Empty;
            homePosition = startPosition;
            baseScale = transform.localScale;
            body = GetComponent<Rigidbody>();

            if (body != null)
            {
                body.mass = Mathf.Max(0.1f, mass);
                body.linearDamping = Mathf.Max(0f, damping);
                body.angularDamping = 2.2f;
                body.useGravity = false;
                body.constraints = RigidbodyConstraints.FreezePositionY
                    | RigidbodyConstraints.FreezeRotationX
                    | RigidbodyConstraints.FreezeRotationZ;
            }
        }

        public void SetSelected(bool value)
        {
            selected = value;
            transform.localScale = baseScale * (selected ? 1.16f : 1f);
        }

        public void Launch(Vector3 velocity, bool powered)
        {
            if (body == null)
            {
                return;
            }

            float multiplier = powered ? 1.48f : 1f;
            body.linearVelocity = velocity * multiplier;
            body.angularVelocity = Vector3.up * Mathf.Clamp(body.linearVelocity.magnitude, 0f, 14f);

            if (movementWord == "CURVE" || movementWord == "TRICK")
            {
                curveUntil = Time.time + (powered ? 1.65f : 1.15f);
            }
        }

        public void ResetToHome()
        {
            transform.position = homePosition;
            transform.rotation = Quaternion.identity;
            if (body != null)
            {
                body.linearVelocity = Vector3.zero;
                body.angularVelocity = Vector3.zero;
            }
        }

        private void FixedUpdate()
        {
            if (body == null)
            {
                return;
            }

            if (Time.time < curveUntil && body.linearVelocity.sqrMagnitude > 0.3f)
            {
                Vector3 lateral = Vector3.Cross(Vector3.up, body.linearVelocity.normalized);
                float strength = movementWord == "TRICK" ? -5.2f : 4.1f;
                body.AddForce(lateral * strength, ForceMode.Acceleration);
            }

            if (movementWord == "BRACE" || movementWord == "BLOCK")
            {
                if (body.linearVelocity.sqrMagnitude < 1.1f)
                {
                    body.linearVelocity *= 0.92f;
                }
            }
        }

        private void OnCollisionEnter(Collision collision)
        {
            if (body == null || collision.contactCount == 0)
            {
                return;
            }

            if (collision.collider.CompareTag("Respawn"))
            {
                Vector3 incoming = body.linearVelocity;
                Vector3 normal = collision.GetContact(0).normal;
                float multiplier = movementWord == "BOUNCE" ? 1.12f : 0.88f;
                body.linearVelocity = Vector3.Reflect(incoming, normal) * multiplier;
                runtime?.RegisterArenaContact(this, "BUMPER", incoming.magnitude);
                return;
            }

            TBBody other = collision.collider.GetComponentInParent<TBBody>();
            if (other != null && other != this)
            {
                float force = collision.relativeVelocity.magnitude * body.mass;
                runtime?.RegisterBodyContact(this, other, force);
            }
        }
    }
}
