/* TBS Delta 004 — Command Panel Mount Patch
   Drop this script after the Estate OS BASE_REGISTER declaration or run it in the browser console.
   It adds the Command Panel as a first-class mounted body without flattening existing houses.
*/
(function(){
  const mount = {
  "mount_name": "TBS Delta 004 \u2014 Command Panel Mount",
  "version": "v0.1",
  "created_at": "2026-07-07T17:22:00+01:00",
  "carrier": "JM Estate OS v0.2.x / ongoing TBS (Trusted Boxed Securement)",
  "mounted_body": "JM Command Register v0.1 \u2014 TBS Panel",
  "mounted_file": "JM_COMMAND_REGISTER_v0_1_TBS_PANEL_OPEN_FIRST.html",
  "entry_page": "00_OPEN_FIRST_TBS_DELTA_004_COMMAND_PANEL_MOUNT.html",
  "type": "OPEN_FIRST",
  "source": "direct-library + local generated pack",
  "role": "command-surface",
  "authority": "working-crown",
  "state": "current-best",
  "placement": "Estate OS \u2192 Command Layer \u2192 Command Register v0.1",
  "priority": "top-shelf chooser above houses",
  "actions": [
    "open",
    "view",
    "inspect",
    "download",
    "copy-json",
    "export-json",
    "copy-receipt",
    "activate-route-catch"
  ],
  "state_keys": [
    "exists",
    "current-best",
    "memory-known",
    "direct-library",
    "next-for-polish",
    "parked",
    "blocked-from-overclaim"
  ],
  "mount_call": "EstateOS.mount('CommandPanel', { type:'OPEN_FIRST', source:'direct-library', role:'command-surface', authority:'working-crown', state:'current-best', actions:['open','download','copy-json','export-json'] })",
  "first_ignition": {
    "selected": "Route Catch",
    "reason": "Smallest playable proof; quickest public-facing polish lane; engine lesson can feed 128 Hand, T-Boys, and larger game worlds.",
    "claim": "first polish ignition candidate, not final release crown"
  },
  "receipt": {
    "ding": "Command Panel mounted into Estate OS / TBS as Delta 004",
    "state_before": "Command Panel existed as standalone OPEN_FIRST chooser but was not represented as an Estate OS mount.",
    "state_after": "Estate OS now has an additive top-level Command Layer mount with JSON, receipt, drop-in JS, and live preview route.",
    "claim_status": "working-crown mount, not universal crown / native OS / final APK estate",
    "next_lawful_move": "Activate Route Catch first polish route or replace selection from inside Command Panel."
  },
  "boundaries": [
    "This pack is an additive Delta 004 mount and does not claim to mutate the File Library copy in place.",
    "Universal compiler, native OS, APK estate, and full runtime QA remain blocked from final-crown claims.",
    "Route Catch is selected as polish ignition, not declared fully released."
  ]
};
  const entry = {
    house: 'Command Layer',
    body: 'JM Command Register v0.1 — TBS Panel',
    kind: 'OPEN_FIRST command-surface / chooser panel',
    stage: 'ACTIVE',
    version_floor: 'Command Register v0.1 · TBS Delta 004 mount',
    finish_action: 'Expose as top-level chooser: exists, current-best, memory-known, direct-library, next-for-polish, blockers, polish ignition.',
    route: 'Estate OS → Command Layer → 00_OPEN_FIRST_TBS_DELTA_004_COMMAND_PANEL_MOUNT.html → JM_COMMAND_REGISTER_v0_1_TBS_PANEL_OPEN_FIRST.html',
    notes: 'Working-crown mount. First polish ignition selected: Route Catch. No universal/native/APK overclaim.'
  };
  if (typeof BASE_REGISTER !== 'undefined' && Array.isArray(BASE_REGISTER.entries)) {
    const already = BASE_REGISTER.entries.some(e => e.body === entry.body || (e.route||'').includes('TBS_DELTA_004_COMMAND_PANEL_MOUNT'));
    if (!already) BASE_REGISTER.entries.unshift(entry);
    BASE_REGISTER.register_name = (BASE_REGISTER.register_name || 'JM Estate OS Register') + ' + Command Panel Mount';
    BASE_REGISTER.phase = 'BUILD_AND_FINISH_FULL_CIRCLE__TBS_DELTA_004_COMMAND_PANEL_MOUNT';
    BASE_REGISTER.updated_at = mount.created_at;
    BASE_REGISTER.command_panel_mount = mount;
    try { if (typeof render === 'function') render(); } catch(e) { console.warn('Render not available yet', e); }
    console.log('DING — Command Panel mounted into Estate OS / TBS', mount);
  } else {
    window.TBS_DELTA_004_COMMAND_PANEL_MOUNT = { mount, entry };
    console.warn('BASE_REGISTER not found. Mount payload stored at window.TBS_DELTA_004_COMMAND_PANEL_MOUNT');
  }
})();