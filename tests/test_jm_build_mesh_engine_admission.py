"""JM 0.8.6: existing hosted tools unchanged; native engine calls owner-gated."""
import http.client
import json
import hashlib
import os
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest import mock
from pathlib import Path
from http.server import ThreadingHTTPServer

SERVICE = Path(__file__).resolve().parents[1] / "services/jm-ecostate-build-mesh-mcp-v0_5"
sys.path.insert(0,str(SERVICE))
import server
from engine_admission import ENGINE_NAMES, engine_authorized, engine_runtime_ready, \
    SOURCE_PINS, ROOT, git_blob_matches, original_source_pins_ok

class NativeEngineHostAdmission(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.host=ThreadingHTTPServer(("127.0.0.1",0),server.Handler)
        cls.thread=threading.Thread(target=cls.host.serve_forever,daemon=True)
        cls.thread.start()
        cls.port=cls.host.server_address[1]
        cls.existing=os.environ.get("JM_ENGINE_OWNER_TOKEN")
        os.environ["JM_ENGINE_OWNER_TOKEN"]="JM-test-only-authorization-not-a-live-token-00001"

    @classmethod
    def tearDownClass(cls):
        cls.host.shutdown()
        cls.host.server_close()
        cls.thread.join(timeout=3)
        if cls.existing is None:
            os.environ.pop("JM_ENGINE_OWNER_TOKEN",None)
        else:
            os.environ["JM_ENGINE_OWNER_TOKEN"]=cls.existing

    def rpc(self,method,params=None,token=None):
        con=http.client.HTTPConnection("127.0.0.1",self.port,timeout=35)
        headers={"Content-Type":"application/json"}
        if token is not None:
            headers["Authorization"]="Bearer "+token
        body=json.dumps({"jsonrpc":"2.0","id":17,"method":method,"params":params or {}})
        con.request("POST","/mcp",body,headers)
        response=con.getresponse()
        data=response.read()
        con.close()
        return response.status,json.loads(data)

    def test_existing_public_mcp_unchanged(self):
        self.assertEqual(server.VERSION,"0.8.6")
        self.assertIn("plan_artifact_route",server.HANDLERS)
        self.assertIn("get_game_reentry_hints",server.HANDLERS)
        self.assertIn("cross_client",sys.modules)
        code,listed=self.rpc("tools/list")
        self.assertEqual(code,200)
        actual=[i["name"] for i in listed["result"]["tools"]]
        self.assertEqual(len(actual),len(server.TOOLS))
        self.assertEqual(len(actual),len(set(actual)))
        self.assertFalse(set(actual)&ENGINE_NAMES)
        code,result=self.rpc("tools/call",{"name":"build_mesh_status","arguments":{"probe_navigator":False}})
        self.assertEqual(code,200)
        self.assertEqual(result["result"]["structuredContent"]["version"],"0.8.6")

    def test_absent_and_wrong_token_fail_closed(self):
        token=os.environ.pop("JM_ENGINE_OWNER_TOKEN")
        try:
            self.assertFalse(engine_authorized("Bearer "+token))
            _,list_result=self.rpc("tools/list",token=token)
            self.assertEqual(len(list_result["result"]["tools"]),len(server.TOOLS))
        finally:
            os.environ["JM_ENGINE_OWNER_TOKEN"]=token
        for supplied in (None,"wrong",""):
            _,blocked=self.rpc("tools/call",{"name":"jm_engine_inventory","arguments":{}},token=supplied)
            self.assertEqual(blocked["error"]["code"],-32601)
        _,blocked=self.rpc("tools/call",{"name":"jm_engine_gardles","arguments":{}},token=token)
        self.assertEqual(blocked["error"]["code"],-32601)

    def test_auth_original_native_mcp_execution(self):
        token=os.environ["JM_ENGINE_OWNER_TOKEN"]
        code,listed=self.rpc("tools/list",token=token)
        self.assertEqual(code,200)
        names={i["name"] for i in listed["result"]["tools"]}
        self.assertEqual(len(names),len(server.TOOLS)+5)
        self.assertTrue(ENGINE_NAMES.issubset(names))
        code,out=self.rpc("tools/call",{"name":"jm_engine_inventory","arguments":{}},token=token)
        self.assertEqual(code,200)
        self.assertFalse(out["result"]["isError"],out)
        inventory=json.loads(out["result"]["content"][0]["text"])
        self.assertEqual(inventory["schema"],"jm.engine-federation.inventory/1")
        self.assertEqual([x["contact"] for x in inventory["donors"] if x["name"]=="Gardles"],
                         ["HOLD_NATIVE_SOURCE_NOT_MOUNTED_NO_ALIAS"])
        code,out=self.rpc("tools/call",{"name":"jm_engine_plan","arguments":{"goal":"JM game input and renderer"}},token=token)
        self.assertEqual(code,200)
        self.assertFalse(out["result"]["isError"],out)
        result=json.loads(out["result"]["content"][0]["text"])
        self.assertEqual(result["current64"]["total"],64)


    @classmethod
    def original_fixtures(cls):
        # Fixture comes from genuine JM source corpus, not a synthesized Python
        # lookalike. It is parsed by the same native JS imports as original CI.
        if hasattr(cls,"_original_fixtures"):
            return cls._original_fixtures
        js = """
import {GAME_CODING_SOURCE,JM_GAMECORE_SOURCE,INITIAL_FACTS} from './coding-estate/sovereign-ten/direct/native-corpus.mjs';
import {VISUAL_GRAFT_SOURCE,VISUAL_RUNTIME_SOURCE,GLYPHFORGE_SOURCE,GLYPHPLAY_SOURCE} from './coding-estate/sovereign-batch-six/direct/native-corpus.mjs';
import {NATIVE_CONNECTED_WORLD_EXAMPLE} from './navigator/estate-integration/execution-lanes.mjs';
console.log(JSON.stringify({GAME_CODING_SOURCE,JM_GAMECORE_SOURCE,INITIAL_FACTS,VISUAL_GRAFT_SOURCE,VISUAL_RUNTIME_SOURCE,GLYPHFORGE_SOURCE,GLYPHPLAY_SOURCE,NATIVE_CONNECTED_WORLD_EXAMPLE}));
"""
        result=subprocess.run(["node","--input-type=module","-e",js],
                              cwd=SERVICE.parents[1],capture_output=True,text=True,
                              timeout=20,check=True)
        cls._original_fixtures=json.loads(result.stdout.strip())
        return cls._original_fixtures

    def original_native_http(self,name,arguments):
        token=os.environ["JM_ENGINE_OWNER_TOKEN"]
        status,response=self.rpc("tools/call",{"name":name,"arguments":arguments},token=token)
        self.assertEqual(status,200)
        self.assertFalse(response["result"]["isError"],response)
        return json.loads(response["result"]["content"][0]["text"])

    def test_full_engine_source_contact_http(self):
        fixtures=self.original_fixtures()
        original=fixtures["INITIAL_FACTS"]
        authorised={**original,"door":{**original["door"],"authorized":True}}
        core=self.original_native_http("jm_engine_core_contact",{
            "gameSource":fixtures["GAME_CODING_SOURCE"],
            "coreSource":fixtures["JM_GAMECORE_SOURCE"],
            "initialState":authorised})
        self.assertEqual(core["game"]["state"]["door"]["state"],"open")
        self.assertEqual(core["core"]["identity"],"PlayerInteraction.v1")
        self.assertTrue(core["core"]["executions"][0]["applied"])

        visual_args={
            "gameSource":fixtures["GAME_CODING_SOURCE"],
            "coreSource":fixtures["JM_GAMECORE_SOURCE"],
            "visualGraftSource":fixtures["VISUAL_GRAFT_SOURCE"],
            "interactionSource":fixtures["VISUAL_RUNTIME_SOURCE"],
            "glyphForgeSource":fixtures["GLYPHFORGE_SOURCE"],
            "glyphPlaySource":fixtures["GLYPHPLAY_SOURCE"],
            "game":{"name":"DoorGame","identity":"DoorGame.v1","capabilities":["tap","drag","save"]},
            "glyph":"OPEN","input":{"type":"tap","value":"opened"},
            "initialState":authorised}
        visual=self.original_native_http("jm_engine_visual_contact",visual_args)
        self.assertEqual(visual["visualGraft"]["state"]["expression"],"door:open")
        self.assertEqual(visual["nativeGameState"]["door"]["state"],"open")
        self.assertEqual(visual["visualInput"]["after"]["door"]["input"],"opened")
        visual_args["initialState"]=original
        denied=self.original_native_http("jm_engine_visual_contact",visual_args)
        self.assertEqual(denied["visualGraft"]["state"]["expression"],"door:closed")
        self.assertNotEqual(visual["visualGraft"]["state"]["expression"],
                            denied["visualGraft"]["state"]["expression"])

        source=fixtures["NATIVE_CONNECTED_WORLD_EXAMPLE"]
        def bind(value):
            return {"identity":"Original JM connected world source from native corpus",
                    "content":value,"sha256":hashlib.sha256(value.encode()).hexdigest()}
        first=self.original_native_http("jm_engine_world_contact",{"source":bind(source)})
        self.assertEqual(first["spatial"]["playerConsequence"]["kind"],"collect")
        self.assertEqual(first["spatial"]["worldBody"],"burning")
        self.assertEqual(first["spatial"]["renderer"]["gpu"],"NOT_TESTED_IN_MCP_HOST")
        second=self.original_native_http("jm_engine_world_contact",{
            "source":bind(source.replace("burning","humanimals"))})
        self.assertEqual(second["spatial"]["worldBody"],"humanimals")
        self.assertNotEqual(first["spatial"]["geometry"]["nonColourShapeSha256"],
                            second["spatial"]["geometry"]["nonColourShapeSha256"])
        self.assertEqual(original["door"]["state"],"closed")

    def test_hash_mismatch_through_authenticated_http(self):
        fixture=self.original_fixtures()["NATIVE_CONNECTED_WORLD_EXAMPLE"]
        forged={"identity":"Original JM world","content":fixture+" ",
                "sha256":hashlib.sha256(fixture.encode()).hexdigest()}
        status,result=self.rpc("tools/call",{
            "name":"jm_engine_world_contact","arguments":{"source":forged}},
            token=os.environ["JM_ENGINE_OWNER_TOKEN"])
        self.assertEqual(status,200)
        self.assertTrue(result["result"]["isError"])
        self.assertIn("SOURCE_HASH_HOLD",result["result"]["content"][0]["text"])

    def test_correct_owner_credential_without_node_still_denied(self):
        token=os.environ["JM_ENGINE_OWNER_TOKEN"]
        engine_runtime_ready.cache_clear()
        try:
            with mock.patch("engine_admission.shutil.which",return_value=None):
                _,listed=self.rpc("tools/list",token=token)
                exposed={x["name"] for x in listed["result"]["tools"]}
                self.assertFalse(exposed & ENGINE_NAMES)
                _,called=self.rpc("tools/call",{
                    "name":"jm_engine_core_contact","arguments":{}},token=token)
                self.assertEqual(called["error"]["code"],-32601)
        finally:
            engine_runtime_ready.cache_clear()


    def test_source_pin_drift_denied_on_host(self):
        # Pin against the original donor bytes. A deliberately changed source
        # must not be able to masquerade as the tested JM game/renderer.
        self.assertEqual(len(SOURCE_PINS),16)
        self.assertTrue(original_source_pins_ok(),"ORIGINAL_JM_SOURCE_CUSTODY_HOLD")
        original,original_sha=next(iter(SOURCE_PINS.items()))
        with tempfile.TemporaryDirectory() as tmp:
            copy=Path(tmp) / "native-source.mjs"
            raw=(ROOT/original).read_bytes()
            copy.write_bytes(raw)
            self.assertTrue(git_blob_matches(copy,original_sha))
            copy.write_bytes(raw+b"\\n")
            self.assertFalse(git_blob_matches(copy,original_sha))
        engine_runtime_ready.cache_clear()
        try:
            with mock.patch("engine_admission.original_source_pins_ok",return_value=False):
                token=os.environ["JM_ENGINE_OWNER_TOKEN"]
                _,listed=self.rpc("tools/list",token=token)
                actual={x["name"] for x in listed["result"]["tools"]}
                self.assertFalse(actual & ENGINE_NAMES)
                _,denied=self.rpc("tools/call",{
                    "name":"jm_engine_world_contact","arguments":{}},token=token)
                self.assertEqual(denied["error"]["code"],-32601)
        finally:
            engine_runtime_ready.cache_clear()

    def test_native_payload_limit_and_existing_public_access(self):
        token=os.environ["JM_ENGINE_OWNER_TOKEN"]
        _,large=self.rpc("tools/call",{"name":"jm_engine_core_contact",
                 "arguments":{"gameSource":"x"*131072,"coreSource":"x"}},token=token)
        self.assertTrue(large["result"]["isError"])
        self.assertIn("JM_ENGINE_PAYLOAD_LIMIT_HOLD",large["result"]["content"][0]["text"])
        _,public=self.rpc("tools/call",{"name":"build_mesh_status","arguments":{"probe_navigator":False}})
        self.assertFalse(public["result"]["isError"])

if __name__=="__main__":
    unittest.main()
