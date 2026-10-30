"""JM 0.8.6: existing hosted tools unchanged; native engine calls owner-gated."""
import http.client
import json
import os
import sys
import threading
import unittest
from pathlib import Path
from http.server import ThreadingHTTPServer

SERVICE = Path(__file__).resolve().parents[1] / "services/jm-ecostate-build-mesh-mcp-v0_5"
sys.path.insert(0,str(SERVICE))
import server
from engine_admission import ENGINE_NAMES, engine_authorized

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
