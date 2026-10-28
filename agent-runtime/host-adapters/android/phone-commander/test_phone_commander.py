#!/usr/bin/env python3
"""Deterministic fixture tests; these do not impersonate Samsung host contact."""
import base64
from contextlib import contextmanager
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import socket
import tempfile
import threading
import urllib.error
import urllib.request
import unittest

PATH=Path(__file__).with_name("jm_phone_commander.py")
spec=importlib.util.spec_from_file_location("jm_phone_commander",PATH)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class DummyGH:
    def __init__(self,issues,private=True):
        self._issues=issues;self.private=private;self.comments=[];self.closed=[];self.calls=0
    def ensure_private(self):
        if not self.private: raise m.Hold("PRIVATE_OWNER_REPOSITORY_REQUIRED")
    def issues(self): return self._issues
    def comment(self,number,body): self.comments.append((number,body))
    def close(self,number): self.closed.append(number)

class Suite(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.base=Path(self.temp.name)
        self.root=self.base/"JM-cading-lab"
        (self.root/"agent-runtime").mkdir(parents=True)
        (self.root/"agent-runtime"/"jm_agent_runtime.py").write_text("import json;print(json.dumps({'authority_class':'SESSION_ROUTER_NOT_SOURCE_AUTHORITY','route_candidates':[]}))\n")
        self.st=self.base/"state"
        self.st.mkdir()
        self.doc=self.root/"agent-runtime"/"doc.md"
        self.doc.write_text("before\n")
    def tearDown(self):self.temp.cleanup()
    def job(self,command,args=None):return {"schema":m.SCHEMA,"command":command,"args":args or {}}
    def assert_hold(self,res,fragment):
        self.assertEqual("HOLD",res["state"])
        self.assertIn(fragment,res["reason"])
    def test_status(self):
        r=m.safe_execute(self.job("status"),self.root,self.st)
        self.assertEqual("PASS",r["state"])
        self.assertIn("edit-file",r["consequence"]["commands"])
    def test_unknown_command_rejected(self):self.assert_hold(m.safe_execute(self.job("shell"),self.root,self.st),"UNKNOWN_COMMAND")
    def test_schema_rejected(self):self.assert_hold(m.safe_execute({"command":"status"},self.root,self.st),"UNKNOWN_COMMAND")
    def test_route_runs_existing_core(self):
        r=m.safe_execute(self.job("route",{"query":"coding runtime"}),self.root,self.st)
        self.assertEqual("PASS",r["state"])
        self.assertEqual(0,r["consequence"]["core"]["exit_code"])
    def test_route_nonzero_exit_is_hold(self):
        (self.root/"agent-runtime"/"jm_agent_runtime.py").write_text("import sys;sys.exit(19)\n")
        self.assert_hold(m.safe_execute(self.job("route",{"query":"coding runtime"}),self.root,self.st),"JM_CORE_ROUTE_FAILED")
    def test_git_nonzero_exit_is_hold(self):
        from unittest.mock import patch
        with patch.object(m.shutil,"which",return_value="/usr/bin/git"), patch.object(m,"run",return_value={"exit_code":128,"stdout":"","stderr":"fatal"}):
            self.assert_hold(m.safe_execute(self.job("git-status"),self.root,self.st),"GIT_STATUS_FAILED")
    def test_route_control_chars_rejected(self):self.assert_hold(m.safe_execute(self.job("route",{"query":"bad\nquery"}),self.root,self.st),"INVALID_ROUTE")
    def test_read_and_sha(self):
        x=m.safe_execute(self.job("read-file",{"path":"agent-runtime/doc.md"}),self.root,self.st)
        self.assertEqual("PASS",x["state"])
        self.assertEqual(m.sha(b"before\n"),x["consequence"]["sha256"])
    def test_absolute_path_blocked(self):self.assert_hold(m.safe_execute(self.job("read-file",{"path":"/etc/passwd"}),self.root,self.st),"INVALID_RELATIVE_PATH")
    def test_dotdot_blocked(self):self.assert_hold(m.safe_execute(self.job("read-file",{"path":"agent-runtime/../secret.md"}),self.root,self.st),"PROTECTED_PATH")
    def test_hidden_paths_blocked(self):self.assert_hold(m.safe_execute(self.job("read-file",{"path":".git/config"}),self.root,self.st),"PROTECTED_PATH")
    def test_symlink_blocked(self):
        (self.root/"agent-runtime"/"link.md").symlink_to(self.doc)
        self.assert_hold(m.safe_execute(self.job("read-file",{"path":"agent-runtime/link.md"}),self.root,self.st),"SYMLINK")
    def test_sensitive_filename_blocked(self):
        (self.root/"agent-runtime"/"secrets.json").write_text("secret")
        self.assert_hold(m.safe_execute(self.job("read-file",{"path":"agent-runtime/secrets.json"}),self.root,self.st),"SENSITIVE_FILENAME_BLOCKED")
    def test_missing_file_blocked(self):self.assert_hold(m.safe_execute(self.job("read-file",{"path":"agent-runtime/missing.md"}),self.root,self.st),"FILE_MUST_EXIST")
    def test_edit_without_owner_grant_rejected(self):
        job=self.job("edit-file",{"path":"agent-runtime/doc.md","expected_sha256":m.sha(b"before\n"),"new_text_b64":base64.b64encode(b"after\n").decode(),"confirmation":"OWNER_APPROVED_CODE_EDIT"})
        self.assert_hold(m.safe_execute(job,self.root,self.st),"OWNER_DEVICE_EDIT_GRANT_REQUIRED")
        self.assertEqual(b"before\n",self.doc.read_bytes())
    def test_edit_requires_confirmation(self):
        m.grant_edits(self.st,10)
        job=self.job("edit-file",{"path":"agent-runtime/doc.md"})
        self.assert_hold(m.safe_execute(job,self.root,self.st),"EXPLICIT_EDIT_CONFIRMATION_REQUIRED")
    def test_edit_hash_mismatch_no_mutation(self):
        m.grant_edits(self.st,10)
        job=self.job("edit-file",{"path":"agent-runtime/doc.md","expected_sha256":"0"*64,"new_text_b64":base64.b64encode(b"after\n").decode(),"confirmation":"OWNER_APPROVED_CODE_EDIT"})
        self.assert_hold(m.safe_execute(job,self.root,self.st),"CONFLICT_SOURCE_HASH_CHANGED")
        self.assertEqual(b"before\n",self.doc.read_bytes())
    def test_edit_write_backup_readback(self):
        m.grant_edits(self.st,10)
        job=self.job("edit-file",{"path":"agent-runtime/doc.md","expected_sha256":m.sha(b"before\n"),"new_text_b64":base64.b64encode(b"after\n").decode(),"confirmation":"OWNER_APPROVED_CODE_EDIT"})
        result=m.safe_execute(job,self.root,self.st)
        self.assertEqual("PASS",result["state"])
        self.assertEqual("after\n",self.doc.read_text())
        self.assertEqual(m.sha(b"after\n"),result["consequence"]["readback_sha256"])
        self.assertEqual(b"before\n",Path(result["consequence"]["backup"]).read_bytes())
        self.assert_hold(m.safe_execute(job,self.root,self.st),"CONFLICT_SOURCE_HASH_CHANGED")
    def test_grant_expired(self):
        m.grant_edits(self.st,1)
        m.private_json(self.st/"edit-grant.json",{"expires_utc":1})
        with self.assertRaises(m.Hold):m.check_grant(self.st)
    def test_token_secure(self):
        token=m.get_local_token(self.st)
        self.assertGreaterEqual(len(token),32)
        self.assertEqual(token,m.get_local_token(self.st))
        self.assertEqual(0,(self.st/"local-token").stat().st_mode & 0o077)
    def test_mailbox_private_refusal(self):
        gh=DummyGH([],private=False)
        with self.assertRaises(m.Hold):m.process_mailbox(gh,self.root,self.st)
    def issue(self,id=100):
        return {"id":id,"number":17,"title":"JM PHONE COMMAND: fixture", "state":"open","user":{"login":"JMisJustMe"},"labels":[{"name":"jm-phone-command"}],"body":json.dumps(self.job("status"))}
    def test_mailbox_once_and_close(self):
        gh=DummyGH([self.issue()])
        events=m.process_mailbox(gh,self.root,self.st)
        self.assertEqual([{"issue":17,"state":"CLOSED"}],events)
        self.assertEqual([17],gh.closed)
        self.assertEqual(1,len(gh.comments))
        self.assertEqual(1,len(m.load_json(self.st/"mailbox-ledger.json")))
        m.process_mailbox(gh,self.root,self.st)
        self.assertEqual(1,len(gh.comments))
    def test_mailbox_reject_foreign_author(self):
        job=self.issue();job["user"]["login"]="intruder"
        gh=DummyGH([job]);self.assertEqual([],m.process_mailbox(gh,self.root,self.st))
    def test_mailbox_reject_wrong_title(self):
        job=self.issue();job["title"]="unrelated"
        gh=DummyGH([job]);self.assertEqual([],m.process_mailbox(gh,self.root,self.st))
    def test_mailbox_crash_reentry_never_reexecutes(self):
        m.private_json(self.st/"mailbox-ledger.json",{"100":{"state":"CLAIMED","number":17}})
        gh=DummyGH([self.issue()])
        events=m.process_mailbox(gh,self.root,self.st)
        self.assertEqual("CLOSED",events[0]["state"])
        self.assertIn("CRASH_BEFORE_RESULT",gh.comments[0][1])
    def test_mailbox_retry_comment_not_execution(self):
        m.private_json(self.st/"mailbox-ledger.json",{"100":{"state":"RESULT_READY","number":17,"receipt":{"state":"PASS","consequence":{"result":"PASS"}}}})
        gh=DummyGH([self.issue()])
        m.process_mailbox(gh,self.root,self.st)
        self.assertEqual(1,len(gh.comments))
    def test_repo_allowlist_rejected(self):
        with self.assertRaises(m.Hold):m.GitHub("x",repo="public/repo")
    def test_workspace_guard(self):
        with self.assertRaises(m.Hold):m.workspace(self.base)
    def test_no_remote_shell(self):
        self.assertNotIn("shell",m.COMMANDS)
        self.assertNotIn("run-command",m.COMMANDS)
    def test_unverified_android_not_labeled_host_pass(self):
        self.assertEqual("JM.PhoneCommand/0.1",m.SCHEMA)
        self.assertIn("127.0.0.1",Path(m.__file__).read_text())

if __name__=="__main__":unittest.main(verbosity=2)