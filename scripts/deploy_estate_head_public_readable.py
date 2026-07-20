#!/usr/bin/env python3
"""Readable-source wrapper for the Estate Head Cloudflare rail.

Builds the public Head from plain governed repository records. The richer owner
registry remains private; this projection carries five live anchors plus all 56
named gap-governance records, matching the governed 61-record public count.
"""
from __future__ import annotations

import json
from pathlib import Path

import deploy_estate_head_public_resilient as rail

HOUSES = [
    ("H00","Estate Head & Command","Governance, receipts, Project Heads and recovery control.","owner-control"),
    ("H01","Source & Creator","Authorship, creator identity and public/private separation.","split"),
    ("H02","Theories & Publications","Theory bodies, books, readers and claim governance.","split"),
    ("H03","Coding & Runtimes","Cading, parsers, runtimes, emitters and proof tools.","owner-source"),
    ("H04","Games & Beyond","Games, engines, worlds and gaming platforms.","split"),
    ("H05","Apps & Tools","Apps, notebooks, utilities and creative tools.","split"),
    ("H06","Lyrics & Music","B. Lyrikz source, LyricStudio and performance bodies.","split"),
    ("H07","Websites & Public Doors","Cloudflare Estate, public Houses and deployment truth.","public"),
    ("H08","OS & Estate Infrastructure","Navigator, Estate OS, routing and persistence.","owner-control"),
    ("H09","Commercial Providings","Legal outward providings, pricing and fulfilment.","split"),
    ("H10","Archives & Recovery","Living Library, Zionfolders and gap recovery.","owner-source"),
]
PREFIX_HOUSE = {"JM-GOV":"H00","JM-SUB":"H00","JM-THE":"H02","JM-HUM":"H02","JM-COD":"H03","JM-ENG":"H04","JM-GAM":"H04","JM-FTR":"H08","JM-APP":"H05","JM-MUS":"H06","JM-SRC":"H10","JM-STO":"H10"}
HEADS = [
    ("PH-ESTATE","Estate & Command Head","H00","JM ESTATE HEAD v0.2.1"),
    ("PH-AUTHOR","Author / Source Head","H01","Author Master Body v0.3"),
    ("PH-THEORY","Theory Head","H02","JM Theory Multihub"),
    ("PH-CODING","Coding Head","H03","JM Coding Estate"),
    ("PH-GAMES","Games & Beyond Head","H04","Games&Beyond + RouteOS"),
    ("PH-APPS","Apps & Tools Head","H05","JM Non-Game Apps House"),
    ("PH-LYRICS","Lyrics & Music Head","H06","JM LyricStudio v0.5.1"),
    ("PH-WEB","Website & Public Doors Head","H07","JMISJUSTME Living Estate"),
    ("PH-OS","OS / Navigator Head","H08","JM3232 Navigator + Stringline"),
    ("PH-COMMERCE","Commercial Providings Head","H09","Providings Architecture"),
    ("PH-RECOVERY","Living Library & Recovery Head","H10","Gap Governance Register"),
]
PUBLIC = {"H02":"/theory/","H04":"/games-beyond/","H05":"/apps/","H06":"/lyrics/","H07":"/","H10":"/recovery/"}
CHAIN = ["Source Ledger","Latest Body Finder","Source-Body Auditor","Current Best Register","Crown Register","Living Register"]


def gap_house(gap_id: str) -> str:
    return next((house for prefix, house in PREFIX_HOUSE.items() if gap_id.startswith(prefix)), "H10")


