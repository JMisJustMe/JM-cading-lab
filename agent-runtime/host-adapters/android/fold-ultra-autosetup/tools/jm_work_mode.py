#!/usr/bin/env python3
"""JM ECOSTATE Work Mode CP01 — manual, headless, bounded, non-destructive.

Original-donor adjunct for JM Fold Ultra Home Lab, not the retired JM ON MODE.
One owner click starts a fixed allowlisted local job queue on GroundZeroJM.
No device power/screen changes, secrets, listener, arbitrary shell, or silent upload.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

WORK_DIR = Path(os.environ.get("JM_WORK_MODE_STATE") or
                (Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) /
                 "JM_ECOSTATE" / "JM_WORK_MODE_CP01"))
STATE = WORK_DIR / "state.json"
RUN_LOCK = WORK_DIR / "run.lock"
STOP = WORK_DIR / "stop.request"
LOG = WORK_DIR / "runs.jsonl"
SCHEMA = "JM.WorkMode/0.1"


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def repo_default() -> Path:
    # .../agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/
    return Path(__file__).resolve().parents[5]


def ensure_repo(repo: Path) -> Path:
    repo = repo.resolve()
    required = (".git", "scripts/jm_build_execution.py", "agent-runtime/jm_agent_runtime.py")
    if not all((repo / item).exists() for item in required):
        raise RuntimeError("HOLD: use an existing JM-cading-lab checkout; required donors not found")
    return repo


def atomically_write_json(path: Path, body: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + "." + uuid.uuid4().hex[:8] + ".tmp")
    try:
        tmp.write_text(json.dumps(body, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def read_state() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"schema": SCHEMA, "status": "IDLE", "details": "No run yet"}
    except (ValueError, OSError):
        return {"schema": SCHEMA, "status": "HOLD", "details": "State unreadable; inspect before reactivating"}


def add_receipt(event: dict) -> None:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as fp:
        fp.write(json.dumps({"at_utc": now(), **event}, ensure_ascii=False) + "\n")


def jobs() -> list[tuple[str, list[str]]]:
    # Explicitly allowlisted, read-only / self-test operations; no shell=True.
    # Tests compile in memory, avoiding __pycache__ changes to originals.
    return [
        ("Git HEAD", ["git", "rev-parse", "--verify", "HEAD"]),
        ("Tracked changes", ["git", "status", "--porcelain=v1", "--untracked-files=no"]),
        ("JM execution contract self-test", [sys.executable, "scripts/jm_build_execution.py", "--self-test"]),
        ("JM runtime source syntax", [sys.executable, "-c", "from pathlib import Path; p=Path('agent-runtime/jm_agent_runtime.py');compile(p.read_bytes(),str(p),'exec');print('SOURCE_COMPILE_PASS')"]),
    ]


def run(repo: Path) -> int:
    repo = ensure_repo(repo)
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(str(RUN_LOCK), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        print("HOLD: a previous run lock exists. Inspect state before another launch.")
        return 2
    os.close(fd)
    session = uuid.uuid4().hex[:16]
    STOP.unlink(missing_ok=True)
    report = {"schema": SCHEMA, "status": "RUNNING", "session": session,
              "started_utc": now(), "repo": str(repo), "pid": os.getpid(), "completed": 0,
              "total": len(jobs()), "last_job": None}
    atomically_write_json(STATE, report)
    add_receipt({"event": "SESSION_STARTED", "session": session, "repo": str(repo)})
    fails = 0
    try:
        for name, argv in jobs():
            if STOP.exists():
                report["status"] = "STOPPED"
                add_receipt({"event": "STOP_AFTER_JOB", "session": session})
                break
            report["last_job"] = name
            atomically_write_json(STATE, report)
            start = time.monotonic()
            try:
                p = subprocess.run(argv, shell=False, cwd=repo,
                                   capture_output=True, text=True,
                                   encoding="utf-8", errors="replace", timeout=120,
                                   env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
                code, stdout, stderr = p.returncode, p.stdout, p.stderr
            except (OSError, subprocess.TimeoutExpired) as error:
                code, stdout, stderr = 124, "", str(error)
            stdout_sha = hashlib.sha256(stdout.encode("utf-8")).hexdigest()
            add_receipt({"event": "JOB_RESULT", "session": session, "job": name,
                         "argv": argv, "exit_code": code,
                         "elapsed_seconds": round(time.monotonic() - start, 3),
                         "stdout_sha256": stdout_sha,
                         "stdout_excerpt": stdout[:2500], "stderr_excerpt": stderr[:2500]})
            report["completed"] += 1
            report["last_exit_code"] = code
            if code != 0:
                fails += 1
            atomically_write_json(STATE, report)
        else:
            report["status"] = "PASS" if fails == 0 else "PARTIAL_FAILURE"
    except BaseException as e:
        report["status"] = "HOLD"
        report["error"] = type(e).__name__ + ": " + str(e)[:400]
        add_receipt({"event": "RUN_ERROR", "session": session, "error": report["error"]})
    finally:
        report["ended_utc"] = now()
        report["failed_jobs"] = fails
        atomically_write_json(STATE, report)
        add_receipt({"event": "SESSION_FINISHED", "session": session, "status": report["status"],
                     "completed": report["completed"], "total": report["total"]})
        RUN_LOCK.unlink(missing_ok=True)
        STOP.unlink(missing_ok=True)
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 2


def start(repo: Path) -> int:
    repo = ensure_repo(repo)
    if RUN_LOCK.exists() or read_state().get("status") == "RUNNING":
        print("HOLD: previous run may still be active; no second job queue started.")
        return 2
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    argv = [sys.executable, str(Path(__file__).resolve()), "run", "--repo", str(repo)]
    kw = {"stdin": subprocess.DEVNULL, "cwd": str(repo)}
    if os.name == "nt":
        kw["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
    else:
        kw["start_new_session"] = True
    with (WORK_DIR / "worker.out").open("a", encoding="utf-8") as out, \
         (WORK_DIR / "worker.err").open("a", encoding="utf-8") as err:
        subprocess.Popen(argv, stdout=out, stderr=err, **kw)
    print("JM WORK MODE: manual activation requested; open STATUS to check run proof.")
    return 0


def stop() -> int:
    if read_state().get("status") != "RUNNING":
        print("JM WORK MODE: no running queue")
        return 0
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    STOP.write_text("Owner stop after current job.\n", encoding="utf-8")
    print("JM WORK MODE: stop requested. Current job finishes before exit.")
    return 0


def gui(repo: Path) -> int:
    # GUI is optional: CLI works on headless Windows/Python installations too.
    import tkinter as tk
    root = tk.Tk()
    root.title("JM ECOSTATE | Work Mode")
    root.geometry("470x390")
    root.minsize(430, 360)
    root.configure(bg="#111827")
    tk.Label(root, text="JM ECOSTATE", font=("Segoe UI", 22, "bold"),
             fg="white", bg="#111827").pack(pady=(25, 2))
    tk.Label(root, text="Manual work mode · no screen-awake changes",
             font=("Segoe UI", 10), fg="#b8c2d5", bg="#111827").pack(pady=(0, 16))
    result = tk.StringVar(value="Checking current status…")
    tk.Button(root, text="▶  ACTIVATE NOW", font=("Segoe UI", 18, "bold"),
              bg="#266dba", fg="white", activebackground="#1b568e",
              relief="flat", height=2, command=lambda: (start(repo), refresh())).pack(fill="x", padx=28, pady=6)
    tk.Button(root, text="■  STOP AFTER CURRENT JOB", font=("Segoe UI", 11),
              bg="#273142", fg="white", relief="flat", height=2,
              command=lambda: (stop(), refresh())).pack(fill="x", padx=28, pady=5)
    tk.Label(root, textvariable=result, font=("Segoe UI", 11),
             fg="#d6e2f2", bg="#111827", justify="center", wraplength=410).pack(pady=12)
    tk.Label(root, text="Laptop must stay powered. Screen may lock.\n"
             "Jobs run independently of this window. No device wake changes.",
             font=("Segoe UI", 9), fg="#a7b2c6", bg="#111827", justify="center").pack(pady=2)
    def refresh():
        s = read_state()
        result.set("{}  ·  {}/{} jobs\n{}".format(s.get("status"), s.get("completed", 0),
                s.get("total", len(jobs())), s.get("last_job") or s.get("details", "Ready")))
    def tick():
        refresh()
        root.after(1200, tick)
    tick()
    root.mainloop()
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["gui", "start", "run", "status", "stop", "self-test"])
    parser.add_argument("--repo", type=Path, default=None)
    args = parser.parse_args(argv)
    if args.action == "status":
        print(json.dumps(read_state(), indent=2))
        return 0
    if args.action == "stop":
        return stop()
    if args.action == "self-test":
        assert len(jobs()) == 4
        assert all(isinstance(a, list) and len(a) >= 2 for _, a in jobs())
        print("JM Work Mode structural self-test PASS: four allowlisted jobs, no network listener")
        return 0
    repo = args.repo if args.repo is not None else repo_default()
    if args.action == "run":
        return run(repo)
    if args.action == "start":
        return start(repo)
    return gui(ensure_repo(repo))


if __name__ == "__main__":
    raise SystemExit(main())
