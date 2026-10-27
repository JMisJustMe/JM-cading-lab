"""JM Federation final CP01 independent execution, native source and hosted estate contact.
NO DING NO CLAIM. Do not contact a protected endpoint with real credentials.
"""
import base64
import hashlib
import io
import json
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.request
import urllib.error
import zipfile

HERE=pathlib.Path(__file__).resolve().parent
ZIP_SHA="b9d04050d20edfebd454a7ad3ecceee00ee9f4d8a81481b80814ca2ba4ba8faa"
ENTRY_SHAS={
 "server.py":"c1bb19bec7f2300bfb04584703f54a69ea48bd9328ff7c5c7b75e34357ca1794",
 "runtime.py":"b2e0a7bb2228072e257c1c1e278e076dd689a4ea48661ccd5c2052aa38da4d91",
 "recipe.py":"d7fcc58a805dd3fdff0c11e7cdca5219671222fc0f12a68d1bb23f56142c28da",
 "manifest.json":"e07c9b25938a697ef516439dbe092831fd354e5fd5a4e781826c9262a0d93b25",
 "recipe.json":"d61b951ac7e7711c9409383db64f8aae2644317dc4fee7830510401470cb02ab",
 "README.md":"59fae7c39bcce6ed7fc6495cfc48af6d5f2da0b524e09cf387a8f23e99ec091f"
}
def sha(b):return hashlib.sha256(b).hexdigest()
raw=HERE.joinpath("standalone_mcp_zip.b64").read_text().splitlines()
assert all(line.startswith("#") for line in raw[:-1]) and len(raw[-1])>10000
bundle=base64.b64decode(raw[-1],validate=True)
assert len(bundle)==10100,(len(bundle),sha(bundle))
assert sha(bundle)==ZIP_SHA,sha(bundle)
with zipfile.ZipFile(io.BytesIO(bundle)) as z:
 assert set(z.namelist())==set(ENTRY_SHAS),z.namelist()
 assert z.testzip() is None
 for filename,expected in ENTRY_SHAS.items():
  assert sha(z.read(filename))==expected,filename
 print("PASS exact Workshop-produced package, ZIP CRC and 6 original internal SHA-256 hashes",flush=True)
 with tempfile.TemporaryDirectory() as folder:
  z.extractall(folder)
  for i in range(32):
   args={"gate":f"JMOP-FINAL-{i:04d}","admission":"PUBLIC_SAFE_CONTACT_ONLY","provider":"RUNNER_STANDALONE_ONLY","fold":"UNOBSERVED","workshop":"STANDALONE_EXECUTED"}
   msg={"jsonrpc":"2.0","id":i+1,"method":"tools/call","params":{"name":"jm_federation_receipt_cp01","arguments":args}}
   child=subprocess.run([sys.executable,"server.py","--stdio"],cwd=folder,input=json.dumps(msg)+"\n",capture_output=True,text=True,timeout=12)
   assert child.returncode==0,child.stderr[-500:]
   result=json.loads(child.stdout.strip())["result"]
   assert result.get("isError") is False,result
   out=result["structuredContent"]
   expected="JM_FED_CP01|GATE={gate}|ADMISSION={admission}|PROVIDER={provider}|FOLD={fold}|WORKSHOP={workshop}".format(**args)
   assert out["receipt"]==expected,(i,out)
   assert out["receipt_chars"]==len(expected)
   assert out["scope"]=="HOST_MEDIATED_READ_ONLY" and out["remote_device_proven"] is False
  print("PASS 32/32 fresh standalone MCP Node-free Python stdio process executions",flush=True)
  for case,alter in [("missing",{"gate":"JMOP-BAD"}),("extra",{**args,"owner_secret":"disallowed"})]:
   msg={"jsonrpc":"2.0","id":98,"method":"tools/call","params":{"name":"jm_federation_receipt_cp01","arguments":alter}}
   child=subprocess.run([sys.executable,"server.py","--stdio"],cwd=folder,input=json.dumps(msg)+"\n",capture_output=True,text=True,timeout=12)
   reply=json.loads(child.stdout.strip())
   result=reply.get("result",{})
   assert reply.get("error") or result.get("isError") is True, (case,reply)
  print("PASS 2/2 standalone malformed or extraneous typed-input HOLDs",flush=True)

