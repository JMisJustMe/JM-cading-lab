using System.Collections.Generic;
using UnityEngine;

#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace JM.AdvancedGenerator
{
    public enum JMContactPhase
    {
        Began,
        Moved,
        Stationary,
        Ended,
        Canceled
    }

    public readonly struct JMContact
    {
        public readonly int id;
        public readonly Vector2 position;
        public readonly Vector2 delta;
        public readonly JMContactPhase phase;

        public JMContact(int id, Vector2 position, Vector2 delta, JMContactPhase phase)
        {
            this.id = id;
            this.position = position;
            this.delta = delta;
            this.phase = phase;
        }
    }

    public static class JMContactReader
    {
        private static readonly Dictionary<int, Vector2> PreviousPositions = new Dictionary<int, Vector2>();
        private static bool mouseWasPressed;
        private static Vector2 previousMousePosition;

        public static void Read(List<JMContact> destination)
        {
            destination.Clear();

#if ENABLE_INPUT_SYSTEM
            if (ReadInputSystem(destination))
            {
                return;
            }
#endif

#if ENABLE_LEGACY_INPUT_MANAGER
            ReadLegacy(destination);
#endif
        }

        public static float ReadHorizontalAxis()
        {
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current != null)
            {
                float left = Keyboard.current.aKey.isPressed || Keyboard.current.leftArrowKey.isPressed ? -1f : 0f;
                float right = Keyboard.current.dKey.isPressed || Keyboard.current.rightArrowKey.isPressed ? 1f : 0f;
                if (!Mathf.Approximately(left + right, 0f))
                {
                    return left + right;
                }
            }

            if (Gamepad.current != null)
            {
                float value = Gamepad.current.leftStick.x.ReadValue();
                if (Mathf.Abs(value) > 0.05f)
                {
                    return value;
                }
            }
#endif

#if ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetAxisRaw("Horizontal");
#else
            return 0f;
#endif
        }

        public static bool WasKeyPressed(JMIntentType intent)
        {
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current != null)
            {
                switch (intent)
                {
                    case JMIntentType.WeaponSwap:
                        return Keyboard.current.qKey.wasPressedThisFrame;
                    case JMIntentType.Dodge:
                        return Keyboard.current.spaceKey.wasPressedThisFrame;
                    case JMIntentType.PeekBegin:
                        return Keyboard.current.eKey.wasPressedThisFrame;
                    case JMIntentType.Reset:
                        return Keyboard.current.rKey.wasPressedThisFrame;
                    case JMIntentType.PowerTrigger:
                        return Keyboard.current.fKey.wasPressedThisFrame;
                }
            }
#endif

#if ENABLE_LEGACY_INPUT_MANAGER
            switch (intent)
            {
                case JMIntentType.WeaponSwap:
                    return Input.GetKeyDown(KeyCode.Q);
                case JMIntentType.Dodge:
                    return Input.GetKeyDown(KeyCode.Space);
                case JMIntentType.PeekBegin:
                    return Input.GetKeyDown(KeyCode.E);
                case JMIntentType.Reset:
                    return Input.GetKeyDown(KeyCode.R);
                case JMIntentType.PowerTrigger:
                    return Input.GetKeyDown(KeyCode.F);
            }
#endif

            return false;
        }

#if ENABLE_INPUT_SYSTEM
        private static bool ReadInputSystem(List<JMContact> destination)
        {
            bool found = false;
            if (Touchscreen.current != null)
            {
                foreach (var touch in Touchscreen.current.touches)
                {
                    if (!touch.press.isPressed && touch.phase.ReadValue() == UnityEngine.InputSystem.TouchPhase.None)
                    {
                        continue;
                    }

                    int id = touch.touchId.ReadValue();
                    Vector2 position = touch.position.ReadValue();
                    Vector2 previous = PreviousPositions.TryGetValue(id, out Vector2 stored) ? stored : position;
                    JMContactPhase phase = ConvertPhase(touch.phase.ReadValue());
                    destination.Add(new JMContact(id, position, position - previous, phase));
                    found = true;

                    if (phase == JMContactPhase.Ended || phase == JMContactPhase.Canceled)
                    {
                        PreviousPositions.Remove(id);
                    }
                    else
                    {
                        PreviousPositions[id] = position;
                    }
                }
            }

            if (!found && Mouse.current != null)
            {
                bool pressed = Mouse.current.leftButton.isPressed;
                Vector2 position = Mouse.current.position.ReadValue();
                if (pressed || mouseWasPressed)
                {
                    JMContactPhase phase = pressed
                        ? (mouseWasPressed ? JMContactPhase.Moved : JMContactPhase.Began)
                        : JMContactPhase.Ended;
                    destination.Add(new JMContact(-1, position, position - previousMousePosition, phase));
                    found = true;
                }

                mouseWasPressed = pressed;
                previousMousePosition = position;
            }

            return found;
        }

        private static JMContactPhase ConvertPhase(UnityEngine.InputSystem.TouchPhase phase)
        {
            switch (phase)
            {
                case UnityEngine.InputSystem.TouchPhase.Began:
                    return JMContactPhase.Began;
                case UnityEngine.InputSystem.TouchPhase.Moved:
                    return JMContactPhase.Moved;
                case UnityEngine.InputSystem.TouchPhase.Stationary:
                    return JMContactPhase.Stationary;
                case UnityEngine.InputSystem.TouchPhase.Ended:
                    return JMContactPhase.Ended;
                case UnityEngine.InputSystem.TouchPhase.Canceled:
                    return JMContactPhase.Canceled;
                default:
                    return JMContactPhase.Stationary;
            }
        }
#endif

#if ENABLE_LEGACY_INPUT_MANAGER
        private static void ReadLegacy(List<JMContact> destination)
        {
            if (Input.touchCount > 0)
            {
                foreach (Touch touch in Input.touches)
                {
                    destination.Add(new JMContact(
                        touch.fingerId,
                        touch.position,
                        touch.deltaPosition,
                        ConvertLegacyPhase(touch.phase)));
                }
                return;
            }

            bool pressed = Input.GetMouseButton(0);
            Vector2 position = Input.mousePosition;
            if (pressed || mouseWasPressed)
            {
                JMContactPhase phase = pressed
                    ? (mouseWasPressed ? JMContactPhase.Moved : JMContactPhase.Began)
                    : JMContactPhase.Ended;
                destination.Add(new JMContact(-1, position, position - previousMousePosition, phase));
            }

            mouseWasPressed = pressed;
            previousMousePosition = position;
        }

        private static JMContactPhase ConvertLegacyPhase(TouchPhase phase)
        {
            switch (phase)
            {
                case TouchPhase.Began:
                    return JMContactPhase.Began;
                case TouchPhase.Moved:
                    return JMContactPhase.Moved;
                case TouchPhase.Stationary:
                    return JMContactPhase.Stationary;
                case TouchPhase.Ended:
                    return JMContactPhase.Ended;
                case TouchPhase.Canceled:
                    return JMContactPhase.Canceled;
                default:
                    return JMContactPhase.Stationary;
            }
        }
#endif
    }
}
