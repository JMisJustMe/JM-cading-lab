using System.Collections.Generic;
using UnityEngine;

namespace JM.AdvancedGenerator.TBoys
{
    public sealed class TBoysCoreClashAdapter : MonoBehaviour, IJMGameAdapter
    {
        private readonly HashSet<string> validCrewUse = new HashSet<string>();
        private JMGameHost host;
        private string selectedCrew = "JAX";
        private int launches;
        private int coreDamage;
        private int powerUses;
        private bool aiming;

        public string GameId => "JM.TBOYS.4T_CLASH";

        public void Initialize(JMGameHost gameHost)
        {
            host = gameHost;
            host.TraceBox.Record(GameId, "adapter.mount", "Core Clash product-generation spine");
            host.TraceBox.Record(GameId, "crew.select", selectedCrew);
        }

        public void HandleIntent(JMGameIntent intent)
        {
            switch (intent.type)
            {
                case JMIntentType.CrewSelect:
                    if (!string.IsNullOrWhiteSpace(intent.text))
                    {
                        selectedCrew = intent.text.Trim().ToUpperInvariant();
                        host.TraceBox.Record(GameId, "crew.select", selectedCrew);
                    }
                    break;
                case JMIntentType.AimBegin:
                    aiming = true;
                    host.TraceBox.Record(GameId, "aim.begin", selectedCrew);
                    break;
                case JMIntentType.AimVector:
                case JMIntentType.AimAdjust:
                    if (aiming)
                    {
                        host.TraceBox.Record(GameId, "aim.adjust", selectedCrew, intent.value, intent.vector);
                    }
                    break;
                case JMIntentType.AimRelease:
                    if (!aiming)
                    {
                        return;
                    }
                    aiming = false;
                    launches++;
                    validCrewUse.Add(selectedCrew);
                    host.TraceBox.Record(GameId, "launch.release", selectedCrew, intent.value, intent.vector);
                    host.TraceBox.Record(GameId, "crew.identity.registered", selectedCrew, validCrewUse.Count);
                    break;
                case JMIntentType.AimCancel:
                    aiming = false;
                    host.TraceBox.Record(GameId, "aim.cancel", selectedCrew);
                    break;
                case JMIntentType.PowerTrigger:
                    if (validCrewUse.Count < 4)
                    {
                        host.TraceBox.Record(GameId, "4t.power.hold", $"crew={validCrewUse.Count}/4");
                        return;
                    }
                    powerUses++;
                    validCrewUse.Clear();
                    host.TraceBox.Record(GameId, "4t.power.trigger", selectedCrew, powerUses);
                    break;
            }
        }

        public void Tick(float deltaTime)
        {
            // Character movement-word physics enters after the adapter spine passes.
        }

        public void RegisterCoreDamage(int damage)
        {
            coreDamage += Mathf.Max(0, damage);
            host.TraceBox.Record(GameId, "core.damage", selectedCrew, damage);
        }

        public void RegisterArenaContact(string contactType)
        {
            host.TraceBox.Record(GameId, "arena.contact", contactType ?? string.Empty);
        }

        public JMProofSnapshot CaptureProof()
        {
            return new JMProofSnapshot
            {
                gameId = GameId,
                status = host != null ? "DING" : "BUGG",
                summary = $"selected={selectedCrew}; launches={launches}; registeredCrew={validCrewUse.Count}; powerUses={powerUses}; coreDamage={coreDamage}",
                contactCount = launches,
                scoreA = coreDamage,
                scoreB = powerUses
            };
        }
    }
}
