using UnityEngine;

namespace JM.AdvancedGenerator.WesternSniper
{
    public sealed class WesternSniperAdapter : MonoBehaviour, IJMGameAdapter
    {
        private JMGameHost host;
        private int shotsReleased;
        private int coverContacts;
        private int fighterContacts;
        private string weapon = "RIFLE";
        private bool aiming;

        public string GameId => "JM.WESTERN_SNIPER.PVP";

        public void Initialize(JMGameHost gameHost)
        {
            host = gameHost;
            host.TraceBox.Record(GameId, "adapter.mount", "TapPlace Tension · Dustfall proof spine");
        }

        public void HandleIntent(JMGameIntent intent)
        {
            switch (intent.type)
            {
                case JMIntentType.AimBegin:
                    aiming = true;
                    host.TraceBox.Record(GameId, "aim.begin", weapon);
                    break;
                case JMIntentType.AimAdjust:
                case JMIntentType.AimVector:
                    if (aiming)
                    {
                        host.TraceBox.Record(GameId, "aim.adjust", weapon, intent.value, intent.vector);
                    }
                    break;
                case JMIntentType.AimRelease:
                    if (!aiming)
                    {
                        return;
                    }
                    aiming = false;
                    shotsReleased++;
                    host.TraceBox.Record(GameId, "shot.release", weapon, intent.value, intent.vector);
                    break;
                case JMIntentType.AimCancel:
                    aiming = false;
                    host.TraceBox.Record(GameId, "aim.cancel", weapon);
                    break;
                case JMIntentType.WeaponSwap:
                    weapon = weapon == "RIFLE" ? "REVOLVER" : "RIFLE";
                    host.TraceBox.Record(GameId, "weapon.swap", weapon);
                    break;
                case JMIntentType.Dodge:
                    host.TraceBox.Record(GameId, "dodge", "proof-intent");
                    break;
                case JMIntentType.PeekBegin:
                    host.TraceBox.Record(GameId, "peek.begin");
                    break;
                case JMIntentType.PeekEnd:
                    host.TraceBox.Record(GameId, "peek.end");
                    break;
            }
        }

        public void Tick(float deltaTime)
        {
            // Game-specific physics enters after this adapter separation spine passes.
        }

        public void RegisterCoverContact(float damage)
        {
            coverContacts++;
            host.TraceBox.Record(GameId, "cover.contact", weapon, damage);
        }

        public void RegisterFighterContact(float damage)
        {
            fighterContacts++;
            host.TraceBox.Record(GameId, "fighter.contact", weapon, damage);
        }

        public JMProofSnapshot CaptureProof()
        {
            return new JMProofSnapshot
            {
                gameId = GameId,
                status = host != null ? "DING" : "BUGG",
                summary = $"weapon={weapon}; shots={shotsReleased}; coverContacts={coverContacts}; fighterContacts={fighterContacts}",
                contactCount = coverContacts + fighterContacts,
                scoreA = fighterContacts,
                scoreB = coverContacts
            };
        }
    }
}
