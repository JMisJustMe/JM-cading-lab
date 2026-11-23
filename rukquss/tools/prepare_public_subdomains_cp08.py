#!/usr/bin/env python3
"""RUKQUSS CP08→CP10 — draft-only public subdomain alias graft.

Takes an EXACT already-reviewed CP07 Worker candidate and produces a separate
LOCAL CP08 candidate. Does not create DNS, bind domains, deploy, merge or
publish. The existing original RUKQUSS HTML and protected ROMBOTS/control
services are not rewritten.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import ast
import re
from pathlib import Path

CP07_WORKER_SHA256 = "36ba49b73f92d6d38b8414f15ffc8ba453cc1a2b95c224cfa54ff247203f0c28"
ANCHOR = "if(u.pathname==='/__jm_status')"
CP08_INSERTION = """/* CP08_PUBLIC_SUBDOMAINS_DRAFT_ONLY */
const jmCp08PublicAliases = Object.freeze({
  'games.rukquss.com':'/games',
  'apps.rukquss.com':'/apps',
  'music.rukquss.com':'/music',
  'coding.rukquss.com':'/coding',
  'theory.rukquss.com':'/theory',
  'books.rukquss.com':'/books'
});
if (Object.prototype.hasOwnProperty.call(jmCp08PublicAliases,u.hostname)) {
  const jmPublicPath=jmCp08PublicAliases[u.hostname];
  const jmResolved=JM_CP01_ROOMS[jmPublicPath];
  if (!jmResolved || !jmResolved.startsWith('https://jmisjustme.github.io/JM-cading-lab/'))
    return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
  if ((event.request.method==='GET'||event.request.method==='HEAD')
      && (u.pathname==='/'||u.pathname==='/index.html')) {
    return new Response(null,{status:302,headers:{
      'Location':jmResolved,
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
        raise ValueError("CP10 HOLD: parent Worker source drift; recover, do not guess")
    current = current_bytes.decode("utf-8")
    if current.count(ANCHOR) != 1 or "CP08_PUBLIC_SUBDOMAINS_DRAFT_ONLY" in current:
        raise ValueError("CP10 HOLD: carrier not uniquely graftable")
    modified = current.replace(ANCHOR, CP08_INSERTION + ANCHOR, 1)
    if modified.replace(CP08_INSERTION, "", 1) != current:
        raise ValueError("CP10 HOLD: unrelated Worker code changed")
    # One authority for destination URLs: reuse the ORIGINAL 11-route table.
    # Fail closed on extra/missing hostnames, malformed destinations or drift.
    expected = {
        "games.rukquss.com": "/games",
        "apps.rukquss.com": "/apps",
        "music.rukquss.com": "/music",
        "coding.rukquss.com": "/coding",
        "theory.rukquss.com": "/theory",
        "books.rukquss.com": "/books",
    }
    alias_match = re.search(
        r"const jmCp08PublicAliases = Object\.freeze\((\{.*?\})\);",
        CP08_INSERTION, re.S
    )
    if alias_match is None:
        raise ValueError("CP10 HOLD: alias table not found")
    try:
        aliases = ast.literal_eval(alias_match.group(1))
    except (ValueError, SyntaxError) as error:
        raise ValueError("CP10 HOLD: invalid alias table") from error
    if aliases != expected:
        raise ValueError("CP10 HOLD: alias table contract differs from six exact public routes")
    rooms_match = re.search(r"const JM_CP01_ROOMS = (\{[^;\n]+\});", current)
    if rooms_match is None:
        raise ValueError("CP10 HOLD: original public routing authority missing")
    original_rooms = json.loads(rooms_match.group(1))
    if (not all(path in original_rooms for path in aliases.values())
            or not all(original_rooms[path].startswith(
                "https://jmisjustme.github.io/JM-cading-lab/"
            ) for path in aliases.values())):
        raise ValueError("CP10 HOLD: public alias destinations departed from original estate")
    if ("'Location':jmResolved" not in CP08_INSERTION
            or "const jmResolved=JM_CP01_ROOMS[jmPublicPath]" not in CP08_INSERTION):
        raise ValueError("CP10 HOLD: aliases no longer use original route authority")
    assembled = modified.encode("utf-8")
    receipt = {
        "schema": "JM.RUKQUSS.Subdomains.PublicAlias.CP10/1",
        "proof_scope": "SOURCE_STATIC_LOCAL_RUNTIME_ONLY",
        "input_worker_sha256": CP07_WORKER_SHA256,
        "candidate_worker_sha256": sha256(assembled),
        "public_candidate_alias_count": 6,
        "original_path_authority": "JM_CP01_ROOMS",
        "redirect_hops_from_candidate_to_original": 1,
        "private_subdomains_not_modified_by_this_tool": True,
        "cloudflare_dns_or_custom_domain_changed_by_this_tool": False,
        "live_activation_checked_by_this_tool": False,
        "deployment_performed_by_this_tool": False,
        "release_approved": False,
        "one_graft_only": True,
    }
    return assembled, receipt



def self_test(current_bytes: bytes) -> int:
    """Mutation testing: bad aliases, bad authority and changed parent must HOLD."""
    global CP08_INSERTION
    good = CP08_INSERTION
    fixtures = [
        ("missing one public route", good.replace(
            "  'books.rukquss.com':'/books'\n", "")),
        ("wrong original destination", good.replace(
            "'music.rukquss.com':'/music'", "'music.rukquss.com':'/career'")),
        ("unexpected seventh public host", good.replace(
            "  'books.rukquss.com':'/books'",
            "  'books.rukquss.com':'/books',\n  'extra.rukquss.com':'/career'")),
        ("routing authority bypass", good.replace(
            "const jmResolved=JM_CP01_ROOMS[jmPublicPath]",
            "const jmResolved='https://example.invalid/override'")),
        ("direct redirect removed", good.replace(
            "'Location':jmResolved", "'Location':'https://rukquss.com/games'")),
        ("malformed alias object", good.replace(
            "'apps.rukquss.com':'/apps'", "'apps.rukquss.com'=false")),
    ]
    passed = 0
    try:
        for title, mutant in fixtures:
            if mutant == good:
                raise AssertionError("CP10 HOLD: mutation test ineffective: " + title)
            CP08_INSERTION = mutant
            try:
                draft_candidate(current_bytes)
            except ValueError:
                passed += 1
            else:
                raise AssertionError("CP10 HOLD: invalid modification accepted: " + title)
    finally:
        CP08_INSERTION = good
    for title, altered in [
        ("parent content drift", current_bytes + b"X"),
        ("parent route byte drift", current_bytes.replace(
            b'"/music":', b'"/audio":', 1)),
    ]:
        if altered == current_bytes:
            raise AssertionError("CP10 HOLD: mutation test ineffective: " + title)
        try:
            draft_candidate(altered)
        except ValueError:
            passed += 1
        else:
            raise AssertionError("CP10 HOLD: unexpected parent source accepted: " + title)
    return passed


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--reviewed-worker", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--receipt", type=Path, required=True)
    p.add_argument("--self-test", action="store_true",
                   help="reject eight deliberately invalid source changes")
    args = p.parse_args()
    paths = [x.resolve() for x in (args.reviewed_worker, args.out, args.receipt)]
    if len(set(paths)) != 3:
        raise ValueError("CP10 HOLD: refuses to overwrite the verified parent")
    parent_bytes = args.reviewed_worker.read_bytes()
    result, receipt = draft_candidate(parent_bytes)
    if args.self_test:
        receipt["negative_mutation_fixtures_passed"] = self_test(parent_bytes)
    args.out.write_bytes(result)
    args.receipt.write_bytes((json.dumps(receipt, sort_keys=True, indent=2)+"\n").encode("utf-8"))
    if sha256(args.out.read_bytes()) != receipt["candidate_worker_sha256"]:
        raise ValueError("CP10 HOLD: candidate bytes mismatch receipt")
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
