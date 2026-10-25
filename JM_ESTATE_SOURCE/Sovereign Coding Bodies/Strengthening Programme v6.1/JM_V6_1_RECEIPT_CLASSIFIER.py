#!/usr/bin/env python3
import argparse, json, pathlib, hashlib

RANK={"BUGG":0,"HOLD":1,"READY":2,"DING":3}

def promote(rails,name,state,source,details):
    prev=rails.get(name)
    if prev is None or RANK.get(state,-1)>RANK.get(prev["state"],-1):
        rails[name]={"state":state,"source":source,"details":details}

def classify(paths):
    master={
      "schema":"jm.v6.1.master-contact-receipt/v1",
      "sources":[],"rails":{},"boundaries":[],
      "law":"RETURNED CONTACT CROWNS ONLY THE RAIL IT TOUCHED"
    }
    for p in paths:
        p=pathlib.Path(p)
        try:j=json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            master["sources"].append({"file":p.name,"state":"BUGG","error":str(e)});continue
        master["sources"].append({"file":p.name,"schema":j.get("schema"),"sha256":hashlib.sha256(p.read_bytes()).hexdigest()})
        if isinstance(j.get("rails"),dict):
            for k,v in j["rails"].items():
                if isinstance(v,dict):promote(master["rails"],k,v.get("state","HOLD"),p.name,v)
        obs=j.get("observed",{})
        if isinstance(obs,dict):
            for k in ["touch","motion","orientation","webgl","webgpu","webcrypto","storage","battery"]:
                v=obs.get(k)
                if isinstance(v,dict) and v.get("state"):promote(master["rails"],k,v["state"],p.name,v)
        if j.get("state")=="DING" and j.get("props"):
            promote(master["rails"],"adb_device_contact","DING",p.name,j.get("props"))
        ks=j.get("keystore")
        if isinstance(ks,dict) and ks.get("state"):
            promote(master["rails"],"android_keystore",ks["state"],p.name,ks)
            if ks.get("inside_secure_hardware") is True:
                promote(master["rails"],"secure_hardware_key","DING",p.name,ks)
            if ks.get("strongbox_requested") and not ks.get("fallback_used") and ks.get("inside_secure_hardware"):
                promote(master["rails"],"strongbox_key_route","DING",p.name,ks)
        feats=j.get("features")
        if isinstance(feats,dict):
            if feats.get("strongbox") is True:promote(master["rails"],"strongbox_feature","DING",p.name,feats)
            elif "strongbox" in feats:promote(master["rails"],"strongbox_feature","HOLD",p.name,feats)
        if isinstance(j.get("write_test"),dict) and j["write_test"].get("state"):
            promote(master["rails"],"adb_hash_roundtrip",j["write_test"]["state"],p.name,j["write_test"])
        if isinstance(j.get("boundaries"),list):master["boundaries"]+=j["boundaries"]
    return master

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("files",nargs="+")
    ap.add_argument("--out",default="JM_V6_1_MASTER_CONTACT_RECEIPT.json")
    a=ap.parse_args()
    m=classify(a.files)
    pathlib.Path(a.out).write_text(json.dumps(m,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps(m,indent=2,ensure_ascii=False))
if __name__=="__main__":main()