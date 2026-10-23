#!/usr/bin/env python3
"""JM full-book carrier v0.3: byte-preserving chunk adapter to original JM tools.
Chunks are NOT independent books. No original is replaced or promoted.
"""
from __future__ import annotations
import hashlib,json,argparse
from pathlib import Path
import jm_knowledge_intake as intake
import jm_knowledge_assurance as assurance
import jm_knowledge_query as query

SCHEMA="JM.KnowledgeFullBookCarrier/0.3"
def sha(b):return hashlib.sha256(b).hexdigest()
def enc(x):return (json.dumps(x,sort_keys=True,ensure_ascii=False,indent=2)+"\n").encode("utf8")

def plan(originals):
    if not 1<=len(originals)<=3:raise assurance.Held("BOOK_COUNT_LIMIT")
    books=[];pieces=[];seen=set()
    for index,path in enumerate(originals,1):
        p=Path(path)
        if not p.is_file() or p.is_symlink() or p.suffix.lower()!=".txt":
            raise assurance.Held("ORIGINAL_NOT_REGULAR_TEXT")
        raw=p.read_bytes()
        if not 0<len(raw)<=15000000:raise assurance.Held("ORIGINAL_BYTES_LIMIT")
        if sha(raw) in seen:raise assurance.Held("DUPLICATE_ORIGINAL")
        seen.add(sha(raw))
        try:raw.decode("utf-8-sig")
        except UnicodeError:raise assurance.Held("ORIGINAL_NOT_UTF8")
        lines=raw.splitlines(keepends=True)
        batch=[];used=0;first=1;sub=[]
        def flush(last):
            nonlocal batch,used,first
            if not batch:return
            body=b"".join(batch)
            name=f"book{index:02}_part{len(sub)+1:02}.txt"
            sub.append({"file":name,"sha256":sha(body),"first_line":first,"last_line":last,"bytes":len(body)})
            pieces.append((name,body))
            batch=[];used=0;first=last+1
        for lineno,line in enumerate(lines,1):
            if len(line)>950000:raise assurance.Held("OVERSIZED_LINE")
            if batch and (len(batch)>=4000 or used+len(line)>950000):flush(lineno-1)
            batch.append(line);used+=len(line)
        flush(len(lines))
        if b"".join(dict(pieces)[m["file"]] for m in sub)!=raw:
            raise assurance.Held("REASSEMBLY_MISMATCH")
        books.append({"original_name":p.name,"sha256":sha(raw),"bytes":len(raw),
                      "line_count":len(lines),"chunks":sub})
    if len(pieces)>12:raise assurance.Held("JM_MAX_SOURCE_COUNT")
    return {"schema":SCHEMA,"state":"HELD","books":books,
            "original_documents":len(books),"chunks":len(pieces),
            "chunks_independent_sources":False,"authority":"NONE"},pieces

def stage(originals,folder):
    folder=Path(folder)
    if folder.exists() or folder.is_symlink():raise assurance.Held("STAGE_EXISTS")
    if any(folder.resolve().is_relative_to(Path(p).resolve()) for p in originals):
        raise assurance.Held("STAGE_INSIDE_SOURCE")
    manifest,blocks=plan(originals)
    folder.mkdir(parents=True,exist_ok=False)
    for name,body in blocks:(folder/name).write_bytes(body)
    (folder/"BOOK_MANIFEST.json").write_bytes(enc(manifest))
    verify(originals,folder)
    return manifest

def verify(originals,folder):
    folder=Path(folder)
    if not folder.is_dir() or folder.is_symlink():raise assurance.Held("STAGE_INVALID")
    manifest,blocks=plan(originals)
    if (folder/"BOOK_MANIFEST.json").read_bytes()!=enc(manifest):
        raise assurance.Held("MANIFEST_DRIFT")
    if {p.name for p in folder.iterdir()}!={"BOOK_MANIFEST.json",*(name for name,_ in blocks)}:
        raise assurance.Held("FILE_SET_DRIFT")
    for name,body in blocks:
        p=folder/name
        if not p.is_file() or p.is_symlink() or p.read_bytes()!=body:
            raise assurance.Held("CHUNK_DRIFT")
    return manifest

