# RouteOS Kernel JM-Native v1.7A — EntryRoute

Status: **CONSTRUCTION**

Parent will be the frozen v1.6A DispatchRoute crown.

This lane removes the final handwritten C kernel-entry wrapper and generates the Multiboot argument-forwarding handoff into the inherited IgnitionBody. A split head/tail carrier keeps the source identity available after serial activation while preserving the assembly-visible global entry symbol.

Claim boundary: the fixed two-argument C handoff used by this kernel; not arbitrary boot protocols or firmware entry paths.
