#include "JMTargetBridgeContactGameMode.h"
#include "JMTargetBridgeHarness.h"
#include "Camera/CameraActor.h"
#include "Kismet/GameplayStatics.h"

void AJMTargetBridgeContactGameMode::BeginPlay() {
    Super::BeginPlay();
    UWorld* World = GetWorld();
    if (!World) return;
    World->SpawnActor<AJMTargetBridgeHarness>(FVector::ZeroVector, FRotator::ZeroRotator);
    ACameraActor* Cam = World->SpawnActor<ACameraActor>(FVector(0.f, -1000.f, 700.f), FRotator(-25.f, 90.f, 0.f));
    if (APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0)) {
        PC->SetViewTarget(Cam);
        PC->bShowMouseCursor = true;
    }
}
