using UnityEngine;

namespace JM.AdvancedGenerator.WesternSniper
{
    public sealed class WSProjectile : MonoBehaviour
    {
        private WSProofRuntime runtime;
        private Rigidbody body;
        private Collider ownerCollider;
        private string ownerId = string.Empty;
        private string weapon = string.Empty;
        private float damage;
        private float lifeRemaining = 5f;
        private int ricochetsRemaining;
        private bool resolved;

        public void Initialize(
            WSProofRuntime owner,
            string shooterId,
            string weaponId,
            Collider shooterCollider,
            Vector3 velocity,
            float contactDamage,
            int ricochets)
        {
            runtime = owner;
            ownerId = shooterId ?? string.Empty;
            weapon = weaponId ?? string.Empty;
            ownerCollider = shooterCollider;
            damage = Mathf.Max(0f, contactDamage);
            ricochetsRemaining = Mathf.Max(0, ricochets);
            body = GetComponent<Rigidbody>();

            Collider projectileCollider = GetComponent<Collider>();
            if (projectileCollider != null && ownerCollider != null)
            {
                Physics.IgnoreCollision(projectileCollider, ownerCollider, true);
            }

            if (body != null)
            {
                body.linearVelocity = velocity;
            }
        }

        private void Update()
        {
            lifeRemaining -= Time.deltaTime;
            if (lifeRemaining <= 0f || transform.position.y < -4f)
            {
                Resolve("expired");
            }
        }

        private void OnCollisionEnter(Collision collision)
        {
            if (resolved || collision.contactCount == 0)
            {
                return;
            }

            ContactPoint contact = collision.GetContact(0);
            Vector3 incoming = body != null ? body.linearVelocity : Vector3.zero;

            WSFighterHitbox fighter = collision.collider.GetComponentInParent<WSFighterHitbox>();
            if (fighter != null)
            {
                if (fighter.FighterId == ownerId)
                {
                    return;
                }

                fighter.ApplyDamage(damage, contact.point, weapon);
                runtime?.RegisterProjectileContact(ownerId, "fighter", weapon, contact.point, incoming);
                Resolve("fighter");
                return;
            }

            WSDestructibleCover cover = collision.collider.GetComponentInParent<WSDestructibleCover>();
            if (cover != null)
            {
                float materialMultiplier = cover.MaterialKind == WSCoverMaterial.Timber
                    ? 1.15f
                    : cover.MaterialKind == WSCoverMaterial.Stone ? 0.78f : 0.55f;
                cover.ApplyDamage(damage * materialMultiplier, contact.point, incoming);
                runtime?.RegisterProjectileContact(ownerId, "cover." + cover.MaterialKind, weapon, contact.point, incoming);

                if (cover.MaterialKind == WSCoverMaterial.Metal && ricochetsRemaining > 0 && body != null)
                {
                    ricochetsRemaining--;
                    Vector3 reflected = Vector3.Reflect(incoming.normalized, contact.normal);
                    body.linearVelocity = reflected * Mathf.Max(8f, incoming.magnitude * 0.72f);
                    transform.position = contact.point + contact.normal * 0.08f;
                    runtime?.RegisterRicochet(ownerId, weapon, contact.point, body.linearVelocity);
                    return;
                }

                Resolve("cover");
                return;
            }

            if (ricochetsRemaining > 0 && body != null && Mathf.Abs(Vector3.Dot(incoming.normalized, contact.normal)) < 0.52f)
            {
                ricochetsRemaining--;
                body.linearVelocity = Vector3.Reflect(incoming.normalized, contact.normal) * Mathf.Max(7f, incoming.magnitude * 0.62f);
                runtime?.RegisterRicochet(ownerId, weapon, contact.point, body.linearVelocity);
                return;
            }

            Resolve("world");
        }

        private void Resolve(string reason)
        {
            if (resolved)
            {
                return;
            }

            resolved = true;
            runtime?.RegisterProjectileResolved(ownerId, weapon, reason, transform.position);
            Destroy(gameObject);
        }
    }
}
