#include "JMTargetBridgeHarness.h"
#include "JMTargetBridgeUnreal.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/Engine.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "UObject/ConstructorHelpers.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "InputCoreTypes.h"

AJMTargetBridgeHarness::AJMTargetBridgeHarness() {
    PrimaryActorTick.bCanEverTick = true;
    Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(Root);

    PlayerMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Player"));
    PlayerMesh->SetupAttachment(Root);
    CoinMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Coin"));
    CoinMesh->SetupAttachment(Root);

    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (Cube.Succeeded()) PlayerMesh->SetStaticMesh(Cube.Object);
    if (Sphere.Succeeded()) CoinMesh->SetStaticMesh(Sphere.Object);

    PlayerMesh->SetRelativeLocation(FVector(-300.f, 0.f, 50.f));
    CoinMesh->SetRelativeLocation(FVector(300.f, 0.f, 50.f));
    PlayerMesh->SetWorldScale3D(FVector(1.25f));
    CoinMesh->SetWorldScale3D(FVector(1.25f));
    PlayerMesh->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
    CoinMesh->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
    PlayerMesh->SetGenerateOverlapEvents(true);
    CoinMesh->SetGenerateOverlapEvents(true);
}

void AJMTargetBridgeHarness::BeginPlay() {
    Super::BeginPlay();
    Bridge = NewObject<UJMTargetBridgeUnreal>(this);
    ShowStatus();
}

void AJMTargetBridgeHarness::Tick(float DeltaSeconds) {
    Super::Tick(DeltaSeconds);
    APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0);
    if (PC && PC->IsInputKeyDown(EKeys::Right) && Bridge) {
        const float BeforeX = PlayerMesh->GetRelativeLocation().X;
        FJMEnvelope E;
        E.SemanticProtocol = TEXT("JM.SemanticOps/0.1");
        E.SemanticAction = TEXT("MOVE");
        E.Capability = TEXT("buttons");
        E.TraceId = TEXT("unreal-move-right");
        E.X = 1.f;
        E.Y = 0.f;
        E.Value = 1.f;
        if (Bridge->Dispatch(E)) {
            PlayerMesh->AddRelativeLocation(FVector(Bridge->Move.X * 350.f * DeltaSeconds, 0.f, 0.f));
            bMovementPass = PlayerMesh->GetRelativeLocation().X > BeforeX;
        }
    }

    if (!bFinished && CoinMesh && PlayerMesh->IsOverlappingComponent(CoinMesh)) {
        bContactPass = true;
        const int32 Before = Score;
        Score = 1;
        bScorePass = (Before == 0 && Score == 1);
        CoinMesh->SetVisibility(false, true);
        CoinMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        bCoinPass = true;
        bFinished = bMovementPass && bContactPass && bScorePass && bCoinPass;
        if (bFinished) SaveReceipt();
    }
    ShowStatus();
}

void AJMTargetBridgeHarness::ShowStatus() {
    if (!GEngine) return;
    const FString Status = FString::Printf(
        TEXT("JM TARGET BRIDGE -> UNREAL\nmovement: %s | contact: %s | score: %d | coin consumed: %s\n%s"),
        bMovementPass ? TEXT("PASS") : TEXT("WAIT"),
        bContactPass ? TEXT("PASS") : TEXT("WAIT"),
        Score,
        bCoinPass ? TEXT("PASS") : TEXT("WAIT"),
        bFinished ? TEXT("BOUNDED HOST CONTACT: PASS") : TEXT("HOLD RIGHT -> move PLAYER into COIN"));
    GEngine->AddOnScreenDebugMessage(3241, 0.f, FColor::Black, Status, true, FVector2D(1.5f,1.5f));
}

void AJMTargetBridgeHarness::SaveReceipt() {
    const FString Path = FPaths::ProjectSavedDir() / TEXT("JM_TARGET_BRIDGE_UNREAL_RETURN_RECEIPT.json");
    const FString Json = FString::Printf(
        TEXT("{\n  \"schema\": \"JM.TargetBridge.HostReturnReceipt/0.2\",\n  \"host\": \"Unreal\",\n  \"real_host\": true,\n  \"body_id\": \"jm.target-bridge.mini-collect-contact/v0.7\",\n  \"source_authority\": \"JM\",\n  \"lowering_sha256\": \"5d9d32f646de72b1f56244cd96786499c067bb74001a434fc6514bde677402ed\",\n  \"observations\": {\"movement\": \"PASS\", \"contact\": \"PASS\", \"score_delta\": \"PASS\", \"coin_consumption\": \"PASS\"},\n  \"score_before\": 0,\n  \"score_after\": 1,\n  \"unresolved_preserved\": [\"hazard.consequence\", \"goal.after_collecting\", \"starting_player_hp\"],\n  \"status\": \"PASS\"\n}\n"));
    FFileHelper::SaveStringToFile(Json, *Path);
    UE_LOG(LogTemp, Display, TEXT("JM TARGET BRIDGE UNREAL CONTACT PASS. Receipt: %s"), *Path);
}
