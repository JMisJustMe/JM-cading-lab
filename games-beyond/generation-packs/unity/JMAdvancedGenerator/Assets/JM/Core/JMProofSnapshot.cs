using System;

namespace JM.AdvancedGenerator
{
    [Serializable]
    public sealed class JMProofSnapshot
    {
        public string gameId = string.Empty;
        public string scene = string.Empty;
        public string status = "LIVE";
        public string summary = string.Empty;
        public int intentCount;
        public int contactCount;
        public int scoreA;
        public int scoreB;
        public string createdAtUtc = string.Empty;
    }
}
