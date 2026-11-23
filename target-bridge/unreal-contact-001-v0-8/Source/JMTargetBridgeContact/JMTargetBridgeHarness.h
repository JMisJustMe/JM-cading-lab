#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "JMTargetBridgeHarness.generated.h"

class UStaticMeshComponent;
class UJMTargetBridgeUnreal;

UCLASS()
class AJMTargetBridgeHarness : public AActor {
    GENERATED_BODY()
public:
    AJMTargetBridgeHarness();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
private:
    UPROPERTY() USceneComponent* Root;
    UPROPERTY() UStaticMeshComponent* PlayerMesh;
    UPROPERTY() UStaticMeshComponent* CoinMesh;
    UPROPERTY() UJMTargetBridgeUnreal* Bridge;
    bool bMovementPass = false;
    bool bContactPass = false;
    bool bScorePass = false;
    bool bCoinPass = false;
    bool bFinished = false;
    int32 Score = 0;
    void ShowStatus();
    void SaveReceipt();
};