def readable_subset() -> dict:
    current = json.loads(Path("registry/estate-head-public-current.json").read_text())
    gaps = json.loads(Path("registry/estate-gap-governance-breach-v0.2.json").read_text())
    stringline = json.loads(Path("navigator/stringline.json").read_text())
    authority = json.loads(Path("registry/estate-classification-authority-v1.0.json").read_text())
    anchors = [
        ("EH-001","H00","JM ESTATE HEAD","v0.2.1","Public authority","/estate-head/"),
        ("WEB-001","H07","JMISJUSTME Living Estate","Canonical Cloudflare door","Live","/"),
        ("APP-001","H05","JM Non-Game Apps House","Public governed House","Live","/apps/"),
        ("THEORY-001","H02","JM Theory Multihub","Public full-body corridor","Live","/theory/"),
        ("LYRICS-001","H06","JM LyricStudio","v0.5.1","Live","/lyrics/"),
    ]
    bodies = [{"id":i,"house":h,"name":n,"version":v,"status":s,"proof":"Governed live anchor in the shared public Head.","public":u,"next":"Keep source, route and proof receipts aligned."} for i,h,n,v,s,u in anchors]
    for gap in gaps.get("body_gaps", []):
        state = gap.get("state", "OPEN")
        bodies.append({
            "id":gap.get("id"), "house":gap_house(str(gap.get("id", ""))), "name":gap.get("name"),
            "version":"Gap-governance record v0.2.1", "status":state.title(),
            "proof":f"Named and protected in the 56-record gap register; current state {state}.",
            "public":"/games-beyond/routeos/" if gap.get("id") == "JM-APP-001-ROUTEOS" else "",
            "next":"Pass Source Ledger → Finder → Auditor → Current Best → Crown → Living before promotion.",
        })
    if len(bodies) != current["body_count"]:
        raise RuntimeError(f"Public record count drift: {len(bodies)} != {current['body_count']}")
    projects = {p.get("id"):p for p in stringline.get("seed_project_strings", [])}
    games = projects.get("games-beyond", {})
    routeos = next((b for b in authority.get("bodies", []) if b.get("id") == "routeos"), {})
    heads = [{"id":i,"name":n,"house":h,"current":c,"public":PUBLIC.get(h, ""),"next":"Keep the governing body, proof lane and next action current."} for i,n,h,c in HEADS]
    return {
        "meta":{"title":"JM ESTATE HEAD","version":"v0.2.1","edition":"Readable Public Governance Projection","created":current.get("effective_date"),"authority":current.get("authority"),"status":"PUBLIC-CONSUMED / OWNER-MEMBRANE-PRESERVED / NOT-FULL-CENSUS-CROWNED","keeper":"Many bodies. One living line. None erased.","body_count":current["body_count"],"project_head_count":current["project_head_count"],"record_scope":"Five live anchors plus all 56 protected gap-governance records; richer owner registry remains private."},
        "houses":[{"id":i,"name":n,"purpose":p,"privacy":v} for i,n,p,v in HOUSES],
        "bodies":bodies,
        "project_heads":heads,
        "achievement_passports":[
            {"id":"ACH-001","name":"JM ESTATE HEAD v0.2.1","house":"H00","built":"A governed shared public source backed by an owner Head.","evidence":"Public contract, gap register, Stringline and deployment receipts.","limits":"The richer owner registry and raw recovery evidence remain private.","door":"/estate-head/","next":"Keep public consumers and owner authority in parity."},
            {"id":"ACH-002","name":"RouteOS — Gaming Platform","house":"H04","built":routeos.get("governing_identity", "JM gaming platform, console OS and cartridge ecosystem"),"evidence":"Sovereign Games&Beyond seat, cartridge standard and classification gate.","limits":"Proof remains version- and device-specific.","door":"/games-beyond/routeos/","next":"Preserve the recovered keeper and runnable console route."},
            {"id":"ACH-003","name":"Games&Beyond Stringline","house":"H04","built":f"A governed {len(games.get('bodies', []))}-body project string.","evidence":"Stringline and canonical seating annex.","limits":"Individual current-best receipts remain separate.","door":"/games-beyond/","next":"Complete source/current-best receipts."},
        ],
        "stringline_consumption":{"version":stringline.get("version"),"status":"CONSUMED_IN_OWNER_AND_PUBLIC_HEAD","project_string":"games-beyond","project_body_count":len(games.get("bodies", [])),"bodies":[{"id":b.get("id"),"name":b.get("name"),"state":b.get("status")} for b in games.get("bodies", [])]},
        "governance_gate":{"version":"v1.0","status":"MANDATORY","chain":CHAIN,"promotion_decision":"PASS only when all six stages are present; otherwise hold in Recovery."},
        "gap_snapshot":{"historical_gap_entries":56,"current_classification":current["gap_snapshot"],"boundary":"Names and states only; raw gap evidence remains owner-side."},
    }


rail.base.decode_subset = readable_subset

if __name__ == "__main__":
    rail.base.main()
