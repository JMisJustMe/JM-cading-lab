// JM Coding Estate Identity Rail CP01: read-only cross-jurisdiction join.
// Never convert native-workbench presence or policy selection into host execution proof.
export function reconcileCodingEstate(federation, current, policy) {
  const fail = message => { throw new Error("JM_IDENTITY_RAIL_HOLD: " + message); };
  if (federation?.schema !== "jm.everybody.registry-federation/1.1") fail("federation schema");
  if (current?.schema !== "JM.CodingEstate.Current64/1.0") fail("current64 schema");
  if (policy?.schema !== "JM.CodingBodyActivationPolicy/0.1") fail("activation policy schema");
  const bodies = federation.bodies, identities = current.identities, baseline = policy.baseline_active;
  if (!Array.isArray(bodies) || bodies.length !== 100) fail("expected 100 current native fixtures");
  if (!Array.isArray(identities) || identities.length !== 64) fail("expected 64 coding identities");
  if (!Array.isArray(baseline) || baseline.length !== 12) fail("expected 12 baseline policy selections");
  if (current.counts?.current_coding_identities !== 64 || current.counts?.adjacent_non_code_organs !== 44)
    fail("current registry count boundary");
  if (policy.current64_registry !== "coding-estate/JM_CODING_ESTATE_CURRENT_64.json")
    fail("policy source boundary");
  const byId = new Map();
  for (const body of bodies) {
    if (!body || typeof body.id !== "string" || !body.id || byId.has(body.id)) fail("native body id missing/collision");
    byId.set(body.id, body);
  }
  const bySlug = new Map();
  const byCodeId = new Map();
  for (let i = 0; i < identities.length; i++) {
    const seat = identities[i];
    if (!seat || seat.code_id !== i + 1 || typeof seat.slug !== "string" || !seat.slug ||
        typeof seat.name !== "string" || !seat.name || bySlug.has(seat.slug))
      fail("coding identity missing, duplicated or out of order");
    bySlug.set(seat.slug, seat);
    byCodeId.set(seat.code_id, seat);
  }
  const selected = new Set();
  for (const slot of baseline) {
    if (!slot || !byCodeId.has(slot.code_id) || selected.has(slot.code_id) ||
        typeof slot.reason !== "string" || !slot.reason.trim()) fail("invalid or repeated baseline selection");
    selected.add(slot.code_id);
  }
  const rows = bodies.map(body => {
    const seat = bySlug.get(body.id);
    return {
      nativeId: body.id,
      nativeName: body.name,
      codeId: seat?.code_id ?? null,
      scope: seat ? "CURRENT_64_AND_NATIVE_100" : "NATIVE_100_ONLY",
      baseline: seat ? (selected.has(seat.code_id) ? "BASELINE_ROUTE_SELECTED" : "AVAILABLE_NOT_SELECTED") : "NOT_IN_CURRENT_64"
    };
  });
  const unmounted = identities.filter(seat => !byId.has(seat.slug)).map(seat => ({
    codeId: seat.code_id, name: seat.name, slug: seat.slug,
    baseline: selected.has(seat.code_id) ? "BASELINE_ROUTE_SELECTED" : "AVAILABLE_NOT_SELECTED",
    nativeFixture: "NOT_IN_CURRENT_NATIVE_100"
  }));
  const counts = {
    native: bodies.length, currentCoding: identities.length, baselineSelected: selected.size,
    currentAvailable: identities.length - selected.size,
    linked: rows.filter(row => row.codeId !== null).length,
    nativeOnly: rows.filter(row => row.codeId === null).length,
    currentWithoutFixture: unmounted.length,
    adjacentNonCode: current.counts.adjacent_non_code_organs
  };
  if (counts.linked + counts.nativeOnly !== 100 ||
      counts.linked + counts.currentWithoutFixture !== 64 ||
      counts.baselineSelected + counts.currentAvailable !== 64) fail("identity accounting");
  return {
    schema: "JM.CodingEstate.IdentityRail/1.0",
    state: "READ_ONLY_RECONCILED",
    proofBoundary: "Registry membership and baseline policy selection only. Not proof of independent process execution, historical grammar recovery, new body-native fixtures or owner-device contact.",
    counts, rows, unmounted
  };
}
