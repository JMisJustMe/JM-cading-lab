using System;
using System.IO;
using UnityEngine;

namespace JM.AdvancedGenerator
{
    public sealed class JMProofPanel : MonoBehaviour
    {
        private JMGameHost host;
        private string lastReceipt = "NO RECEIPT EXPORTED";
        private float messageUntil;

        private void Awake()
        {
            host = GetComponent<JMGameHost>();
        }

        public string ExportProof()
        {
            if (host == null)
            {
                lastReceipt = "PROOF BUGG · HOST MISSING";
                messageUntil = Time.time + 2f;
                return string.Empty;
            }

            try
            {
                string folder = Path.Combine(Application.persistentDataPath, "JM-Proof-Receipts");
                Directory.CreateDirectory(folder);
                string safeGameId = Sanitize(host.GameId);
                string fileName = safeGameId + "_" + DateTime.UtcNow.ToString("yyyyMMdd_HHmmss") + ".json";
                string path = Path.Combine(folder, fileName);
                File.WriteAllText(path, host.ExportProofJson(true));
                lastReceipt = "PROOF DING · " + path;
                messageUntil = Time.time + 4f;
                Debug.Log(lastReceipt, this);
                return path;
            }
            catch (Exception exception)
            {
                lastReceipt = "PROOF BUGG · " + exception.Message;
                messageUntil = Time.time + 4f;
                Debug.LogError(lastReceipt, this);
                return string.Empty;
            }
        }

        private static string Sanitize(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "JM_GAME";
            }

            foreach (char invalid in Path.GetInvalidFileNameChars())
            {
                value = value.Replace(invalid, '_');
            }

            return value.Replace('.', '_').Replace(' ', '_');
        }

        private void OnGUI()
        {
            float width = Mathf.Clamp(Screen.width * 0.28f, 138f, 260f);
            float height = 48f;
            Rect buttonRect = new Rect(Screen.width - width - 10f, 122f, width, height);
            if (GUI.Button(buttonRect, "EXPORT PROOF"))
            {
                ExportProof();
            }

            if (Time.time < messageUntil)
            {
                GUI.Box(
                    new Rect(10f, 174f, Screen.width - 20f, 58f),
                    lastReceipt);
            }
        }
    }
}
