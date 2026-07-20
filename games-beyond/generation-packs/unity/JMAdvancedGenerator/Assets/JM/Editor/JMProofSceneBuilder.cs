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
        private const string DataFolder = "Assets/JM/Data";
        private const string WesternScenePath = SceneFolder + "/WS_Dustfall_Proof01.unity";
        private const string TBoysScenePath = SceneFolder + "/TB_CoreClash_Proof01.unity";

        [MenuItem("JM/Build Advanced Proof Scenes")]
        public static void BuildProofScenes()
        {
            EnsureFolder("Assets", "JM");
            EnsureFolder("Assets/JM", "Scenes");
            EnsureFolder("Assets/JM", "Data");

            CreateWesternDefinition();
            CreateTBoysDefinition();
            BuildScene<WesternSniperAdapter>(WesternScenePath, "WS_Dustfall_Proof01");
            BuildScene<TBoysCoreClashAdapter>(TBoysScenePath, "TB_CoreClash_Proof01");

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            EditorSceneManager.OpenScene(WesternScenePath, OpenSceneMode.Single);

            Debug.Log("JM SCENE BUILD DING · data assets and both proof scenes created.");
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

        private static void CreateWesternDefinition()
        {
            JMGameBodyDefinition definition = LoadOrCreate(DataFolder + "/WesternSniper_v0_1.asset");
            definition.gameId = "JM.WESTERN_SNIPER.PVP";
            definition.displayName = "JM Western Sniper PvP";
            definition.routeType = "ADVANCED_REGENERATION";
            definition.proofScene = "WS_Dustfall_Proof01";
            definition.crown = "Rebuild the body upward. Preserve tension, route choice, simultaneous fairness and field consequence.";
            definition.sourceBoundary = "Unity hosts rendering, physics, animation, audio and packaging. Western Sniper keeps TapPlace Tension, weapon weight, cover, dodge, field identity and TraceBox authority.";
            definition.requiredIntents = new[] { "MOVE_AXIS", "AIM_BEGIN", "AIM_ADJUST", "AIM_RELEASE", "AIM_CANCEL", "DODGE", "WEAPON_SWAP", "PEEK_BEGIN", "PEEK_END" };
            definition.characters = new[]
            {
                Character("LONGSHOT", "Longshot", "PLAYER", "STEADY RIFLE", "Measured movement and cleaner rifle tension.", 0.91f, 0.92f, 1.04f, 0.78f),
                Character("QUICKHAND", "Quickhand", "PLAYER", "FAST REVOLVER", "Fast feet and rapid revolver recovery.", 1.08f, 1.12f, 0.96f, 0.80f),
                Character("DRIFTER", "Drifter", "PLAYER", "MOVING AIM", "Keeps aim coherent while changing route.", 1.15f, 1.04f, 1.00f, 0.92f)
            };
            definition.arenas = new[]
            {
                Arena("DUSTFALL", "Dustfall", "CALM STREET", "Neutral field for pure contact reading.", Vector3.zero, 1f, 1f, "timber-stone-metal"),
                Arena("RED_CANYON", "Red Canyon", "CROSSWIND", "Up-canyon wind bends longer bullet routes.", new Vector3(0.92f, 0f, 0f), 0.96f, 0.92f, "stone-timber-metal"),
                Arena("MOON_MINE", "Moon Mine", "LOW LIGHT", "Visibility pressure makes glints and lanterns matter.", new Vector3(-0.28f, 0f, 0f), 0.76f, 1.42f, "mine-timber-metal")
            };
            EditorUtility.SetDirty(definition);
        }

        private static void CreateTBoysDefinition()
        {
            JMGameBodyDefinition definition = LoadOrCreate(DataFolder + "/TBoys4TClash_v0_1.asset");
            definition.gameId = "JM.TBOYS.4T_CLASH";
            definition.displayName = "T-Boys: 4T Clash";
            definition.routeType = "HYBRID_ADVANCED_GENERATION";
            definition.proofScene = "TB_CoreClash_Proof01";
            definition.crown = "Pick your 4T. Face their 4T. Prove your Forty.";
            definition.sourceBoundary = "Core Clash is the proven ancestor, not the ceiling. Unity must generate the first full T-Boys product body while keeping future modes adapter-separated.";
            definition.requiredIntents = new[] { "CREW_SELECT", "AIM_BEGIN", "AIM_VECTOR", "AIM_POWER", "AIM_RELEASE", "AIM_CANCEL", "POWER_TRIGGER", "RESET_CHALLENGE" };
            definition.characters = new[]
            {
                Character("JAX", "Jax", "BLUEFIN", "DIRECT", "Clean line and dependable contact.", 1f, 1f, 1f, 1f),
                Character("RIKO", "Riko", "BLUEFIN", "BOUNCE", "Ricochet and rebound route specialist.", 1.05f, 1f, 0.95f, 1.20f),
                Character("TANKO", "Tanko", "BLUEFIN", "BRACE", "Holds position and resists displacement.", 0.82f, 0.78f, 1.10f, 0.80f),
                Character("ZIGGY", "Ziggy", "BLUEFIN", "CURVE", "Curves into routes that direct bodies cannot reach.", 1.08f, 1.05f, 0.90f, 1f),
                Character("RAZE", "Raze", "CRIMSON", "STRIKE", "Aggressive direct pressure.", 1.08f, 1.10f, 1.08f, 1f),
                Character("NYX", "Nyx", "CRIMSON", "TRICK", "Deceptive route change.", 1.05f, 1.08f, 0.95f, 1.05f),
                Character("BRIKK", "Brikk", "CRIMSON", "BLOCK", "Defensive obstruction and Core protection.", 0.80f, 0.75f, 1.05f, 0.75f),
                Character("BOLT", "Bolt", "CRIMSON", "SHOCK", "Burst contact and disruptive speed.", 1.18f, 1.18f, 0.98f, 1.05f)
            };
            definition.arenas = new[]
            {
                Arena("CORE_BOARD_01", "Core Board 01", "TOY BOARD", "Portrait-first launch, collision, hazards and Core pressure.", Vector3.zero, 1f, 1f, "toy-board-bumper-hold")
            };
            EditorUtility.SetDirty(definition);
        }

        private static JMGameBodyDefinition LoadOrCreate(string path)
        {
            JMGameBodyDefinition definition = AssetDatabase.LoadAssetAtPath<JMGameBodyDefinition>(path);
            if (definition != null)
            {
                return definition;
            }

            definition = ScriptableObject.CreateInstance<JMGameBodyDefinition>();
            AssetDatabase.CreateAsset(definition, path);
            return definition;
        }

        private static JMCharacterSpec Character(
            string id,
            string name,
            string team,
            string word,
            string law,
            float speed,
            float acceleration,
            float damage,
            float cooldown)
        {
            return new JMCharacterSpec
            {
                characterId = id,
                displayName = name,
                teamId = team,
                movementWord = word,
                identityLaw = law,
                moveSpeed = speed,
                acceleration = acceleration,
                damageFactor = damage,
                cooldownFactor = cooldown
            };
        }

        private static JMArenaSpec Arena(
            string id,
            string name,
            string word,
            string law,
            Vector3 wind,
            float visibility,
            float glint,
            string materials)
        {
            return new JMArenaSpec
            {
                arenaId = id,
                displayName = name,
                fieldWord = word,
                mechanicLaw = law,
                windVector = wind,
                visibilityFactor = visibility,
                glintFactor = glint,
                materialSet = materials
            };
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
