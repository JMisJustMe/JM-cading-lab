using UnrealBuildTool;
public class JMTargetBridgeContact : ModuleRules {
    public JMTargetBridgeContact(ReadOnlyTargetRules Target) : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore" });
    }
}