SITES={
 "build_mesh":"https://jm-ecostate-build-mesh-mcp.onrender.com",
 "workshop":"https://jm-mcp-workshop.onrender.com",
 "experience":"https://jm-live-experience-intake-mcp.onrender.com",
 "unique_bodies":"https://jm-unique-bodies-cp08-contact.onrender.com",
}
def request(body,path="/mcp",origin=None):
 host=SITES[body]
 headers={"Accept":"application/json, text/event-stream","Content-Type":"application/json"}
 if origin:headers["Origin"]=origin
 return host,path,headers

def hit(url,method="GET",payload=None,headers=None):
 req=urllib.request.Request(url,method=method,data=None if payload is None else json.dumps(payload).encode("utf-8"),headers=headers or {})
 try:
  with urllib.request.urlopen(req,timeout=35) as r:
   return r.status,r.read(200000)
 except urllib.error.HTTPError as e:
  return e.code,e.read(200000)

def retry(url,method="GET",payload=None,headers=None):
 for attempt in range(7):
  try:
   status,raw=hit(url,method,payload,headers)
   if status in (200,202,204,401,403):return status,raw
   last=f"HTTP {status}"
  except Exception as ex:last=type(ex).__name__
  time.sleep(3)
 raise AssertionError("remote HOLD "+url+" "+last)
for name,base in SITES.items():
 h="/health" if name=="unique_bodies" else "/healthz"
 status,raw=retry(base+h)
 assert status==200,(name,status,raw[:200])
 v=json.loads(raw)
 assert isinstance(v,dict),(name,v)
 print("PASS hosted HTTPS health",name,flush=True)

# MCP list & actual remote native tool calls for the three unprotected PUBLIC-SAFE bodies.
def rpc(name,method,params):
 status,raw=retry(SITES[name]+"/mcp","POST",{"jsonrpc":"2.0","id":401,"method":method,"params":params},{"Content-Type":"application/json","Accept":"application/json, text/event-stream"})
 assert status==200,(name,status,raw[:400])
 result=json.loads(raw)
 assert "result" in result and "error" not in result,(name,result)
 return result["result"]
for name in ("build_mesh","workshop","experience"):
 data=rpc(name,"tools/list",{})
 tools={x["name"] for x in data["tools"]}
 expected={"build_mesh":"build_mesh_status","workshop":"workshop_run","experience":"experience_status"}[name]
 assert expected in tools,(name,sorted(tools))
 print("PASS actual hosted MCP tool discovery",name,len(tools),flush=True)

mesh=rpc("build_mesh","tools/call",{"name":"build_mesh_status","arguments":{"probe_navigator":False}})
workshop_recipe={"slug":"jm_final_safe_sum","description":"Safely prove connected workshop host executed a bounded arithmetic effect.","inputs":[{"name":"a","type":"integer","required":True},{"name":"b","type":"integer","required":True}],"steps":[{"op":"add","from":"a","with":"b","as":"sum"}],"outputs":["sum"]}
shop=rpc("workshop","tools/call",{"name":"workshop_run","arguments":{"recipe":workshop_recipe,"arguments":{"a":17,"b":15}}})
exp=rpc("experience","tools/call",{"name":"experience_status","arguments":{}})
for name,value in [("build_mesh",mesh),("workshop",shop),("experience",exp)]:
 assert "structuredContent" in value,(name,value)
x=mesh["structuredContent"];y=shop["structuredContent"];z=exp["structuredContent"]
assert x.get("version")=="0.8.6",x
assert y.get("state")=="RECIPE_EXECUTED" and y.get("result",{}).get("sum")==32,y
assert z.get("state")=="PUBLIC_SAFE_CONTACT_ONLY" and z.get("actual_gameplay_consequences") is False,z
print("PASS 3/3 independent ACTUAL HOSTED native MCP tool invocations: Mesh, Workshop, Experience",flush=True)

# CP08: never try a known/guessed actual bearer. Negative auth only.
status,raw=retry(SITES["unique_bodies"]+"/mcp","POST",{"jsonrpc":"2.0","id":402,"method":"tools/list","params":{}},{"Content-Type":"application/json"})
assert status==401 and json.loads(raw).get("error")=="BEARER_REQUIRED",(status,raw[:400])
print("PASS Unique Bodies legitimate authenticated boundary: anonymous remote request denied",flush=True)
print("FINAL_SCOPE_DING: 32 fresh standalone MCP invocations; 2 negative typed holds; 4 health; 3 tool discovery; 3 actual hosted public tool executions; 1 CP08 negative authentication.")
print("HOLD: CP08 authenticated tool/Atlas disk durability; Gemini-native tool calls; Samsung Fold owner touch; APP COMMONS separate Render hosting; direct server-to-server MCP.")
