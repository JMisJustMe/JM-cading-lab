#!/usr/bin/env python3
"""RUKQUSS CP08 — draft-only public subdomain alias graft.

Takes an EXACT already-reviewed CP07 Worker candidate and produces a separate
LOCAL CP08 candidate. Does not create DNS, bind domains, deploy, merge or
publish. The existing original RUKQUSS HTML and protected ROMBOTS/control
services are not rewritten.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

CP07_WORKER_SHA256 = "36ba49b73f92d6d38b8414f15ffc8ba453cc1a2b95c224cfa54ff247203f0c28"
ANCHOR = "if(u.pathname==='/__jm_status')"
CP08_INSERTION = """/* CP08_PUBLIC_SUBDOMAINS_DRAFT_ONLY */
const jmCp08PublicAliases = Object.freeze({
  'games.rukquss.com':'https://rukquss.com/games',
  'apps.rukquss.com':'https://rukquss.com/apps',
  'music.rukquss.com':'https://rukquss.com/music'
});
if (Object.prototype.hasOwnProperty.call(jmCp08PublicAliases,u.hostname)) {
  if ((event.request.method==='GET'||event.request.method==='HEAD')
      && (u.pathname==='/'||u.pathname==='/index.html')) {
    return new Response(null,{status:302,headers:{
      'Location':jmCp08PublicAliases[u.hostname],
      'Cache-Control':'private, no-store, max-age=0',
      'Referrer-Policy':'no-referrer',
      'X-Content-Type-Options':'nosniff'
    }});
  }
  return new Response('Not Found',{status:404,headers:{
    'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'
  }});
}
if(u.hostname!=='rukquss.com')return new Response('Not Found',{status:404});
"""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def draft_candidate(current_bytes: bytes) -> tuple[bytes, dict]:
    if sha256(current_bytes) != CP07_WORKER_SHA256:
        raise ValueError("CP08 HOLD: parent Worker source drift; recover, do not guess")
    current = current_bytes.decode("utf-8")
    if current.count(ANCHOR) != 1 or "CP08_PUBLIC_SUBDOMAINS_DRAFT_ONLY" in current:
        raise ValueError("CP08 HOLD: carrier not uniquely graftable")
    modified = current.replace(ANCHOR, CP08_INSERTION + ANCHOR, 1)
    if modified.replace(CP08_INSERTION, "", 1) != current:
        raise ValueError("CP08 HOLD: unrelated Worker code changed")
    for keyword in ("rombots.rukquss.com", "control.rukquss.com"):
        if keyword in CP08_INSERTION:
            raise ValueError("CP08 HOLD: private host incorrectly included")
    assembled = modified.encode("utf-8")
    receipt = {
        "schema": "JM.RUKQUSS.Subdomains.PublicAlias.CP08/1",
        "proof_scope": "SOURCE_STATIC_LOCAL_RUNTIME_ONLY",
        "input_worker_sha256": CP07_WORKER_SHA256,
        "candidate_worker_sha256": sha256(assembled),
        "public_candidate_alias_count": 3,
        "private_subdomains_reserved_unchanged": True,
        "cloudflare_dns_or_custom_domain_activated": False,
        "deployment": False,
        "release_approved": False,
        "one_graft_only": True,
    }
    return assembled, receipt


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--reviewed-worker", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--receipt", type=Path, required=True)
    args = p.parse_args()
    paths = [x.resolve() for x in (args.reviewed_worker, args.out, args.receipt)]
    if len(set(paths)) != 3:
        raise ValueError("CP08 HOLD: refuses to overwrite the verified parent")
    result, receipt = draft_candidate(args.reviewed_worker.read_bytes())
    args.out.write_bytes(result)
    args.receipt.write_bytes((json.dumps(receipt, sort_keys=True, indent=2)+"\n").encode("utf-8"))
    if sha256(args.out.read_bytes()) != receipt["candidate_worker_sha256"]:
        raise ValueError("CP08 HOLD: candidate bytes mismatch receipt")
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
