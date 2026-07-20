using System;
using UnityEngine;

namespace JM.AdvancedGenerator
{
    [Serializable]
    public sealed class JMCharacterSpec
    {
        public string characterId = string.Empty;
        public string displayName = string.Empty;
        public string teamId = string.Empty;
        public string movementWord = string.Empty;
        [TextArea] public string identityLaw = string.Empty;
        public float moveSpeed = 1f;
        public float acceleration = 1f;
        public float mass = 1f;
        public float launchPower = 1f;
        public float friction = 0.5f;
        public float restitution = 0.5f;
        public float damageFactor = 1f;
        public float cooldownFactor = 1f;
    }

    [Serializable]
    public sealed class JMArenaSpec
    {
        public string arenaId = string.Empty;
        public string displayName = string.Empty;
        public string fieldWord = string.Empty;
        [TextArea] public string mechanicLaw = string.Empty;
        public Vector3 windVector;
        public float visibilityFactor = 1f;
        public float glintFactor = 1f;
        public string materialSet = string.Empty;
    }

    [CreateAssetMenu(
        fileName = "JMGameBodyDefinition",
        menuName = "JM/Advanced Generator/Game Body Definition",
        order = 10)]
    public sealed class JMGameBodyDefinition : ScriptableObject
    {
        public string gameId = string.Empty;
        public string displayName = string.Empty;
        public string routeType = string.Empty;
        public string proofScene = string.Empty;
        [TextArea(3, 8)] public string crown = string.Empty;
        [TextArea(3, 12)] public string sourceBoundary = string.Empty;
        public string[] requiredIntents = Array.Empty<string>();
        public JMCharacterSpec[] characters = Array.Empty<JMCharacterSpec>();
        public JMArenaSpec[] arenas = Array.Empty<JMArenaSpec>();
    }
}
