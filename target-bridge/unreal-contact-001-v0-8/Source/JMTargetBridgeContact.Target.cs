using UnrealBuildTool;
using System.Collections.Generic;
public class JMTargetBridgeContactTarget : TargetRules {
    public JMTargetBridgeContactTarget(TargetInfo Target) : base(Target) {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        ExtraModuleNames.Add("JMTargetBridgeContact");
    }
}
