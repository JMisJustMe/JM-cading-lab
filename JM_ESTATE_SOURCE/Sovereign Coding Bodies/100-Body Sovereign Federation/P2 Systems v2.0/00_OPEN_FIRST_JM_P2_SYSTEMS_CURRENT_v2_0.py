#!/usr/bin/env python3
import json,sys
sys.path.insert(0,'/mnt/data/JM_REMAINING_NATIVE_WAVES_v2_0')
import remaining_native_runtime_v2 as rt
IDS=['codehand', 'routebox', 'js-emitter', 'recorp', 'finger-one', 'jmvisual-runtime', 'command-glyphs', 'noncoding-code', 'tbs-string']
if __name__=="__main__":
    if len(sys.argv)>=2 and sys.argv[1]=="self-test":
        r=rt.self_test(IDS); print(json.dumps(r,indent=2,ensure_ascii=False)); raise SystemExit(0 if r["state"]=="DING" else 1)
    if len(sys.argv)>=3 and sys.argv[1]=="run":
        payload=json.loads(sys.argv[3]) if len(sys.argv)>3 else {}
        print(json.dumps(rt.operate(sys.argv[2],payload),indent=2,ensure_ascii=False))
    else:
        print(json.dumps({"wave":'P2_SYSTEMS',"version":"2.0.0","bodies":IDS},indent=2,ensure_ascii=False))