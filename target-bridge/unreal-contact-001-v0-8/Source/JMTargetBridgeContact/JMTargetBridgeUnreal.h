#pragma once
#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "JMTargetBridgeUnreal.generated.h"

USTRUCT(BlueprintType)
struct FJMEnvelope {
 GENERATED_BODY()
 UPROPERTY(BlueprintReadWrite) FString SemanticProtocol;
 UPROPERTY(BlueprintReadWrite) FString SemanticAction;
 UPROPERTY(BlueprintReadWrite) FString Capability;
 UPROPERTY(BlueprintReadWrite) FString TraceId;
 UPROPERTY(BlueprintReadWrite) float X = 0.f;
 UPROPERTY(BlueprintReadWrite) float Y = 0.f;
 UPROPERTY(BlueprintReadWrite) float Value = 0.f;
};

UCLASS(BlueprintType)
class UJMTargetBridgeUnreal : public UObject {
 GENERATED_BODY()
public:
 UPROPERTY(BlueprintReadOnly) FVector2D Move;
 UPROPERTY(BlueprintReadOnly) float Aim = 0.f;
 UPROPERTY(BlueprintReadOnly) int32 Shots = 0;
 UPROPERTY(BlueprintReadOnly) bool bPaused = false;
 UPROPERTY(BlueprintReadOnly) FString LastTrace;
 UFUNCTION(BlueprintCallable) bool Dispatch(const FJMEnvelope& E);
};
