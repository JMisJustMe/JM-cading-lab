#!/usr/bin/env python3
import json,sys
sys.path.insert(0,'/mnt/data/JM_REMAINING_NATIVE_WAVES_v2_0')
import remaining_native_runtime_v2 as rt
IDS=['finger-two', 'game-coding', 'gameforge', 'glyphforge', 'glyphplay', 'good-gold-star-codegame', 'jm-game-native-core', 'jmgamecore', 'kading-game-estate-engine', 'playform', 'jmvisualgraft', 'contactband', 'contactcode', 'pattern-tapping', 'seedform', 'reality-contact', 'prayer-hands-paired-contact', 'flowtalk-body-route', 'jickma-jickmah', 'mood-drills', 'morseminus', 'mudra-code', 'speakgate', 'speakuals', 'speech-code']
if __name__=="__main__":
    if len(sys.argv)>=2 and sys.argv[1]=="self-test":
        r=rt.self_test(IDS); print(json.dumps(r,indent=2,ensure_ascii=False)); raise SystemExit(0 if r["state"]=="DING" else 1)
    if len(sys.argv)>=3 and sys.argv[1]=="run":
        payload=json.loads(sys.argv[3]) if len(sys.argv)>3 else {}
        print(json.dumps(rt.operate(sys.argv[2],payload),indent=2,ensure_ascii=False))
    else:
        print(json.dumps({"wave":'P3_GAME_EMBODIED',"version":"2.0.0","bodies":IDS},indent=2,ensure_ascii=False))