def run(originals,folder,question="habit",top=6):
    folder=Path(folder)
    manifest=verify(originals,folder)
    chunks=[folder / c["file"] for b in manifest["books"] for c in b["chunks"]]
    candidate=folder.parent/(folder.name+"_JM_CANDIDATE")
    if candidate.exists():raise assurance.Held("CANDIDATE_EXISTS")
    intake.compile_sources(chunks,candidate,question)
    if not isinstance(top,int) or not 1<=top<=20:raise assurance.Held("INVALID_TOP")
    found=query.query(candidate,chunks,question,top)
    # Original JM source replay and lexical ranking remain sovereign and unchanged.
    # Query a bounded 20-passage candidate pool; re-order only the downstream
    # *presentation* by the ORIGINAL book parent, never by the chunk identity.
    pool=query.query(candidate,chunks,question,20)
    verify(originals,folder)
    if (found["source_integrity"]!="PASS_REPLAY" or
        pool["source_integrity"]!="PASS_REPLAY"):raise assurance.Held("CANONICAL_REPLAY_FAILED")
    bookmap={c["sha256"]:(b["original_name"],b["sha256"],c["first_line"])
             for b in manifest["books"] for c in b["chunks"]}
    original_top=found["matches"]
    first=[];rest=[];seen=set()
    for r in pool["matches"]:
        parent=bookmap[r["source_id"]][1]
        if parent in seen:rest.append(r)
        else:first.append(r);seen.add(parent)
    selected=(first+rest)[:top]
    def map_passages(rows):
        out=[]
        for r in rows:
            name,parent,start=bookmap[r["source_id"]]
            out.append({"original_name":name,"original_sha256":parent,
                        "original_line":(start+r["line"]-1) if r["line"] else None,
                        "chunk_sha256":r["source_id"],
                        "quote_UNTRUSTED_DATA":r["quote_UNTRUSTED_DATA"]})
        return out
    original_mapped=map_passages(original_top)
    matches=map_passages(selected)
    return {"schema":SCHEMA,"state":"HELD","original_documents":manifest["original_documents"],
            "physical_chunks":manifest["chunks"],"matched_passages":len(matches),
            "canonical_chunk_coverage":found["source_coverage"]["distinct_source_documents"],
            "canonical_original_document_coverage":len({r["original_sha256"] for r in original_mapped}),
            "true_document_coverage":len({r["original_sha256"] for r in matches}),
            "parent_aware_policy":"FIRST_PER_ORIGINAL_DOCUMENT_THEN_ORIGINAL_ORDER",
            "parent_aware_pool_limit":20,
            "original_sha256":[b["sha256"] for b in manifest["books"]],
            "original_replay":"PASS","canonical_jm_query_replay":"PASS",
            "matches":matches,"model_trained":False,"agent_executed":False,
            "promotion":"NOT_ALLOWED",
            "claim_boundary":"Chunks retain their book parent; this is not an intelligence or answer-quality proof."}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--book",action="append",required=True,type=Path)
    p.add_argument("--folder",required=True,type=Path)
    p.add_argument("--query",default="habit")
    x=p.parse_args()
    try:
        stage(x.book,x.folder)
        got=run(x.book,x.folder,x.query)
        print(json.dumps(got,sort_keys=True,ensure_ascii=False,indent=2))
        return 0
    except (assurance.Held,ValueError,OSError,KeyError) as e:
        print(json.dumps({"state":"BUGG","error":str(e) if isinstance(e,assurance.Held) else type(e).__name__,
                          "promotion":"NOT_ALLOWED"}))
        return 1

if __name__=="__main__":raise SystemExit(main())
