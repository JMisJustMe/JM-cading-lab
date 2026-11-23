using UnrealBuildTool;
using System.Collections.Generic;
public class JMTargetBridgeContactEditorTarget : TargetRules {
    public JMTargetBridgeContactEditorTarget(TargetInfo Target) : base(Target) {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        ExtraModuleNames.Add("JMTargetBridgeContact");
    }
}
