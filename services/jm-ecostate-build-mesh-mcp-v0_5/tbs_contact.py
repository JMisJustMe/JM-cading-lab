"""JM BRAIDGE/TBS: source-preserving, non-authorizing relationship assessment.
Pure adapter for existing Build Mesh; no state writes, ownership transfer or proof inheritance.
"""
KINDS = frozenset(("transfer", "extension", "branch", "return", "breakaway"))

def _identifier(value):
    import re
    return isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9._:-]{1,128}", value) is not None

def assess_transition(candidate):
    if not isinstance(candidate, dict):
        return {"allowed": False, "state": "INVALID", "reason": "Object required"}
    source = candidate.get("sourceId")
    origin = candidate.get("fromBody")
    target = candidate.get("toBody")
    trace = candidate.get("traceId")
    kind = candidate.get("kind")
    if not all(map(_identifier, (source, origin, target, trace))) or kind not in KINDS or origin == target:
        return {"allowed": False, "state": "INVALID", "reason": "Distinct bodies, valid identifiers and known kind required"}
    proof = candidate.get("sourceProof")
    if not isinstance(proof, dict) or proof.get("sourceId") != source or proof.get("verified") is not True:
        return {"allowed": False, "state": "SOURCE_HOLD", "reason": "Unverified source claim"}
    authority = candidate.get("authority")
    if not isinstance(authority, dict) or not (
        authority.get("granted") is True and
        authority.get("sourceId") == source and
        authority.get("fromBody") == origin and
        authority.get("toBody") == target and
        authority.get("kind") == kind and
        _identifier(authority.get("receiptId"))
    ):
        return {"allowed": False, "state": "AUTHORITY_HOLD", "reason": "Unverified exact authority claim"}
    return {
        "allowed": False, "eligibleForReview": True, "state": "PLAN_ONLY",
        "sourceId": source, "fromBody": origin, "toBody": target,
        "kind": kind, "traceId": trace, "authorityReceipt": authority["receiptId"],
        "boundary": "Caller claims are not authenticated; no execution, merge, source crown or proof inheritance"
    }
