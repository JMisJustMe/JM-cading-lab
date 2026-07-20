using System;
using JM.AdvancedGenerator.TBoys;
using JM.AdvancedGenerator.WesternSniper;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace JM.AdvancedGenerator.Editor
{
    public static class JMProofSceneBuilder
    {
        private const string SceneFolder = "Assets/JM/Scenes";
        private const string WesternScenePath = SceneFolder + "/WS_Dustfall_Proof01.unity";
        private const string TBoysScenePath = SceneFolder + "/TB_CoreClash_Proof01.unity";

        [MenuItem("JM/Build Advanced Proof Scenes")]
        public static void BuildProofScenes()
        {
            EnsureFolder("Assets", "JM");
            EnsureFolder("Assets/JM", "Scenes");

            BuildScene<WesternSniperAdapter>(WesternScenePath, "WS_Dustfall_Proof01");
            BuildScene<TBoysCoreClashAdapter>(TBoysScenePath, "TB_CoreClash_Proof01");

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            EditorSceneManager.OpenScene(WesternScenePath, OpenSceneMode.Single);

            Debug.Log("JM SCENE BUILD DING · Western Sniper and T-Boys proof scenes created.");
        }

        private static void BuildScene<TAdapter>(string path, string sceneName)
            where TAdapter : MonoBehaviour, IJMGameAdapter
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var hostObject = new GameObject("JMGameHost");
            var traceBox = hostObject.AddComponent<JMTraceBox>();
            var adapter = hostObject.AddComponent<TAdapter>();
            var host = hostObject.AddComponent<JMGameHost>();
            host.AssignAdapter(adapter);
            EditorUtility.SetDirty(host);

            var cameraObject = new GameObject("Main Camera");
            var camera = cameraObject.AddComponent<Camera>();
            cameraObject.tag = "MainCamera";
            camera.transform.position = new Vector3(0f, 3.5f, -9f);
            camera.transform.rotation = Quaternion.Euler(14f, 0f, 0f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.025f, 0.035f, 0.06f, 1f);

            var lightObject = new GameObject("Directional Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.1f;
            lightObject.transform.rotation = Quaternion.Euler(48f, -32f, 0f);

            var proofMarker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            proofMarker.name = "JM_PROOF_MARKER_REPLACE_WITH_GAME_BODY";
            proofMarker.transform.position = Vector3.zero;
            proofMarker.transform.localScale = new Vector3(3f, 0.25f, 2f);

            traceBox.Record(
                adapter.GameId,
                "scene.manufactured",
                sceneName + " · placeholder marker is not gameplay");

            if (!EditorSceneManager.SaveScene(scene, path))
            {
                throw new InvalidOperationException("Could not save JM proof scene: " + path);
            }
        }

        private static void EnsureFolder(string parent, string child)
        {
            string path = parent + "/" + child;
            if (!AssetDatabase.IsValidFolder(path))
            {
                AssetDatabase.CreateFolder(parent, child);
            }
        }
    }
}
