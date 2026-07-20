using UnityEngine;

namespace JM.AdvancedGenerator.TBoys
{
    public sealed class TBCoreTarget : MonoBehaviour
    {
        [SerializeField] private string teamId = string.Empty;
        [SerializeField] private float maximumHealth = 100f;
        [SerializeField] private float currentHealth = 100f;

        private TBProofRuntime runtime;
        private Vector3 baseScale;
        private Renderer bodyRenderer;
        private Color baseColor = Color.white;

        public string TeamId => teamId;
        public float CurrentHealth => currentHealth;
        public float Health01 => maximumHealth <= 0f ? 0f : currentHealth / maximumHealth;

        public void Initialize(TBProofRuntime owner, string team, float health)
        {
            runtime = owner;
            teamId = team ?? string.Empty;
            maximumHealth = Mathf.Max(1f, health);
            currentHealth = maximumHealth;
            baseScale = transform.localScale;
            bodyRenderer = GetComponent<Renderer>();
            if (bodyRenderer != null && bodyRenderer.sharedMaterial != null)
            {
                baseColor = bodyRenderer.sharedMaterial.HasProperty("_BaseColor")
                    ? bodyRenderer.sharedMaterial.GetColor("_BaseColor")
                    : bodyRenderer.sharedMaterial.color;
            }
        }

        public void ResetCore()
        {
            currentHealth = maximumHealth;
            transform.localScale = baseScale;
            ApplyColor(baseColor);
        }

        private void OnCollisionEnter(Collision collision)
        {
            TBBody attacker = collision.collider.GetComponentInParent<TBBody>();
            if (attacker == null || attacker.TeamId == teamId)
            {
                return;
            }

            float speed = attacker.Rigidbody != null ? attacker.Rigidbody.linearVelocity.magnitude : collision.relativeVelocity.magnitude;
            if (speed < 1.1f)
            {
                return;
            }

            float movementMultiplier = attacker.MovementWord == "DIRECT" || attacker.MovementWord == "STRIKE"
                ? 1.15f
                : attacker.MovementWord == "BRACE" || attacker.MovementWord == "BLOCK" ? 0.78f : 0.95f;
            float damage = Mathf.Clamp(speed * 5.4f * movementMultiplier, 6f, 34f);
            currentHealth = Mathf.Max(0f, currentHealth - damage);

            float health01 = Health01;
            transform.localScale = new Vector3(
                baseScale.x * (0.82f + health01 * 0.18f),
                baseScale.y * (0.35f + health01 * 0.65f),
                baseScale.z * (0.82f + health01 * 0.18f));
            ApplyColor(Color.Lerp(new Color(0.12f, 0.02f, 0.02f), baseColor, health01));

            runtime?.RegisterCoreDamage(this, attacker, damage);
        }

        private void ApplyColor(Color color)
        {
            if (bodyRenderer == null)
            {
                return;
            }

            Material material = bodyRenderer.material;
            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", color);
            }
            if (material.HasProperty("_Color"))
            {
                material.SetColor("_Color", color);
            }
        }
    }
}
