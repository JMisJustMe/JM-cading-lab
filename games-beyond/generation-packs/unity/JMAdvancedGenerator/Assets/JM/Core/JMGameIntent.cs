using System;
using UnityEngine;

namespace JM.AdvancedGenerator
{
    public enum JMIntentType
    {
        None = 0,
        MoveAxis,
        AimBegin,
        AimVector,
        AimPower,
        AimAdjust,
        AimRelease,
        AimCancel,
        Dodge,
        WeaponSwap,
        PeekBegin,
        PeekEnd,
        CrewSelect,
        PowerTrigger,
        CameraFocus,
        Pause,
        Reset
    }

    [Serializable]
    public struct JMGameIntent
    {
        public JMIntentType type;
        public Vector2 vector;
        public float value;
        public string text;
        public string source;
        public double time;

        public static JMGameIntent Create(
            JMIntentType type,
            Vector2 vector = default,
            float value = 0f,
            string text = "",
            string source = "runtime")
        {
            return new JMGameIntent
            {
                type = type,
                vector = vector,
                value = value,
                text = text ?? string.Empty,
                source = source ?? "runtime",
                time = Time.realtimeSinceStartupAsDouble
            };
        }
    }
}
