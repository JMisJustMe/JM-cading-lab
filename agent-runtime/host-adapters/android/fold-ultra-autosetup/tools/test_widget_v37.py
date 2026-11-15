from pathlib import Path
p=Path(__file__).resolve().parents[1]/"app/src/main/java/com/jmisjustme/foldultra"
s=(p/"MainActivity.java").read_text(encoding="utf-8")
t=(p/"ProjectShelfTransfer.java").read_text(encoding="utf-8")
for needle in ('PROJECT_ONLY_EXPORT=210,PROJECT_ONLY_IMPORT=211','projectTransferFile(true)','projectTransferFile(false)','ProjectShelfTransfer.validate(new JSONObject(out.toString("UTF-8")))','ProjectShelfTransfer.apply(sp,clean)','ProjectShelfTransfer.restore(sp)','out.size()+n>65536','setNegativeButton("Cancel",null)'):
    assert needle in s,needle
for needle in ('JM.ProjectShelfTransfer/1.0','ProjectShelf.validateList','ProjectShelf.stageToEditor','e.putString(ROLLBACK,previous.toString())','e.putString(ROLLBACK,current.toString())','if(!e.commit())'):
    assert needle in t,needle
assert 'UsbBridge.applyConfig' not in t
print("PASS v3.7 isolated transfer, bounded import, explicit consent, reversible rollback")
