#include "JMTargetBridgeUnreal.h"
bool UJMTargetBridgeUnreal::Dispatch(const FJMEnvelope& E) {
 if (E.SemanticProtocol != TEXT("JM.SemanticOps/0.1")) return false;
 if (E.SemanticAction == TEXT("MOVE")) Move = FVector2D(E.X,E.Y);
 else if (E.SemanticAction == TEXT("AIM")) Aim = E.Value;
 else if (E.SemanticAction == TEXT("FIRE")) Shots++;
 else if (E.SemanticAction == TEXT("PAUSE")) bPaused = !bPaused;
 else if (E.SemanticAction != TEXT("FEEDBACK")) return false;
 LastTrace=E.TraceId; return true;
}
