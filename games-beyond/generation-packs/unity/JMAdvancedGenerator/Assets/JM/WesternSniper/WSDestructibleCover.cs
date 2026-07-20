using UnityEngine;

namespace JM.AdvancedGenerator.WesternSniper
{
    public enum WSCoverMaterial
    {
        Timber,
        Stone,
        Metal
    }

    public sealed class WSDestructibleCover : MonoBehaviour
    {
        [SerializeField] private WSCoverMaterial materialKind;
        [SerializeField] private float maximumHealth = 100f;
        [SerializeField] private float currentHealth = 100f;

        private WSProofRuntime runtime;
        private Renderer bodyRenderer;
        private Collider bodyCollider;
        private Vector3 originalScale;
        private Color originalColor = Color.white;
        private bool broken;

        public WSCoverMaterial MaterialKind => materialKind;
        public float Health01 => maximumHealth <= 0f ? 0f : currentHealth / maximumHealth;
        public bool IsBroken => broken;

        public void Initialize(
            WSProofRuntime owner,
            WSCoverMaterial kind,
            float health)
        {
            runtime = owner;
            materialKind = kind;
            maximumHealth = Mathf.Max(1f, health);
            currentHealth = maximumHealth;
            originalScale = transform.localScale;
            bodyRenderer = GetComponent<Renderer>();
            bodyCollider = GetComponent<Collider>();

            if (bodyRenderer != null && bodyRenderer.sharedMaterial != null)
            {
                originalColor = bodyRenderer.sharedMaterial.HasProperty("_BaseColor")
                    ? bodyRenderer.sharedMaterial.GetColor("_BaseColor")
                    : bodyRenderer.sharedMaterial.color;
            }
        }

        public bool ApplyDamage(float damage, Vector3 hitPoint, Vector3 incomingVelocity)
        {
            if (broken)
            {
                return false;
            }

            currentHealth = Mathf.Max(0f, currentHealth - Mathf.Max(0f, damage));
            float health01 = Health01;
            transform.localScale = new Vector3(
                originalScale.x,
                Mathf.Max(0.18f, originalScale.y * (0.42f + 0.58f * health01)),
                originalScale.z);

            if (bodyRenderer != null && bodyRenderer.material != null)
            {
                Color damaged = Color.Lerp(new Color(0.12f, 0.08f, 0.06f), originalColor, health01);
                if (bodyRenderer.material.HasProperty("_BaseColor"))
                {
                    bodyRenderer.material.SetColor("_BaseColor", damaged);
                }
                if (bodyRenderer.material.HasProperty("_Color"))
                {
                    bodyRenderer.material.SetColor("_Color", damaged);
                }
            }

            runtime?.RegisterCoverDamage(this, damage, hitPoint);
            if (currentHealth > 0f)
            {
                return false;
            }

            Break(hitPoint, incomingVelocity);
            return true;
        }

        private void Break(Vector3 hitPoint, Vector3 incomingVelocity)
        {
            broken = true;
            if (bodyCollider != null)
            {
                bodyCollider.enabled = false;
            }
            if (bodyRenderer != null)
            {
                bodyRenderer.enabled = false;
            }

            runtime?.SpawnCoverDebris(this, hitPoint, incomingVelocity);
            runtime?.RegisterCoverBroken(this);
            Destroy(gameObject, 0.05f);
        }
    }
}
