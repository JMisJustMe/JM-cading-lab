using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace JM.AdvancedGenerator.WesternSniper
{
    public sealed class WSProofRuntime : MonoBehaviour
    {
        private readonly List<JMContact> contacts = new List<JMContact>(8);

        private JMGameHost host;
        private WesternSniperAdapter adapter;
        private Camera sceneCamera;
        private GameObject worldRoot;
        private Transform player;
        private Transform rival;
        private Collider playerCollider;
        private Collider rivalCollider;
        private LineRenderer aimLine;
        private Material playerMaterial;
        private Material rivalMaterial;
        private Material timberMaterial;
        private Material stoneMaterial;
        private Material metalMaterial;
        private Material bulletMaterial;
        private Material rivalBulletMaterial;

        private int moveContactId = int.MinValue;
        private int aimContactId = int.MinValue;
        private float touchMoveAxis;
        private bool aiming;
        private Vector3 aimPoint;
        private float aimStartedAt;
        private float playerHealth = 100f;
        private float rivalHealth = 100f;
        private string weapon = "RIFLE";
        private bool peeking;
        private float dodgeReadyAt;
        private float rivalShotAt;
        private bool roundResolving;
        private int playerRounds;
        private int rivalRounds;
        private string banner = "DUSTFALL · FIRST TO TWO";
        private float bannerUntil;

        public string Weapon => weapon;

        private void Start()
        {
            host = GetComponent<JMGameHost>();
            adapter = GetComponent<WesternSniperAdapter>();

            GameObject marker = GameObject.Find("JM_PROOF_MARKER_REPLACE_WITH_GAME_BODY");
            if (marker != null)
            {
                Destroy(marker);
            }

            ConfigureCamera();
            BuildRoundWorld();
            host?.TraceBox.Record("JM.WESTERN_SNIPER.PVP", "proof.runtime.boot", "Dustfall playable 3D slice");
        }

        private void Update()
        {
            if (worldRoot == null || player == null || rival == null)
            {
                return;
            }

            JMContactReader.Read(contacts);
            ProcessContacts();
            ProcessKeyboardAndButtons();
            MovePlayer();
            UpdateAimLine();
            UpdateRivalAI();
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

            sceneCamera.transform.position = new Vector3(0f, 5.3f, -17.5f);
            sceneCamera.transform.LookAt(new Vector3(0f, 1.35f, 0f));
            sceneCamera.fieldOfView = 41f;
            sceneCamera.nearClipPlane = 0.1f;
            sceneCamera.farClipPlane = 120f;
            sceneCamera.clearFlags = CameraClearFlags.SolidColor;
            sceneCamera.backgroundColor = new Color(0.055f, 0.026f, 0.014f, 1f);
        }

        private void BuildRoundWorld()
        {
            playerHealth = 100f;
            rivalHealth = 100f;
            aiming = false;
            peeking = false;
            roundResolving = false;
            touchMoveAxis = 0f;
            moveContactId = int.MinValue;
            aimContactId = int.MinValue;

            worldRoot = new GameObject("WS_DUSTFALL_RUNTIME_WORLD");

            playerMaterial = JMRuntimeFactory.CreateMaterial("WS_Longshot", new Color(0.96f, 0.71f, 0.18f), 0.15f, 0.42f);
            rivalMaterial = JMRuntimeFactory.CreateMaterial("WS_Rival", new Color(0.80f, 0.20f, 0.12f), 0.10f, 0.36f);
            timberMaterial = JMRuntimeFactory.CreateMaterial("WS_Timber", new Color(0.43f, 0.20f, 0.08f), 0f, 0.20f);
            stoneMaterial = JMRuntimeFactory.CreateMaterial("WS_Stone", new Color(0.34f, 0.30f, 0.27f), 0f, 0.18f);
            metalMaterial = JMRuntimeFactory.CreateMaterial("WS_Metal", new Color(0.28f, 0.34f, 0.38f), 0.82f, 0.72f);
            bulletMaterial = JMRuntimeFactory.CreateMaterial("WS_PlayerBullet", new Color(1f, 0.88f, 0.28f), 0.25f, 0.8f);
            rivalBulletMaterial = JMRuntimeFactory.CreateMaterial("WS_RivalBullet", new Color(1f, 0.24f, 0.12f), 0.18f, 0.72f);

            Material groundMaterial = JMRuntimeFactory.CreateMaterial("WS_Dust", new Color(0.22f, 0.095f, 0.035f), 0f, 0.10f);
            Material backdropMaterial = JMRuntimeFactory.CreateMaterial("WS_Backdrop", new Color(0.12f, 0.045f, 0.018f), 0f, 0.08f);

            JMRuntimeFactory.CreatePrimitive(
                "Dustfall Ground",
                PrimitiveType.Cube,
                new Vector3(0f, -0.28f, 0f),
                new Vector3(20f, 0.5f, 6.5f),
                groundMaterial,
                worldRoot.transform);

            JMRuntimeFactory.CreatePrimitive(
                "Dustfall Back Wall",
                PrimitiveType.Cube,
                new Vector3(0f, 2.15f, 2.7f),
                new Vector3(20f, 4.8f, 0.35f),
                backdropMaterial,
                worldRoot.transform);

            for (int index = -4; index <= 4; index++)
            {
                float height = 1.2f + Mathf.Abs(index % 3) * 0.55f;
                JMRuntimeFactory.CreatePrimitive(
                    "Dustfall Building " + index,
                    PrimitiveType.Cube,
                    new Vector3(index * 2.1f, height * 0.5f, 2.35f),
                    new Vector3(1.55f, height, 0.55f),
                    index % 2 == 0 ? stoneMaterial : timberMaterial,
                    worldRoot.transform);
            }

            player = CreateFighter("Longshot", new Vector3(-7.5f, 0.95f, -0.34f), playerMaterial, "PLAYER", out playerCollider);
            rival = CreateFighter("Rival Quickhand", new Vector3(7.5f, 0.95f, 0.15f), rivalMaterial, "RIVAL", out rivalCollider);

            CreateCover("Player Timber", new Vector3(-4.6f, 0.72f, -0.15f), new Vector3(1.15f, 1.45f, 1.0f), timberMaterial, WSCoverMaterial.Timber, 90f);
            CreateCover("Player Metal", new Vector3(-2.55f, 0.58f, 0.58f), new Vector3(0.90f, 1.15f, 0.55f), metalMaterial, WSCoverMaterial.Metal, 125f);
            CreateCover("Rival Timber", new Vector3(4.6f, 0.72f, 0.15f), new Vector3(1.15f, 1.45f, 1.0f), timberMaterial, WSCoverMaterial.Timber, 90f);
            CreateCover("Rival Stone", new Vector3(2.55f, 0.62f, -0.48f), new Vector3(1.05f, 1.25f, 0.75f), stoneMaterial, WSCoverMaterial.Stone, 145f);

            JMRuntimeFactory.AddBoundary("Left Boundary", new Vector3(-10.3f, 2f, 0f), new Vector3(0.3f, 5f, 7f), worldRoot.transform);
            JMRuntimeFactory.AddBoundary("Right Boundary", new Vector3(10.3f, 2f, 0f), new Vector3(0.3f, 5f, 7f), worldRoot.transform);
            JMRuntimeFactory.AddBoundary("Back Boundary", new Vector3(0f, 2f, 3.2f), new Vector3(21f, 5f, 0.3f), worldRoot.transform);
            JMRuntimeFactory.AddBoundary("Front Boundary", new Vector3(0f, 2f, -3.2f), new Vector3(21f, 5f, 0.3f), worldRoot.transform);

            GameObject lineObject = new GameObject("WS Aim Route");
            lineObject.transform.SetParent(worldRoot.transform, false);
            aimLine = lineObject.AddComponent<LineRenderer>();
            aimLine.positionCount = 2;
            aimLine.startWidth = 0.045f;
            aimLine.endWidth = 0.018f;
            aimLine.sharedMaterial = bulletMaterial;
            aimLine.enabled = false;

            rivalShotAt = Time.time + 2.2f;
            ShowBanner("DUSTFALL · DRAW YOUR ROUTE", 2f);
        }

        private Transform CreateFighter(
            string displayName,
            Vector3 position,
            Material material,
            string fighterId,
            out Collider bodyCollider)
        {
            GameObject body = JMRuntimeFactory.CreatePrimitive(
                displayName,
                PrimitiveType.Capsule,
                position,
                new Vector3(0.72f, 1.05f, 0.72f),
                material,
                worldRoot.transform);

            bodyCollider = body.GetComponent<Collider>();
            WSFighterHitbox hitbox = body.AddComponent<WSFighterHitbox>();
            hitbox.Initialize(this, fighterId);

            GameObject hat = JMRuntimeFactory.CreatePrimitive(
                displayName + " Hat",
                PrimitiveType.Cylinder,
                position + new Vector3(0f, 1.03f, 0f),
                new Vector3(0.56f, 0.10f, 0.56f),
                material,
                body.transform);
            hat.transform.localPosition = new Vector3(0f, 0.97f, 0f);

            return body.transform;
        }

        private void CreateCover(
            string displayName,
            Vector3 position,
            Vector3 scale,
            Material material,
            WSCoverMaterial kind,
            float health)
        {
            GameObject cover = JMRuntimeFactory.CreatePrimitive(
                displayName,
                PrimitiveType.Cube,
                position,
                scale,
                material,
                worldRoot.transform);
            WSDestructibleCover body = cover.AddComponent<WSDestructibleCover>();
            body.Initialize(this, kind, health);
        }

        private void ProcessContacts()
        {
            foreach (JMContact contact in contacts)
            {
                bool leftZone = contact.position.x < Screen.width * 0.43f;

                if (contact.phase == JMContactPhase.Began)
                {
                    if (leftZone && moveContactId == int.MinValue)
                    {
                        moveContactId = contact.id;
                        UpdateTouchMove(contact.position);
                    }
                    else if (aimContactId == int.MinValue)
                    {
                        aimContactId = contact.id;
                        BeginAim(contact.position);
                    }
                }
                else if (contact.id == moveContactId)
                {
                    if (contact.phase == JMContactPhase.Ended || contact.phase == JMContactPhase.Canceled)
                    {
                        moveContactId = int.MinValue;
                        touchMoveAxis = 0f;
                    }
                    else
                    {
                        UpdateTouchMove(contact.position);
                    }
                }
                else if (contact.id == aimContactId)
                {
                    if (contact.phase == JMContactPhase.Ended)
                    {
                        UpdateAim(contact.position);
                        ReleasePlayerShot();
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

        private void ProcessKeyboardAndButtons()
        {
            if (JMContactReader.WasKeyPressed(JMIntentType.WeaponSwap))
            {
                ToggleWeapon();
            }
            if (JMContactReader.WasKeyPressed(JMIntentType.Dodge))
            {
                Dodge();
            }
            if (JMContactReader.WasKeyPressed(JMIntentType.PeekBegin))
            {
                TogglePeek();
            }
            if (JMContactReader.WasKeyPressed(JMIntentType.Reset))
            {
                RequestRoundReset("manual reset");
            }
        }

        private void UpdateTouchMove(Vector2 position)
        {
            float normalized = Mathf.Clamp01(position.x / Mathf.Max(1f, Screen.width * 0.43f));
            touchMoveAxis = normalized * 2f - 1f;
        }

        private void MovePlayer()
        {
            if (roundResolving)
            {
                return;
            }

            float keyboardAxis = JMContactReader.ReadHorizontalAxis();
            float axis = Mathf.Abs(keyboardAxis) > 0.05f ? keyboardAxis : touchMoveAxis;
            Vector3 position = player.position;
            position.x = Mathf.Clamp(position.x + axis * 3.2f * Time.deltaTime, -8.4f, -0.85f);
            position.z = Mathf.MoveTowards(position.z, peeking ? 0.62f : -0.38f, Time.deltaTime * 3.8f);
            player.position = position;

            if (Mathf.Abs(axis) > 0.05f)
            {
                host?.SubmitIntent(JMGameIntent.Create(JMIntentType.MoveAxis, new Vector2(axis, 0f), Mathf.Abs(axis), source: "WSProofRuntime"));
            }
        }

        private void BeginAim(Vector2 screenPosition)
        {
            if (roundResolving)
            {
                return;
            }

            aiming = true;
            aimStartedAt = Time.time;
            UpdateAim(screenPosition);
            host?.SubmitIntent(JMGameIntent.Create(JMIntentType.AimBegin, source: "WSProofRuntime"));
        }

        private void UpdateAim(Vector2 screenPosition)
        {
            if (!aiming || sceneCamera == null)
            {
                return;
            }

            Ray ray = sceneCamera.ScreenPointToRay(screenPosition);
            Plane duelPlane = new Plane(Vector3.forward, Vector3.zero);
            if (duelPlane.Raycast(ray, out float distance))
            {
                Vector3 point = ray.GetPoint(distance);
                aimPoint = new Vector3(
                    Mathf.Clamp(point.x, -9.4f, 9.4f),
                    Mathf.Clamp(point.y, 0.20f, 5.4f),
                    0f);
                host?.SubmitIntent(JMGameIntent.Create(
                    JMIntentType.AimAdjust,
                    new Vector2(aimPoint.x, aimPoint.y),
                    CurrentAimPower(),
                    source: "WSProofRuntime"));
            }
        }

        private void CancelAim()
        {
            aiming = false;
            if (aimLine != null)
            {
                aimLine.enabled = false;
            }
            host?.SubmitIntent(JMGameIntent.Create(JMIntentType.AimCancel, source: "WSProofRuntime"));
        }

        private void ReleasePlayerShot()
        {
            if (!aiming || roundResolving)
            {
                return;
            }

            aiming = false;
            float power = CurrentAimPower();
            Vector3 muzzle = player.position + new Vector3(0.58f, 0.38f, 0f);
            Vector3 direction = (aimPoint - muzzle).normalized;

            if (weapon == "REVOLVER")
            {
                direction = Quaternion.Euler(0f, 0f, Random.Range(-3.8f, 3.8f)) * direction;
            }

            host?.SubmitIntent(JMGameIntent.Create(
                JMIntentType.AimRelease,
                new Vector2(direction.x, direction.y),
                power,
                weapon,
                "WSProofRuntime"));

            SpawnProjectile(
                "PLAYER",
                weapon,
                playerCollider,
                muzzle,
                direction,
                weapon == "RIFLE" ? Mathf.Lerp(17f, 24f, power) : Mathf.Lerp(14f, 19f, power),
                weapon == "RIFLE" ? Mathf.Lerp(31f, 46f, power) : Mathf.Lerp(18f, 27f, power),
                weapon == "RIFLE" ? 1 : 0,
                bulletMaterial);
        }

        private float CurrentAimPower()
        {
            return Mathf.Clamp01((Time.time - aimStartedAt) / 1.15f);
        }

        private void UpdateAimLine()
        {
            if (aimLine == null)
            {
                return;
            }

            aimLine.enabled = aiming;
            if (!aiming)
            {
                return;
            }

            Vector3 muzzle = player.position + new Vector3(0.58f, 0.38f, 0f);
            aimLine.SetPosition(0, muzzle);
            aimLine.SetPosition(1, aimPoint);
            float width = Mathf.Lerp(0.025f, 0.09f, CurrentAimPower());
            aimLine.startWidth = width;
        }

        private void UpdateRivalAI()
        {
            if (roundResolving || Time.time < rivalShotAt)
            {
                return;
            }

            Vector3 rivalPosition = rival.position;
            rivalPosition.x = Mathf.Clamp(rivalPosition.x + Random.Range(-0.9f, 0.9f), 1.0f, 8.4f);
            rival.position = rivalPosition;

            string rivalWeapon = Random.value < 0.48f ? "RIFLE" : "REVOLVER";
            Vector3 muzzle = rival.position + new Vector3(-0.58f, 0.38f, 0f);
            Vector3 target = player.position + new Vector3(0f, Random.Range(0.0f, 0.8f), 0f);
            Vector3 direction = (target - muzzle).normalized;
            direction = Quaternion.Euler(0f, 0f, Random.Range(-4.2f, 4.2f)) * direction;

            SpawnProjectile(
                "RIVAL",
                rivalWeapon,
                rivalCollider,
                muzzle,
                direction,
                rivalWeapon == "RIFLE" ? 19f : 16f,
                rivalWeapon == "RIFLE" ? 36f : 22f,
                rivalWeapon == "RIFLE" ? 1 : 0,
                rivalBulletMaterial);

            host?.TraceBox.Record("JM.WESTERN_SNIPER.PVP", "ai.shot", rivalWeapon, 0f, direction);
            rivalShotAt = Time.time + Random.Range(2.0f, 3.25f);
        }

        private void SpawnProjectile(
            string shooterId,
            string weaponId,
            Collider shooterCollider,
            Vector3 position,
            Vector3 direction,
            float speed,
            float damage,
            int ricochets,
            Material material)
        {
            GameObject projectile = JMRuntimeFactory.CreatePrimitive(
                shooterId + " " + weaponId + " projectile",
                PrimitiveType.Sphere,
                position,
                Vector3.one * (weaponId == "RIFLE" ? 0.12f : 0.15f),
                material,
                worldRoot.transform);
            Rigidbody body = JMRuntimeFactory.AddRigidbody(projectile, 0.08f, 0.02f, 0.02f, true);
            body.linearVelocity = direction * speed;
            WSProjectile projectileBody = projectile.AddComponent<WSProjectile>();
            projectileBody.Initialize(this, shooterId, weaponId, shooterCollider, body.linearVelocity, damage, ricochets);
        }

        public void ApplyFighterDamage(
            string fighterId,
            float damage,
            Vector3 hitPoint,
            string weaponId)
        {
            if (roundResolving)
            {
                return;
            }

            if (fighterId == "PLAYER")
            {
                playerHealth = Mathf.Max(0f, playerHealth - damage);
            }
            else
            {
                rivalHealth = Mathf.Max(0f, rivalHealth - damage);
            }

            adapter?.RegisterFighterContact(damage);
            host?.TraceBox.Record(
                "JM.WESTERN_SNIPER.PVP",
                "fighter.damage",
                fighterId + " · " + weaponId,
                damage,
                new Vector2(hitPoint.x, hitPoint.y));

            ShowBanner(fighterId == "PLAYER" ? "YOU WERE TAGGED" : "CONTACT", 0.7f);

            if (playerHealth <= 0f || rivalHealth <= 0f)
            {
                roundResolving = true;
                if (rivalHealth <= 0f)
                {
                    playerRounds++;
                    ShowBanner("PLAYER ROUND", 1.6f);
                }
                else
                {
                    rivalRounds++;
                    ShowBanner("RIVAL ROUND", 1.6f);
                }
                StartCoroutine(ResolveRound());
            }
        }

        public void RegisterCoverDamage(
            WSDestructibleCover cover,
            float damage,
            Vector3 hitPoint)
        {
            adapter?.RegisterCoverContact(damage);
            host?.TraceBox.Record(
                "JM.WESTERN_SNIPER.PVP",
                "cover.damage",
                cover.name + " · " + cover.MaterialKind,
                damage,
                new Vector2(hitPoint.x, hitPoint.y));
        }

        public void RegisterCoverBroken(WSDestructibleCover cover)
        {
            host?.TraceBox.Record("JM.WESTERN_SNIPER.PVP", "cover.broken", cover.name);
            ShowBanner("COVER BROKEN", 0.8f);
        }

        public void RegisterProjectileContact(
            string shooterId,
            string contactType,
            string weaponId,
            Vector3 point,
            Vector3 velocity)
        {
            host?.TraceBox.Record(
                "JM.WESTERN_SNIPER.PVP",
                "projectile.contact",
                shooterId + " · " + weaponId + " · " + contactType,
                velocity.magnitude,
                new Vector2(point.x, point.y));
        }

        public void RegisterRicochet(
            string shooterId,
            string weaponId,
            Vector3 point,
            Vector3 velocity)
        {
            host?.TraceBox.Record(
                "JM.WESTERN_SNIPER.PVP",
                "projectile.ricochet",
                shooterId + " · " + weaponId,
                velocity.magnitude,
                new Vector2(point.x, point.y));
            ShowBanner("RICOCHET", 0.55f);
        }

        public void RegisterProjectileResolved(
            string shooterId,
            string weaponId,
            string reason,
            Vector3 point)
        {
            host?.TraceBox.Record(
                "JM.WESTERN_SNIPER.PVP",
                "projectile.resolved",
                shooterId + " · " + weaponId + " · " + reason,
                0f,
                new Vector2(point.x, point.y));
        }

        public void SpawnCoverDebris(
            WSDestructibleCover cover,
            Vector3 hitPoint,
            Vector3 incomingVelocity)
        {
            Material material = cover.MaterialKind == WSCoverMaterial.Timber
                ? timberMaterial
                : cover.MaterialKind == WSCoverMaterial.Stone ? stoneMaterial : metalMaterial;

            for (int index = 0; index < 7; index++)
            {
                GameObject debris = JMRuntimeFactory.CreatePrimitive(
                    cover.name + " debris " + index,
                    PrimitiveType.Cube,
                    hitPoint + Random.insideUnitSphere * 0.28f,
                    Vector3.one * Random.Range(0.12f, 0.28f),
                    material,
                    worldRoot.transform);
                Rigidbody body = JMRuntimeFactory.AddRigidbody(debris, 0.08f, 0.08f, 0.18f, true);
                body.linearVelocity = incomingVelocity.normalized * Random.Range(1.2f, 3.8f) + Random.insideUnitSphere * 2.8f;
                body.angularVelocity = Random.insideUnitSphere * 8f;
                Destroy(debris, 2.8f);
            }
        }

        private IEnumerator ResolveRound()
        {
            yield return new WaitForSeconds(1.8f);

            if (playerRounds >= 2 || rivalRounds >= 2)
            {
                string winner = playerRounds >= 2 ? "MATCH: PLAYER" : "MATCH: RIVAL";
                host?.TraceBox.Record("JM.WESTERN_SNIPER.PVP", "match.end", winner);
                ShowBanner(winner, 2f);
                yield return new WaitForSeconds(1.1f);
                playerRounds = 0;
                rivalRounds = 0;
            }

            RequestRoundReset("round recovery");
        }

        private void RequestRoundReset(string reason)
        {
            if (!gameObject.activeInHierarchy)
            {
                return;
            }
            StopAllCoroutines();
            StartCoroutine(RebuildRound(reason));
        }

        private IEnumerator RebuildRound(string reason)
        {
            roundResolving = true;
            host?.TraceBox.Record("JM.WESTERN_SNIPER.PVP", "round.reset", reason);
            if (worldRoot != null)
            {
                Destroy(worldRoot);
            }
            yield return null;
            BuildRoundWorld();
        }

        private void ToggleWeapon()
        {
            weapon = weapon == "RIFLE" ? "REVOLVER" : "RIFLE";
            host?.SubmitIntent(JMGameIntent.Create(JMIntentType.WeaponSwap, text: weapon, source: "WSProofRuntime"));
            ShowBanner(weapon, 0.55f);
        }

        private void Dodge()
        {
            if (Time.time < dodgeReadyAt || roundResolving)
            {
                return;
            }

            dodgeReadyAt = Time.time + 1.45f;
            Vector3 position = player.position;
            position.x = Mathf.Clamp(position.x - 1.25f, -8.4f, -0.85f);
            player.position = position;
            host?.SubmitIntent(JMGameIntent.Create(JMIntentType.Dodge, source: "WSProofRuntime"));
            ShowBanner("DODGE", 0.45f);
        }

        private void TogglePeek()
        {
            peeking = !peeking;
            host?.SubmitIntent(JMGameIntent.Create(
                peeking ? JMIntentType.PeekBegin : JMIntentType.PeekEnd,
                source: "WSProofRuntime"));
            ShowBanner(peeking ? "PEEK" : "COVER", 0.45f);
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
                normal = { textColor = new Color(1f, 0.84f, 0.45f) }
            };
            GUIStyle hudStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = Mathf.RoundToInt(17f * scale),
                fontStyle = FontStyle.Bold,
                normal = { textColor = Color.white }
            };
            GUIStyle helpStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = Mathf.RoundToInt(13f * scale),
                alignment = TextAnchor.MiddleCenter,
                wordWrap = true,
                normal = { textColor = new Color(1f, 0.90f, 0.68f) }
            };
            GUIStyle buttonStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = Mathf.RoundToInt(15f * scale),
                fontStyle = FontStyle.Bold
            };

            GUI.Box(new Rect(10f, 10f, Screen.width - 20f, 78f * scale), GUIContent.none);
            GUI.Label(new Rect(18f, 14f, Screen.width - 36f, 32f * scale), "JM WESTERN SNIPER · DUSTFALL PROOF", titleStyle);
            GUI.Label(new Rect(22f, 49f * scale, Screen.width * 0.44f, 25f * scale), $"PLAYER {playerHealth:0} · ROUNDS {playerRounds}", hudStyle);
            GUI.Label(new Rect(Screen.width * 0.54f, 49f * scale, Screen.width * 0.42f, 25f * scale), $"RIVAL {rivalHealth:0} · ROUNDS {rivalRounds}", hudStyle);

            float buttonY = Screen.height - 74f * scale;
            float gap = 7f;
            float buttonWidth = (Screen.width - 20f - gap * 3f) / 4f;
            if (GUI.Button(new Rect(10f, buttonY, buttonWidth, 58f * scale), weapon, buttonStyle))
            {
                ToggleWeapon();
            }
            if (GUI.Button(new Rect(10f + (buttonWidth + gap), buttonY, buttonWidth, 58f * scale), "DODGE", buttonStyle))
            {
                Dodge();
            }
            if (GUI.Button(new Rect(10f + (buttonWidth + gap) * 2f, buttonY, buttonWidth, 58f * scale), peeking ? "PEEKING" : "PEEK", buttonStyle))
            {
                TogglePeek();
            }
            if (GUI.Button(new Rect(10f + (buttonWidth + gap) * 3f, buttonY, buttonWidth, 58f * scale), "RESET", buttonStyle))
            {
                RequestRoundReset("onscreen reset");
            }

            GUI.Box(new Rect(12f, Screen.height - 126f * scale, Screen.width - 24f, 43f * scale), GUIContent.none);
            GUI.Label(
                new Rect(20f, Screen.height - 122f * scale, Screen.width - 40f, 36f * scale),
                "LEFT SIDE: MOVE · RIGHT SIDE: HOLD / ADJUST / RELEASE · Q WEAPON · SPACE DODGE · E PEEK",
                helpStyle);

            if (Time.time < bannerUntil)
            {
                GUI.Box(new Rect(Screen.width * 0.25f, Screen.height * 0.18f, Screen.width * 0.5f, 64f * scale), GUIContent.none);
                GUI.Label(new Rect(Screen.width * 0.25f, Screen.height * 0.18f + 12f, Screen.width * 0.5f, 42f * scale), banner, titleStyle);
            }
        }
    }
}
