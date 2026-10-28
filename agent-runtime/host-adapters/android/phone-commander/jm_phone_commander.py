#!/usr/bin/env python3
"""JM Phone Commander — bounded Termux executor and opt-in private GitHub mailbox.

No shell execution, no exposed listener, no repository secrets in source.
Host adapter ≠ sovereign body. Real owner-device proof requires a phone run.
"""
import argparse
import base64
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import platform
import re
import secrets
import shutil
import subprocess
import sys
import time
from urllib import error, parse, request

SCHEMA = "JM.PhoneCommand/0.1"
SOURCE_REPO = "JMisJustMe/JM-cading-lab"
MAILBOX_REPO = "JMisJustMe/JM-ai-studio-surface"
OWNER = "JMisJustMe"
MAX_BODY = 100_000
MAX_OUTPUT = 12_000
PROHIBITED = {".git", ".github", ".ssh", ".config", "node_modules", "__pycache__", ".venv", "venv", ".env"}
EXTENSIONS = {".py", ".json", ".md", ".txt", ".js", ".mjs", ".html", ".css", ".yml", ".yaml", ".sh"}
COMMANDS = {"status", "git-status", "route", "read-file", "edit-file"}

class Hold(Exception):
    pass

def compact(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))

def sha(data):
    return hashlib.sha256(data).hexdigest()

