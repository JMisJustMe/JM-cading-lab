using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace JM.AdvancedGenerator.TBoys
{
    public sealed class TBProofRuntime : MonoBehaviour
    {
        private readonly List<JMContact> contacts = new List<JMContact>(8);
        private readonly List<TBBody> bluefin = new List<TBBody>(4);
        private readonly List<TBBody> crimson = new List<TBBody>(4);
        private readonly List<TBBody> allBodies = new List<TBBody>(8);
        private readonly HashSet<string> usedCrew = new HashSet<string>();

        private JMGameHost host;
        private TBoysCoreClashAdapter adapter;
        private Camera sceneCamera;
        private GameObject worldRoot;
        private TBCoreTarget bluefinCore;
        private TBCoreTarget crimsonCore;
        private LineRenderer aimLine;
        private Material blueMaterial;
        private Material crimsonMaterial;
        private Material boardMaterial;
        private Material bumperMaterial;
        private Material hazardMaterial;
        private Material powerMaterial;

        private int selectedIndex;
        private int aimContactId = int.MinValue;
        private bool aiming;
        private Vector3 aimPoint;
        private bool powerArmed;
        private int turnState;
        private float turnDeadline;
        private float aiActionAt;
        private bool roundResolving;
        private int playerRounds;
        private int rivalRounds;
        private string banner = "CORE CLASH · BENCH CHEMISTRY";
        private float bannerUntil;
        private bool chemistryDinged;

        private TBBody SelectedBody => bluefin.Count == 0 ? null : bluefin[Mathf.Clamp(selectedIndex, 0, bluefin.Count - 1)];

        private void Start()
        {
            host = GetComponent<JMGameHost>();
            adapter = GetComponent<TBoysCoreClashAdapter>();

            GameObject marker = GameObject.Find("JM_PROOF_MARKER_REPLACE_WITH_GAME_BODY");
            if (marker != null)
            {
                Destroy(marker);
            }

            ConfigureCamera();
            BuildWorld();
            host?.TraceBox.Record("JM.TBOYS.4T_CLASH", "proof.runtime.boot", "Core Clash playable 3D slice");
        }

        private void Update()
        {
            if (worldRoot == null)
            {
                return;
            }

            JMContactReader.Read(contacts);
            ProcessContacts();
            ProcessKeyboard();
            UpdateAimLine();
            UpdateTurnGovernor();
            RecoverEscapedBodies();
        }

        private void ConfigureCamera()
        {
            sceneCamera = Camera.main;
            if (sceneCamera == null)
            {
                GameObject cameraObject = new GameObject("Main Camera");
                cameraObject.tag = "MainCamera";
                sceneCamera = cameraObject.AddComponent<Camera>();
            }

            sceneCamera.transform.position = new Vector3(0f, 15.2f, -13.8f);
            sceneCamera.transform.LookAt(new Vector3(0f, 0f, 0.25f));
            sceneCamera.fieldOfView = 42f;
            sceneCamera.nearClipPlane = 0.1f;
            sceneCamera.farClipPlane = 100f;
            sceneCamera.clearFlags = CameraClearFlags.SolidColor;
            sceneCamera.backgroundColor = new Color(0.018f, 0.035f, 0.075f, 1f);
        }

        private void BuildWorld()
        {
            worldRoot = new GameObject("TBOYS_CORE_CLASH_RUNTIME_WORLD");
            bluefin.Clear();
            crimson.Clear();
            allBodies.Clear();
            usedCrew.Clear();
            powerArmed = false;
            aiming = false;
            aimContactId = int.MinValue;
            turnState = 0;
            roundResolving = false;
            chemistryDinged = false;

            blueMaterial = JMRuntimeFactory.CreateMaterial("TB_Bluefin", new Color(0.08f, 0.58f, 1f), 0.16f, 0.68f);
            crimsonMaterial = JMRuntimeFactory.CreateMaterial("TB_Crimson", new Color(1f, 0.18f, 0.24f), 0.14f, 0.64f);
            boardMaterial = JMRuntimeFactory.CreateMaterial("TB_Board", new Color(0.055f, 0.11f, 0.22f), 0.08f, 0.46f);
            bumperMaterial = JMRuntimeFactory.CreateMaterial("TB_Bumper", new Color(1f, 0.76f, 0.12f), 0.32f, 0.76f);
            hazardMaterial = JMRuntimeFactory.CreateMaterial("TB_Hold", new Color(0.53f, 0.18f, 0.82f), 0.08f, 0.62f);
            powerMaterial = JMRuntimeFactory.CreateMaterial("TB_Route", new Color(0.38f, 0.95f, 1f), 0.14f, 0.86f);

            JMRuntimeFactory.CreatePrimitive(
                "Core Clash Board",
                PrimitiveType.Cube,
                new Vector3(0f, -0.28f, 0f),
                new Vector3(9.2f, 0.45f, 16.5f),
                boardMaterial,
                worldRoot.transform);

            CreateBoardStripe(new Vector3(0f, -0.02f, 0f), new Vector3(0.12f, 0.04f, 15.2f));
            CreateBoardStripe(new Vector3(0f, -0.01f, -6.1f), new Vector3(8.6f, 0.04f, 0.10f));
            CreateBoardStripe(new Vector3(0f, -0.01f, 6.1f), new Vector3(8.6f, 0.04f, 0.10f));

            JMRuntimeFactory.AddBoundary("TB Left Wall", new Vector3(-4.75f, 0.5f, 0f), new Vector3(0.25f, 1.4f, 17f), worldRoot.transform);
            JMRuntimeFactory.AddBoundary("TB Right Wall", new Vector3(4.75f, 0.5f, 0f), new Vector3(0.25f, 1.4f, 17f), worldRoot.transform);
            JMRuntimeFactory.AddBoundary("TB Blue End", new Vector3(0f, 0.5f, -8.45f), new Vector3(9.6f, 1.4f, 0.25f), worldRoot.transform);
            JMRuntimeFactory.AddBoundary("TB Crimson End", new Vector3(0f, 0.5f, 8.45f), new Vector3(9.6f, 1.4f, 0.25f), worldRoot.transform);

            CreateBumper("Left Bumper", new Vector3(-2.65f, 0.34f, 0.15f), new Vector3(0.78f, 0.50f, 0.78f));
            CreateBumper("Right Bumper", new Vector3(2.65f, 0.34f, -0.15f), new Vector3(0.78f, 0.50f, 0.78f));
            CreateBumper("Upper Gate", new Vector3(0f, 0.34f, 3.0f), new Vector3(1.12f, 0.50f, 0.52f));
            CreateBumper("Lower Gate", new Vector3(0f, 0.34f, -3.0f), new Vector3(1.12f, 0.50f, 0.52f));
            CreateHoldHazard();

            bluefinCore = CreateCore("Bluefin Core", "BLUEFIN", new Vector3(0f, 0.32f, -7.15f), blueMaterial);
            crimsonCore = CreateCore("Crimson Core", "CRIMSON", new Vector3(0f, 0.32f, 7.15f), crimsonMaterial);

            string[] blueIds = { "JAX", "RIKO", "TANKO", "ZIGGY" };
            string[] blueWords = { "DIRECT", "BOUNCE", "BRACE", "CURVE" };
            string[] crimsonIds = { "RAZE", "NYX", "BRIKK", "BOLT" };
            string[] crimsonWords = { "STRIKE", "TRICK", "BLOCK", "SHOCK" };
            float[] xPositions = { -3.0f, -1.0f, 1.0f, 3.0f };

            for (int index = 0; index < 4; index++)
            {
                bluefin.Add(CreateBody(
                    blueIds[index],
                    "BLUEFIN",
                    blueWords[index],
                    new Vector3(xPositions[index], 0.24f, -5.25f),
                    blueMaterial,
                    index));

                crimson.Add(CreateBody(
                    crimsonIds[index],
                    "CRIMSON",
                    crimsonWords[index],
                    new Vector3(xPositions[3 - index], 0.24f, 5.25f),
                    crimsonMaterial,
                    index));
            }

            allBodies.AddRange(bluefin);
            allBodies.AddRange(crimson);

            GameObject lineObject = new GameObject("TB Launch Route");
            lineObject.transform.SetParent(worldRoot.transform, false);
            aimLine = lineObject.AddComponent<LineRenderer>();
            aimLine.positionCount = 2;
            aimLine.startWidth = 0.075f;
            aimLine.endWidth = 0.025f;
            aimLine.sharedMaterial = powerMaterial;
            aimLine.enabled = false;

            SelectCrew(0);
            ShowBanner("PICK YOUR 4T · PROVE YOUR FORTY", 2.1f);
        }

        private void CreateBoardStripe(Vector3 position, Vector3 scale)
        {
            JMRuntimeFactory.CreatePrimitive(
                "Board Route",
                PrimitiveType.Cube,
                position,
                scale,
                powerMaterial,
                worldRoot.transform);
        }

        private void CreateBumper(string displayName, Vector3 position, Vector3 scale)
        {
            GameObject bumper = JMRuntimeFactory.CreatePrimitive(
                displayName,
                PrimitiveType.Cylinder,
                position,
                scale,
                bumperMaterial,
                worldRoot.transform);
            bumper.tag = "Respawn";
        }

        private void CreateHoldHazard()
        {
            GameObject hazard = JMRuntimeFactory.CreatePrimitive(
                "Hold Hazard",
                PrimitiveType.Cylinder,
                new Vector3(0f, 0.15f, 0f),
                new Vector3(1.05f, 0.16f, 1.05f),
                hazardMaterial,
                worldRoot.transform);
            Collider collider = hazard.GetComponent<Collider>();
            if (collider != null)
            {
                collider.isTrigger = true;
            }
            TBSlowHazard slow = hazard.AddComponent<TBSlowHazard>();
            slow.Initialize(this, 0.93f);
        }

        private TBCoreTarget CreateCore(string displayName, string teamId, Vector3 position, Material material)
        {
            GameObject core = JMRuntimeFactory.CreatePrimitive(
                displayName,
                PrimitiveType.Cylinder,
                position,
                new Vector3(1.45f, 0.52f, 1.12f),
                material,
                worldRoot.transform);
            TBCoreTarget target = core.AddComponent<TBCoreTarget>();
            target.Initialize(this, teamId, 100f);
            return target;
        }

        private TBBody CreateBody(
            string characterId,
            string teamId,
            string movementWord,
            Vector3 position,
            Material material,
            int index)
        {
            Color tint = teamId == "BLUEFIN"
                ? Color.Lerp(new Color(0.05f, 0.35f, 0.92f), new Color(0.25f, 0.93f, 1f), index / 3f)
                : Color.Lerp(new Color(0.78f, 0.04f, 0.12f), new Color(1f, 0.42f, 0.15f), index / 3f);
            Material bodyMaterial = JMRuntimeFactory.CreateMaterial("TB_" + characterId, tint, 0.16f, 0.72f);

            GameObject bodyObject = JMRuntimeFactory.CreatePrimitive(
                characterId + " · " + movementWord,
                PrimitiveType.Cylinder,
                position,
                new Vector3(0.72f, 0.20f, 0.72f),
                bodyMaterial,
                worldRoot.transform);
            Rigidbody rigidbody = JMRuntimeFactory.AddRigidbody(
                bodyObject,
                movementWord == "BRACE" || movementWord == "BLOCK" ? 2.35f : 1f,
                movementWord == "BRACE" || movementWord == "BLOCK" ? 1.0f : 0.45f,
                1.8f,
                false);
            rigidbody.constraints = RigidbodyConstraints.FreezePositionY
                | RigidbodyConstraints.FreezeRotationX
                | RigidbodyConstraints.FreezeRotationZ;

            TBBody body = bodyObject.AddComponent<TBBody>();
            body.Initialize(
                this,
                characterId,
                teamId,
                movementWord,
                position,
                rigidbody.mass,
                rigidbody.linearDamping);
            return body;
        }

        private void ProcessContacts()
        {
            foreach (JMContact contact in contacts)
            {
                if (contact.position.y < 132f)
                {
                    continue;
                }

                if (contact.phase == JMContactPhase.Began)
                {
                    TBBody hitBody = RaycastBody(contact.position);
                    if (hitBody != null && hitBody.TeamId == "BLUEFIN")
                    {
                        int index = bluefin.IndexOf(hitBody);
                        if (index >= 0)
                        {
                            bool wasSelected = index == selectedIndex;
                            SelectCrew(index);
                            if (wasSelected && turnState == 0)
                            {
                                aimContactId = contact.id;
                                BeginAim(contact.position);
                            }
                        }
                        continue;
                    }

                    if (turnState == 0 && aimContactId == int.MinValue)
                    {
                        aimContactId = contact.id;
                        BeginAim(contact.position);
                    }
                }
                else if (contact.id == aimContactId)
                {
                    if (contact.phase == JMContactPhase.Ended)
                    {
                        UpdateAim(contact.position);
                        ReleaseLaunch();
                        aimContactId = int.MinValue;
                    }
                    else if (contact.phase == JMContactPhase.Canceled)
                    {
                        CancelAim();
                        aimContactId = int.MinValue;
                    }
                    else
                    {
                        UpdateAim(contact.position);
                    }
                }
            }
        }

        private void ProcessKeyboard()
        {
            if (JMContactReader.WasKeyPressed(JMIntentType.PowerTrigger))
            {
                Trigger4TPower();
            }
            if (JMContactReader.WasKeyPressed(JMIntentType.Reset))
            {
                RequestReset("keyboard reset");
            }
        }

        private TBBody RaycastBody(Vector2 screenPosition)
        {
            if (sceneCamera == null)
            {
                return null;
            }

            Ray ray = sceneCamera.ScreenPointToRay(screenPosition);
            return Physics.Raycast(ray, out RaycastHit hit, 100f)
                ? hit.collider.GetComponentInParent<TBBody>()
                : null;
        }

        private void SelectCrew(int index)
        {
            if (bluefin.Count == 0)
            {
                return;
            }

            selectedIndex = Mathf.Clamp(index, 0, bluefin.Count - 1);
            for (int bodyIndex = 0; bodyIndex < bluefin.Count; bodyIndex++)
            {
                bluefin[bodyIndex].SetSelected(bodyIndex == selectedIndex);
            }

            TBBody selected = SelectedBody;
            host?.SubmitIntent(JMGameIntent.Create(
                JMIntentType.CrewSelect,
                text: selected.CharacterId,
                source: "TBProofRuntime"));
            ShowBanner(selected.CharacterId + " · " + selected.MovementWord, 0.55f);
        }

        private void BeginAim(Vector2 screenPosition)
        {
            if (roundResolving || turnState != 0 || SelectedBody == null)
            {
                return;
            }

            aiming = true;
            UpdateAim(screenPosition);
            host?.SubmitIntent(JMGameIntent.Create(
                JMIntentType.AimBegin,
                text: SelectedBody.CharacterId,
                source: "TBProofRuntime"));
        }

        private void UpdateAim(Vector2 screenPosition)
        {
            if (!aiming || sceneCamera == null)
            {
                return;
            }

            Ray ray = sceneCamera.ScreenPointToRay(screenPosition);
            Plane boardPlane = new Plane(Vector3.up, new Vector3(0f, 0.24f, 0f));
            if (boardPlane.Raycast(ray, out float distance))
            {
                Vector3 point = ray.GetPoint(distance);
                aimPoint = new Vector3(
                    Mathf.Clamp(point.x, -4.3f, 4.3f),
                    0.24f,
                    Mathf.Clamp(point.z, -7.8f, 7.8f));
                Vector3 drag = SelectedBody.transform.position - aimPoint;
                host?.SubmitIntent(JMGameIntent.Create(
                    JMIntentType.AimVector,
                    new Vector2(drag.x, drag.z),
                    Mathf.Clamp01(drag.magnitude / 4.8f),
                    SelectedBody.CharacterId,
                    "TBProofRuntime"));
            }
        }

        private void ReleaseLaunch()
        {
            if (!aiming || SelectedBody == null || turnState != 0)
            {
                return;
            }

            aiming = false;
            Vector3 drag = SelectedBody.transform.position - aimPoint;
            float power = Mathf.Clamp01(drag.magnitude / 4.8f);
            if (power < 0.08f)
            {
                CancelAim();
                return;
            }

            Vector3 direction = new Vector3(drag.x, 0f, drag.z).normalized;
            float speed = Mathf.Lerp(4.8f, 12.2f, power);
            if (SelectedBody.MovementWord == "BRACE")
            {
                speed *= 0.82f;
            }
            else if (SelectedBody.MovementWord == "SHOCK")
            {
                speed *= 1.12f;
            }

            host?.SubmitIntent(JMGameIntent.Create(
                JMIntentType.AimRelease,
                new Vector2(direction.x, direction.z),
                power,
                SelectedBody.CharacterId,
                "TBProofRuntime"));

            SelectedBody.Launch(direction * speed, powerArmed);
            usedCrew.Add(SelectedBody.CharacterId);
            host?.TraceBox.Record(
                "JM.TBOYS.4T_CLASH",
                "crew.use.valid",
                SelectedBody.CharacterId + " · " + SelectedBody.MovementWord,
                usedCrew.Count);

            if (!chemistryDinged && usedCrew.Count >= 3)
            {
                chemistryDinged = true;
                ShowBanner("BENCH CHEMISTRY DING", 1.2f);
                host?.TraceBox.Record("JM.TBOYS.4T_CLASH", "challenge.progress", "Bench Chemistry · 3 crew used", 3f);
            }

            if (powerArmed)
            {
                powerArmed = false;
                ShowBanner("4T BURST LAUNCHED", 0.9f);
            }

            turnState = 1;
            aiActionAt = Time.time + 1.05f;
            turnDeadline = Time.time + 5.2f;
        }

        private void CancelAim()
        {
            aiming = false;
            if (aimLine != null)
            {
                aimLine.enabled = false;
            }
            host?.SubmitIntent(JMGameIntent.Create(JMIntentType.AimCancel, source: "TBProofRuntime"));
        }

        private void UpdateAimLine()
        {
            if (aimLine == null)
            {
                return;
            }

            aimLine.enabled = aiming && SelectedBody != null;
            if (!aimLine.enabled)
            {
                return;
            }

            Vector3 start = SelectedBody.transform.position + Vector3.up * 0.34f;
            Vector3 drag = SelectedBody.transform.position - aimPoint;
            Vector3 end = start + new Vector3(drag.x, 0f, drag.z);
            aimLine.SetPosition(0, start);
            aimLine.SetPosition(1, end);
            aimLine.startWidth = Mathf.Lerp(0.04f, 0.13f, Mathf.Clamp01(drag.magnitude / 4.8f));
        }

        private void UpdateTurnGovernor()
        {
            if (roundResolving)
            {
                return;
            }

            if (turnState == 1 && Time.time >= aiActionAt && (AllBodiesSettled() || Time.time >= turnDeadline))
            {
                LaunchRivalAI();
                turnState = 2;
                turnDeadline = Time.time + 5.2f;
            }
            else if (turnState == 2 && (AllBodiesSettled() || Time.time >= turnDeadline))
            {
                turnState = 0;
                ShowBanner("YOUR ROUTE", 0.55f);
            }
        }

        private void LaunchRivalAI()
        {
            if (crimson.Count == 0)
            {
                return;
            }

            TBBody rivalBody = crimson[Random.Range(0, crimson.Count)];
            Vector3 target = bluefinCore.transform.position;
            if (Random.value < 0.42f)
            {
                target += new Vector3(Random.Range(-2.4f, 2.4f), 0f, Random.Range(0.8f, 2.4f));
            }

            Vector3 direction = target - rivalBody.transform.position;
            direction.y = 0f;
            direction = direction.normalized;
            direction = Quaternion.Euler(0f, Random.Range(-8f, 8f), 0f) * direction;
            float speed = Random.Range(6.8f, 10.3f);
            rivalBody.Launch(direction * speed, false);
            host?.TraceBox.Record(
                "JM.TBOYS.4T_CLASH",
                "ai.launch",
                rivalBody.CharacterId + " · " + rivalBody.MovementWord,
                speed,
                new Vector2(direction.x, direction.z));
            ShowBanner("RIVAL: " + rivalBody.CharacterId, 0.65f);
        }

        private bool AllBodiesSettled()
        {
            foreach (TBBody body in allBodies)
            {
                if (!body.IsSettled)
                {
                    return false;
                }
            }
            return true;
        }

        private void RecoverEscapedBodies()
        {
            foreach (TBBody body in allBodies)
            {
                Vector3 position = body.transform.position;
                if (Mathf.Abs(position.x) > 6.2f || Mathf.Abs(position.z) > 9.3f)
                {
                    body.ResetToHome();
                    host?.TraceBox.Record("JM.TBOYS.4T_CLASH", "body.recovered", body.CharacterId);
                }
            }
        }

        public void RegisterArenaContact(TBBody body, string contactType, float force)
        {
            adapter?.RegisterArenaContact(contactType);
            host?.TraceBox.Record(
                "JM.TBOYS.4T_CLASH",
                "arena.contact",
                body.CharacterId + " · " + contactType,
                force);

            if (contactType == "BUMPER" && body.TeamId == "BLUEFIN")
            {
                ShowBanner(body.CharacterId + " BOUNCE ROUTE", 0.55f);
            }
        }

        public void RegisterBodyContact(TBBody source, TBBody target, float force)
        {
            host?.TraceBox.Record(
                "JM.TBOYS.4T_CLASH",
                "body.contact",
                source.CharacterId + " → " + target.CharacterId,
                force);
        }

        public void RegisterCoreDamage(TBCoreTarget target, TBBody attacker, float damage)
        {
            adapter?.RegisterCoreDamage(Mathf.RoundToInt(damage));
            host?.TraceBox.Record(
                "JM.TBOYS.4T_CLASH",
                "core.damage",
                attacker.CharacterId + " → " + target.TeamId,
                damage);
            ShowBanner(target.TeamId + " CORE " + target.CurrentHealth.ToString("0"), 0.75f);

            if (target.CurrentHealth <= 0f && !roundResolving)
            {
                roundResolving = true;
                if (target.TeamId == "CRIMSON")
                {
                    playerRounds++;
                    ShowBanner("BLUEFIN ROUND", 1.4f);
                }
                else
                {
                    rivalRounds++;
                    ShowBanner("CRIMSON ROUND", 1.4f);
                }
                StartCoroutine(ResolveRound());
            }
        }

        private IEnumerator ResolveRound()
        {
            yield return new WaitForSeconds(1.65f);
            if (playerRounds >= 2 || rivalRounds >= 2)
            {
                string winner = playerRounds >= 2 ? "PROVE YOUR FORTY · BLUEFIN" : "CRIMSON CLAIMS THE BOARD";
                host?.TraceBox.Record("JM.TBOYS.4T_CLASH", "match.end", winner);
                ShowBanner(winner, 2f);
                yield return new WaitForSeconds(1.15f);
                playerRounds = 0;
                rivalRounds = 0;
            }
            RequestReset("round recovery");
        }

        private void Trigger4TPower()
        {
            if (turnState != 0 || roundResolving)
            {
                return;
            }

            if (usedCrew.Count < 4)
            {
                host?.SubmitIntent(JMGameIntent.Create(JMIntentType.PowerTrigger, value: usedCrew.Count, text: "HOLD", source: "TBProofRuntime"));
                ShowBanner("4T NEEDS ALL FOUR · " + usedCrew.Count + "/4", 0.8f);
                return;
            }

            powerArmed = true;
            host?.SubmitIntent(JMGameIntent.Create(JMIntentType.PowerTrigger, value: 4f, text: "ARMED", source: "TBProofRuntime"));
            usedCrew.Clear();
            ShowBanner("4T BURST ARMED", 1.0f);
        }

        private void RequestReset(string reason)
        {
            if (!gameObject.activeInHierarchy)
            {
                return;
            }
            StopAllCoroutines();
            StartCoroutine(RebuildWorld(reason));
        }

        private IEnumerator RebuildWorld(string reason)
        {
            roundResolving = true;
            host?.TraceBox.Record("JM.TBOYS.4T_CLASH", "round.reset", reason);
            if (worldRoot != null)
            {
                Destroy(worldRoot);
            }
            yield return null;
            BuildWorld();
        }

        private void ShowBanner(string text, float duration)
        {
            banner = text;
            bannerUntil = Time.time + duration;
        }

        private void OnGUI()
        {
            float scale = Mathf.Clamp(Screen.width / 900f, 0.72f, 1.15f);
            GUIStyle titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = Mathf.RoundToInt(24f * scale),
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.UpperCenter,
                normal = { textColor = new Color(0.40f, 0.94f, 1f) }
            };
            GUIStyle hudStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = Mathf.RoundToInt(16f * scale),
                fontStyle = FontStyle.Bold,
                normal = { textColor = Color.white }
            };
            GUIStyle helpStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = Mathf.RoundToInt(13f * scale),
                alignment = TextAnchor.MiddleCenter,
                wordWrap = true,
                normal = { textColor = new Color(0.82f, 0.91f, 1f) }
            };
            GUIStyle buttonStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = Mathf.RoundToInt(14f * scale),
                fontStyle = FontStyle.Bold
            };

            GUI.Box(new Rect(10f, 10f, Screen.width - 20f, 82f * scale), GUIContent.none);
            GUI.Label(new Rect(18f, 14f, Screen.width - 36f, 31f * scale), "T-BOYS: 4T CLASH · CORE SEASON PROOF", titleStyle);
            GUI.Label(new Rect(20f, 49f * scale, Screen.width * 0.48f, 28f * scale), $"BLUEFIN CORE {bluefinCore?.CurrentHealth ?? 0f:0} · {playerRounds}", hudStyle);
            GUI.Label(new Rect(Screen.width * 0.53f, 49f * scale, Screen.width * 0.44f, 28f * scale), $"CRIMSON CORE {crimsonCore?.CurrentHealth ?? 0f:0} · {rivalRounds}", hudStyle);

            GUI.Box(new Rect(12f, 94f * scale, Screen.width - 24f, 36f * scale), GUIContent.none);
            string turn = turnState == 0 ? "YOUR ROUTE" : turnState == 1 ? "FIELD MOVING" : "RIVAL ROUTE";
            GUI.Label(
                new Rect(20f, 98f * scale, Screen.width - 40f, 28f * scale),
                $"BENCH CHEMISTRY {Mathf.Min(usedCrew.Count, 3)}/3 · 4T {usedCrew.Count}/4 · {turn}",
                helpStyle);

            float buttonY = Screen.height - 77f * scale;
            float gap = 5f;
            float buttonWidth = (Screen.width - 20f - gap * 5f) / 6f;
            for (int index = 0; index < 4; index++)
            {
                string label = bluefin.Count > index
                    ? bluefin[index].CharacterId + "\n" + bluefin[index].MovementWord
                    : "T" + (index + 1);
                if (GUI.Button(new Rect(10f + (buttonWidth + gap) * index, buttonY, buttonWidth, 61f * scale), label, buttonStyle))
                {
                    SelectCrew(index);
                }
            }

            if (GUI.Button(new Rect(10f + (buttonWidth + gap) * 4f, buttonY, buttonWidth, 61f * scale), powerArmed ? "4T\nARMED" : "4T\nPOWER", buttonStyle))
            {
                Trigger4TPower();
            }
            if (GUI.Button(new Rect(10f + (buttonWidth + gap) * 5f, buttonY, buttonWidth, 61f * scale), "RESET", buttonStyle))
            {
                RequestReset("onscreen reset");
            }

            GUI.Box(new Rect(12f, Screen.height - 128f * scale, Screen.width - 24f, 42f * scale), GUIContent.none);
            GUI.Label(
                new Rect(18f, Screen.height - 125f * scale, Screen.width - 36f, 36f * scale),
                "TAP A T-BOY · TOUCH / DRAG BACK · REFINE ROUTE · RELEASE · USE ALL FOUR TO ARM 4T",
                helpStyle);

            if (Time.time < bannerUntil)
            {
                GUI.Box(new Rect(Screen.width * 0.20f, Screen.height * 0.18f, Screen.width * 0.60f, 66f * scale), GUIContent.none);
                GUI.Label(new Rect(Screen.width * 0.20f, Screen.height * 0.18f + 12f, Screen.width * 0.60f, 44f * scale), banner, titleStyle);
            }
        }
    }
}
