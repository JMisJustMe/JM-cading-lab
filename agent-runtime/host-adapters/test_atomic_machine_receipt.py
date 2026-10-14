#!/usr/bin/env python3
"""JM host-adapter atomic receipt: interruption, conservation, and recovery.

Only temporary destination files are written. The existing JM source/runtime
remains unchanged. Local proof is not owner-device/hosted persistence proof.
"""
import json
import os
import pathlib
import runpy
import subprocess
import sys
import tempfile
import hashlib

ROOT=pathlib.Path(__file__).resolve().parents[2]
SOURCE=ROOT/"agent-runtime/host-adapters/jm_host_adapter_conformance.py"
BASE="18cb13123020e0df7c05f6402f774a24ff8f4a8e"
EXPECTED_DIFF_SHA256="2cbe5c3367fb9cdf73bbc66bc2b045806ff8704e9b1f4515644cc76d2de5c9a2"

def require(condition,code):
    if not condition:
        raise RuntimeError("JM_ATOMIC_RECEIPT_HOLD:"+code)

def run(args,*,expected_success=True):
    p=subprocess.run(args,cwd=ROOT,text=True,capture_output=True,timeout=90)
    if expected_success and p.returncode:
        raise RuntimeError("JM_ATOMIC_RECEIPT_HOLD:COMMAND:"+p.stdout[-300:]+p.stderr[-800:])
    return p

def fault(destination,mode):
    # Same Python process as CLI, but intentionally corrupt only the commit
    # boundary in a disposable receipt. No live source or server is touched.
    script=r'''
import os, pathlib, runpy, sys, tempfile
source, target, mode = sys.argv[1:]
target=pathlib.Path(target).resolve()
if mode=="replace":
    real=os.replace
    def interrupt(src,dst,*a,**kw):
        if pathlib.Path(dst).resolve()==target:
            raise OSError("JM_ATOMIC_INJECTED_REPLACE_FAILURE")
        return real(src,dst,*a,**kw)
    os.replace=interrupt
elif mode=="write":
    real=tempfile.NamedTemporaryFile
    class FragileFile:
        def __init__(self,obj): self.obj=obj
        def __enter__(self): self.obj.__enter__();return self
        def __exit__(self,*args): return self.obj.__exit__(*args)
        @property
        def name(self): return self.obj.name
        def write(self,s):
            self.obj.write("PARTIAL_TEMP")
            self.obj.flush()
            raise OSError("JM_ATOMIC_INJECTED_TEMP_WRITE_FAILURE")
        def flush(self):return self.obj.flush()
        def fileno(self):return self.obj.fileno()
    def interrupt(*a,**kw):
        return FragileFile(real(*a,**kw))
    tempfile.NamedTemporaryFile=interrupt
else: raise RuntimeError("invalid test mode")
sys.argv=[source,"--adapter","node-reference-runtime","--receipt-json",str(target)]
runpy.run_path(source,run_name="__main__")
'''
    return run([sys.executable,"-c",script,str(SOURCE),str(destination),mode],expected_success=False)

def main():
    inherited=run([sys.executable,"agent-runtime/host-adapters/test_machine_receipt.py"])
    require('"status": "PASS"' in inherited.stdout,"INHERITED_REGRESSION")
    with tempfile.TemporaryDirectory(prefix="jm-atomic-receipt-") as tmp:
        d=pathlib.Path(tmp)
        target=d/"receipt.json"
        old=b"PREEXISTING_GOOD_RECEIPT\n"
        for mode in ("replace","write"):
            target.write_bytes(old)
            fail=fault(target,mode)
            require(fail.returncode!=0,"EXPECTED_FAULT_HELD_"+mode)
            require("JM_ATOMIC_INJECTED_" in fail.stderr,"WRONG_FAILURE_"+mode)
            require(target.read_bytes()==old,"EXISTING_RECEIPT_DAMAGED_"+mode)
            require(not list(d.glob(".jm-host-receipt-*.tmp")),"ORPHAN_TEMP_"+mode)
        healthy=run([sys.executable,str(SOURCE),"--all","--run-local","--receipt-json",str(target)])
        require("JM HOST ADAPTER CONFORMANCE: PASS" in healthy.stdout,"REAL_CONFORMANCE")
        data=json.loads(target.read_text(encoding="utf-8"))
        require(data["schema"]=="JM.HostAdapterMachineReceipt/0.1" and data["status"]=="PASS","HEALTHY_RESULT")
        require(data["actual_checks"]["local_node_python_core_parity"] is True,"PARITY_PROOF")
        require("NO_OWNER_DEVICE_CLAIM" in data["claim_boundary"],"CLAIM_BOUNDARY")
        receipt_sha=hashlib.sha256(target.read_bytes()).hexdigest()
    patch=run(["git","diff","--no-ext-diff",BASE,"HEAD","--","agent-runtime/host-adapters/jm_host_adapter_conformance.py"])
    actual_sha=hashlib.sha256(patch.stdout.encode("utf-8")).hexdigest()
    require(actual_sha==EXPECTED_DIFF_SHA256,"NOT_IDENTICAL_TO_PROVEN_CLOUD_WORKER_PATCH:"+actual_sha)
    print(json.dumps({
       "schema":"JM.AtomicHostReceiptDurableDescendant/0.2",
       "status":"PASS",
       "realHostConformance":True,
       "inheritedMachineReceiptRegression":True,
       "interruptedReplacePreservesPrior":True,
       "interruptedTempWritePreservesPrior":True,
       "noOrphanTempFiles":True,
       "successfulCommitValid":True,
       "matchesExactIndependentWorkerPatch":True,
       "workerSourceDiffSha256":actual_sha,
       "receiptSha256":receipt_sha,
       "sourcePromoted":False,
       "sourceBranchOnly":True
    },sort_keys=True))

if __name__=="__main__": main()