def private_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True,mode=0o700)
    temp = path.with_name(path.name + "." + secrets.token_hex(5) + ".tmp")
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    fd = os.open(str(temp), flags, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(compact(data) + "\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp, path)
    finally:
        try: temp.unlink(missing_ok=True)
        except OSError: pass

def load_json(path, fallback=None):
    try: return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError: return {} if fallback is None else fallback

def state_dir():
    return Path(os.environ.get("JM_PHONE_STATE", str(Path.home()/".config"/"jm-phone-commander"))).expanduser().resolve()

def workspace(path):
    root = Path(path).expanduser().resolve(strict=True)
    if not root.is_dir() or not (root/"agent-runtime"/"jm_agent_runtime.py").is_file():
        raise Hold("WORKSPACE_NOT_JM_REPO: clone/open the existing JM-cading-lab working tree")
    return root

def resolved_file(root, name, write=False):
    if not isinstance(name, str) or len(name)>256 or name.startswith(("/","~")) or "\\" in name:
        raise Hold("INVALID_RELATIVE_PATH")
    rel = Path(name)
    if len(rel.parts)<2 or any(p in PROHIBITED or p.startswith(".") or p==".." for p in rel.parts):
        raise Hold("PROTECTED_PATH")
    if any(word in rel.name.lower() for word in ("secret", "credential", "private-key", "api-key", "token")):
        raise Hold("SENSITIVE_FILENAME_BLOCKED")
    if rel.suffix.lower() not in EXTENSIONS:
        raise Hold("UNSUPPORTED_EXTENSION")
    path = root/rel
    if not path.exists() or not path.is_file() or path.is_symlink():
        raise Hold("FILE_MUST_EXIST_AND_NOT_BE_SYMLINK")
    resolved = path.resolve(strict=True)
    if not resolved.is_relative_to(root):
        raise Hold("PATH_OUTSIDE_JM_WORKSPACE")
    if path.stat().st_size > MAX_BODY:
        raise Hold("FILE_TOO_LARGE")
    return path

def run(args, root, timeout=20):
    try:
        cp = subprocess.run(args, cwd=root, shell=False, text=True, capture_output=True, timeout=timeout,
                            env={**os.environ, "GIT_TERMINAL_PROMPT":"0"})
        return {"exit_code":cp.returncode,"stdout":cp.stdout[:MAX_OUTPUT],"stderr":cp.stderr[:MAX_OUTPUT]}
    except FileNotFoundError: raise Hold("REQUIRED_EXECUTABLE_NOT_INSTALLED")
    except subprocess.TimeoutExpired: raise Hold("COMMAND_TIMED_OUT")

def local_grant_file(st):
    return st/"edit-grant.json"

def grant_edits(st, minutes):
    if not isinstance(minutes, int) or not 1<=minutes<=120:
        raise Hold("EDIT_GRANT_MINUTES_OUT_OF_RANGE")
    expiry = int(time.time()) + 60*minutes
    private_json(local_grant_file(st), {"expires_utc":expiry,"scope":"existing JM workspace files, hash-checked"})
    return {"edit_grant_expires_utc":expiry}

def check_grant(st):
    record=load_json(local_grant_file(st), {})
    if not isinstance(record, dict) or not isinstance(record.get("expires_utc"),int) or record["expires_utc"] <= time.time():
        raise Hold("OWNER_DEVICE_EDIT_GRANT_REQUIRED")

def execute(job, root, st):
    if not isinstance(job,dict) or job.get("schema")!=SCHEMA or job.get("command") not in COMMANDS:
        raise Hold("UNKNOWN_COMMAND_OR_SCHEMA")
    op=job["command"]
    a=job.get("args",{})
    if not isinstance(a,dict): raise Hold("INVALID_ARGS")
    if op=="status":
        return {"result":"PASS","adapter":"JM Phone Commander/0.1", "python":platform.python_version(),
                "platform":platform.system(),"termux_detected":bool(os.environ.get("PREFIX", "").startswith("/data/data/com.termux/")),
                "workspace_present":True,"git_present":bool(shutil.which("git")), "commands":sorted(COMMANDS),
                "network_listener":"disabled by default"}
    if op=="git-status":
        if not shutil.which("git"): raise Hold("GIT_NOT_INSTALLED")
        return {"result":"PASS","git":run(["git","status","--porcelain=v1","--untracked-files=no"],root),
                "branch":run(["git","branch","--show-current"],root)}
    if op=="route":
        query=a.get("query","")
        if not isinstance(query,str) or not 1<=len(query)<=160 or any(ord(ch)<32 for ch in query):
            raise Hold("INVALID_ROUTE_QUERY")
        return {"result":"PASS","core":run([sys.executable,"agent-runtime/jm_agent_runtime.py","--core-only",
                                               "--surface","phone-termux","--query",query],root)}
    if op=="read-file":
        path=resolved_file(root,a.get("path"))
        data=path.read_bytes()
        if len(data)>MAX_BODY: raise Hold("FILE_TOO_LARGE")
        try: content=data.decode("utf-8")
        except UnicodeDecodeError: raise Hold("NON_UTF8_FILE")
        # Explicit caller-requested file read; private results must not be made public.
        return {"result":"PASS","path":str(path.relative_to(root)),"sha256":sha(data),"text":content[:MAX_OUTPUT],
                "truncated":len(content)>MAX_OUTPUT}
    if op=="edit-file":
        check_grant(st)
        if a.get("confirmation")!="OWNER_APPROVED_CODE_EDIT":
            raise Hold("EXPLICIT_EDIT_CONFIRMATION_REQUIRED")
        path=resolved_file(root,a.get("path"),True)
        expected=a.get("expected_sha256")
        if not isinstance(expected,str) or not re.fullmatch(r"[a-f0-9]{64}",expected):
            raise Hold("INVALID_EXPECTED_HASH")
        current=path.read_bytes()
        if sha(current)!=expected: raise Hold("CONFLICT_SOURCE_HASH_CHANGED")
        incoming=a.get("new_text_b64")
        if not isinstance(incoming,str) or len(incoming)>MAX_BODY*2:
            raise Hold("INVALID_EDIT_PAYLOAD")
        try:
            replacement=base64.b64decode(incoming,validate=True)
            replacement.decode("utf-8")
        except (ValueError,UnicodeDecodeError): raise Hold("INVALID_BASE64_UTF8")
        if len(replacement)>MAX_BODY: raise Hold("EDIT_TOO_LARGE")
        # Immutable backup outside repository, uniquely keyed to old hash, then atomic replacement.
        backup=st/"backups"/sha(str(path.relative_to(root)).encode())/f"{sha(current)}.bak"
        if not backup.exists():
            backup.parent.mkdir(parents=True,exist_ok=True)
            fd=os.open(str(backup),os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
            with os.fdopen(fd,"wb") as f: f.write(current)
        temp=path.with_name(".jm-phone-"+secrets.token_hex(8)+".tmp")
        fd=os.open(str(temp),os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        try:
            with os.fdopen(fd,"wb") as f:
                f.write(replacement); f.flush(); os.fsync(f.fileno())
            os.chmod(temp,path.stat().st_mode & 0o777)
            # TOCTOU guard before commit; direct local filesystem assumed cooperative.
            if sha(path.read_bytes())!=expected: raise Hold("CONFLICT_SOURCE_HASH_CHANGED")
            os.replace(temp,path)
        finally: temp.unlink(missing_ok=True)
        if sha(path.read_bytes())!=sha(replacement): raise Hold("READBACK_HASH_MISMATCH")
        return {"result":"PASS","path":str(path.relative_to(root)),"old_sha256":sha(current),
                "new_sha256":sha(replacement),"readback_sha256":sha(path.read_bytes()),"backup":str(backup)}
    raise Hold("UNREACHABLE_COMMAND")

def safe_execute(job,root,st):
    try: return {"state":"PASS","consequence":execute(job,root,st)}
    except Hold as e: return {"state":"HOLD","reason":str(e)}
    except Exception as e: return {"state":"HOLD","reason":"RUNTIME_EXCEPTION_"+type(e).__name__}

def get_local_token(st):
    path=st/"local-token"
    if path.exists():
        if (path.stat().st_mode & 0o077): raise Hold("LOCAL_TOKEN_PERMISSIONS_UNSAFE")
        return path.read_text().strip()
    st.mkdir(parents=True,exist_ok=True,mode=0o700)
    value=secrets.token_urlsafe(32)
    fd=os.open(str(path),os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    with os.fdopen(fd,"w") as f: f.write(value+"\n")
    return value

def serve(root,st,port):
    token=get_local_token(st)
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,format,*args): pass
        def respond(self,code,obj):
            payload=compact(obj).encode()
            self.send_response(code)
            self.send_header("Content-Type","application/json")
            self.send_header("Cache-Control","no-store")
            self.send_header("Content-Length",str(len(payload)))
            self.end_headers(); self.wfile.write(payload)
        def auth(self):
            if not secrets.compare_digest(self.headers.get("Authorization", ""),"Bearer "+token):
                self.respond(401,{"state":"HOLD","reason":"UNAUTHORISED"});return False
            if self.headers.get("Origin"):
                self.respond(403,{"state":"HOLD","reason":"BROWSER_ORIGIN_REJECTED"});return False
            return True
        def do_GET(self):
            if not self.auth():return
            if self.path!="/status": self.respond(404,{"state":"HOLD"});return
            self.respond(200,safe_execute({"schema":SCHEMA,"command":"status"},root,st))
        def do_POST(self):
            if not self.auth():return
            if self.path!="/execute":self.respond(404,{"state":"HOLD"});return
            try: n=int(self.headers.get("Content-Length","0"))
            except ValueError:n=-1
            if n<1 or n>MAX_BODY:
                self.respond(413,{"state":"HOLD","reason":"INVALID_SIZE"});return
            try: job=json.loads(self.rfile.read(n))
            except (ValueError,UnicodeDecodeError):self.respond(400,{"state":"HOLD","reason":"INVALID_JSON"});return
            self.respond(200,safe_execute(job,root,st))
    if not 1024<=port<=65535: raise Hold("INVALID_PORT")
    server=ThreadingHTTPServer(("127.0.0.1",port),Handler)
    print(f"JM phone local API: http://127.0.0.1:{port} — TOKEN STORED PRIVATELY; no external listener")
    try:server.serve_forever()
    finally:server.server_close()

def github_token():
    token=os.environ.get("JM_PHONE_GH_TOKEN") or os.environ.get("GH_TOKEN")
    if token:return token.strip()
    try:
        cp=subprocess.run(["gh","auth","token"],capture_output=True,text=True,timeout=8)
        if cp.returncode==0 and cp.stdout.strip():return cp.stdout.strip()
    except (OSError,subprocess.TimeoutExpired): pass
    raise Hold("GITHUB_AUTH_REQUIRED: configure gh auth login or JM_PHONE_GH_TOKEN securely")

class GitHub:
    def __init__(self,token,repo=MAILBOX_REPO,api="https://api.github.com"):
        if repo!=MAILBOX_REPO: raise Hold("REPO_NOT_ALLOWLISTED")
        self.token=token;self.repo=repo;self.api=api.rstrip("/")
    def call(self,path,method="GET",payload=None):
        url=self.api+path
        data=compact(payload).encode() if payload is not None else None
        req=request.Request(url,data=data,method=method,headers={"Authorization":"Bearer "+self.token,
                           "Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",
                           "User-Agent":"JM-PhoneCommander/0.1",**({"Content-Type":"application/json"} if data else {})})
        try:
            with request.urlopen(req,timeout=20) as rsp:
                body=rsp.read(MAX_BODY*2)
                return json.loads(body) if body else {}
        except error.HTTPError as e: raise Hold(f"GITHUB_HTTP_{e.code}")
        except error.URLError: raise Hold("GITHUB_NETWORK_UNAVAILABLE")
    def ensure_private(self):
        record=self.call("/repos/"+self.repo)
        if record.get("full_name")!=self.repo or record.get("private") is not True or record.get("owner",{}).get("login")!=OWNER:
            raise Hold("PRIVATE_OWNER_REPOSITORY_REQUIRED")
    def issues(self):
        return self.call("/repos/"+self.repo+"/issues?state=open&per_page=100")
    def comment(self,number,body):
        return self.call(f"/repos/{self.repo}/issues/{number}/comments","POST",{"body":body})
    def close(self,number):
        return self.call(f"/repos/{self.repo}/issues/{number}","PATCH",{"state":"closed"})

def process_mailbox(gh,root,st):
    gh.ensure_private()
    issues=gh.issues()
    if not isinstance(issues,list):raise Hold("INVALID_ISSUES_RESPONSE")
    ledger_file=st/"mailbox-ledger.json"
    ledger=load_json(ledger_file,{})
    if not isinstance(ledger,dict): raise Hold("INVALID_LEDGER")
    events=[]
    for issue in issues:
        if not isinstance(issue,dict) or "pull_request" in issue:continue
        if issue.get("user",{}).get("login")!=OWNER:continue
        if issue.get("state")!="open":continue
        if not str(issue.get("title", "")).startswith("JM PHONE COMMAND: "):continue
        ident=str(issue.get("id", ""));number=issue.get("number")
        if not ident.isdigit() or not isinstance(number,int):continue
        if ident not in ledger:
            raw=issue.get("body") or ""
            if not isinstance(raw,str) or len(raw)>MAX_BODY:continue
            try: job=json.loads(raw)
            except ValueError:job={}
            if not isinstance(job,dict) or job.get("schema")!=SCHEMA:continue
            # Persist before execution: at-most-once. A crash cannot replay an edit.
            ledger[ident]={"number":number,"state":"CLAIMED","created_utc":int(time.time())}
            private_json(ledger_file,ledger)
            receipt=safe_execute(job,root,st)
            ledger[ident]={"number":number,"state":"RESULT_READY","receipt":receipt}
            private_json(ledger_file,ledger)
        record=ledger[ident]
        if record.get("state")=="CLAIMED":
            record={"number":number,"state":"RESULT_READY","receipt":{"state":"HOLD","reason":"CRASH_BEFORE_RESULT_RECORDED_NO_REPLAY"}}
            ledger[ident]=record;private_json(ledger_file,ledger)
        if record.get("state")=="RESULT_READY":
            note="JM PHONE COMMANDER RECEIPT\n```json\n"+json.dumps(record["receipt"],ensure_ascii=False,indent=2)[:MAX_BODY]+"\n```"
            gh.comment(number,note)
            ledger[ident]["state"]="COMMENT_POSTED";private_json(ledger_file,ledger)
        if ledger[ident].get("state")=="COMMENT_POSTED":
            gh.close(number)
            ledger[ident]["state"]="CLOSED";private_json(ledger_file,ledger)
        events.append({"issue":number,"state":ledger[ident]["state"]})
    return events

def main(argv=None):
    p=argparse.ArgumentParser(description="JM Phone Commander — Termux / JM workspace host adapter")
    p.add_argument("--workspace",default=os.environ.get("JM_WORKSPACE",str(Path.home()/"JM_WORKSPACE"/"JM-cading-lab")))
    sub=p.add_subparsers(dest="action",required=True)
    sub.add_parser("status")
    route=sub.add_parser("route");route.add_argument("query")
    sub.add_parser("git-status")
    read=sub.add_parser("read-file");read.add_argument("path")
    edit=sub.add_parser("edit-file");edit.add_argument("path");edit.add_argument("expected_sha256");edit.add_argument("new_text_b64")
    grant=sub.add_parser("grant-edits");grant.add_argument("minutes",type=int)
    server=sub.add_parser("serve");server.add_argument("--port",type=int,default=8765)
    mb=sub.add_parser("mailbox");mb.add_argument("--loop",action="store_true");mb.add_argument("--interval",type=int,default=90)
    args=p.parse_args(argv)
    try:
        st=state_dir()
        root=workspace(args.workspace)
        if args.action=="grant-edits": out=grant_edits(st,args.minutes)
        elif args.action=="serve":return serve(root,st,args.port)
        elif args.action=="mailbox":
            if args.interval<30:raise Hold("MINIMUM_POLL_INTERVAL_30_SECONDS")
            gh=GitHub(github_token(),repo=MAILBOX_REPO)
            while True:
                try: out={"state":"PASS","events":process_mailbox(gh,root,st)}
                except Hold as e:out={"state":"HOLD","reason":str(e)}
                print(compact(out),flush=True)
                if not args.loop:break
                time.sleep(args.interval)
            return 0
        else:
            body={"schema":SCHEMA,"command":args.action,"args":{}}
            if args.action=="route":body["args"]={"query":args.query}
            if args.action=="read-file":body["args"]={"path":args.path}
            if args.action=="edit-file":body["args"]={"path":args.path,"expected_sha256":args.expected_sha256,"new_text_b64":args.new_text_b64,"confirmation":"OWNER_APPROVED_CODE_EDIT"}
            out=safe_execute(body,root,st)
        print(json.dumps(out,ensure_ascii=False,indent=2))
        return 0 if out.get("state","PASS")=="PASS" else 2
    except (Hold,FileNotFoundError,NotADirectoryError) as e:
        print(compact({"state":"HOLD","reason":str(e)}));return 2

if __name__=="__main__":raise SystemExit(main())