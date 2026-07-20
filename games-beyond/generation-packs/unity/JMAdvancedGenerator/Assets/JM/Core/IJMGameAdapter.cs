namespace JM.AdvancedGenerator
{
    public interface IJMGameAdapter
    {
        string GameId { get; }
        void Initialize(JMGameHost host);
        void HandleIntent(JMGameIntent intent);
        void Tick(float deltaTime);
        JMProofSnapshot CaptureProof();
    }
}
