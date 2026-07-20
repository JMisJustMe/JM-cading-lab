using UnityEngine;

namespace JM.AdvancedGenerator.WesternSniper
{
    public sealed class WSFighterHitbox : MonoBehaviour
    {
        [SerializeField] private string fighterId = string.Empty;
        private WSProofRuntime runtime;

        public string FighterId => fighterId;

        public void Initialize(WSProofRuntime owner, string id)
        {
            runtime = owner;
            fighterId = id ?? string.Empty;
        }

        public void ApplyDamage(float damage, Vector3 hitPoint, string weapon)
        {
            runtime?.ApplyFighterDamage(fighterId, damage, hitPoint, weapon);
        }
    }
}
