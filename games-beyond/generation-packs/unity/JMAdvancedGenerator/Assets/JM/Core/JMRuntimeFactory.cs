using UnityEngine;

namespace JM.AdvancedGenerator
{
    public static class JMRuntimeFactory
    {
        public static Material CreateMaterial(
            string name,
            Color color,
            float metallic = 0f,
            float smoothness = 0.35f)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit")
                ?? Shader.Find("Standard")
                ?? Shader.Find("Sprites/Default");

            var material = new Material(shader)
            {
                name = name
            };

            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", color);
            }
            if (material.HasProperty("_Color"))
            {
                material.SetColor("_Color", color);
            }
            if (material.HasProperty("_Metallic"))
            {
                material.SetFloat("_Metallic", metallic);
            }
            if (material.HasProperty("_Smoothness"))
            {
                material.SetFloat("_Smoothness", smoothness);
            }

            return material;
        }

        public static GameObject CreatePrimitive(
            string name,
            PrimitiveType type,
            Vector3 position,
            Vector3 scale,
            Material material,
            Transform parent = null)
        {
            GameObject body = GameObject.CreatePrimitive(type);
            body.name = name;
            body.transform.SetParent(parent, false);
            body.transform.position = position;
            body.transform.localScale = scale;

            Renderer renderer = body.GetComponent<Renderer>();
            if (renderer != null && material != null)
            {
                renderer.sharedMaterial = material;
            }

            return body;
        }

        public static void AddBoundary(
            string name,
            Vector3 position,
            Vector3 scale,
            Transform parent = null)
        {
            var boundary = new GameObject(name);
            boundary.transform.SetParent(parent, false);
            boundary.transform.position = position;
            boundary.transform.localScale = scale;
            boundary.AddComponent<BoxCollider>();
        }

        public static Rigidbody AddRigidbody(
            GameObject body,
            float mass,
            float linearDamping = 0.3f,
            float angularDamping = 0.7f,
            bool useGravity = true)
        {
            Rigidbody rigidbody = body.GetComponent<Rigidbody>() ?? body.AddComponent<Rigidbody>();
            rigidbody.mass = Mathf.Max(0.01f, mass);
            rigidbody.linearDamping = Mathf.Max(0f, linearDamping);
            rigidbody.angularDamping = Mathf.Max(0f, angularDamping);
            rigidbody.useGravity = useGravity;
            rigidbody.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            rigidbody.interpolation = RigidbodyInterpolation.Interpolate;
            return rigidbody;
        }
    }
}
