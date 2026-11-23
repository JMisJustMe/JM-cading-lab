#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "JMTargetBridgeContactGameMode.generated.h"

UCLASS()
class AJMTargetBridgeContactGameMode : public AGameModeBase {
    GENERATED_BODY()
public:
    virtual void BeginPlay() override;
};
