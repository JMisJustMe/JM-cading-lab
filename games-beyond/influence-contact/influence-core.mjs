/* JM Games&Beyond: private Play Store evidence -> source-specific comparison.
 * Pure data layer; no host, renderer, game simulation, or cloud writes.
 */
export const SCHEMA = 'jm.gaming-influence-contact/0.1';
export const TARGETS = Object.freeze({
  'Rumble Stars Football': { route:'Aim / Drag / Cannon Loop', question:'Can a precisely timed launch interact with moving defenders without scripted rebounds?', organ:'input -> aim -> collision -> consequence' },
  'Badland Brawl': { route:'Aim / Drag / Cannon Loop', question:'How do mass and delayed contact change a launched object path in an original JM rule set?', organ:'aim -> force -> trajectory -> contact' },
  'Rumble Hockey': { route:'Hockey Puck Loop', question:'Can puck control, pressure and possession transfer have visible, testable consequences?', organ:'puck -> collision -> possession -> trace' },
  'Smashing Four: PvP Hero bump': { route:'Ping-pong / Paddle Puck Loop', question:'Which collision chains are deterministic and readable across keyboard and touch?', organ:'collision -> multi-contact -> trace' },
  'Capsulemon Fight': { route:'Aim / Drag / Cannon Loop', question:'Can angle, object properties and impact order create original tactical outcomes?', organ:'aim -> launch -> contact -> state' },
  'MARVEL SNAP: Hero Strategy CCG': { route:'cardBORED', question:'Can lanes or positions affect win conditions without copying any proprietary card rules?', organ:'placement -> rule -> consequence' },
  'Soul of Eden': { route:'cardBORED', question:'What role does timing play when placing a limited resource into a contested space?', organ:'input timing -> cost -> consequence' },
  'Bullet Echo: PVP Shooter': { route:'Western Sniper PvP', question:'Can line of sight and limited information produce meaningful opposed decisions in the JM game?', organ:'visibility -> positioning -> encounter' },
  'Mech Arena - Shooting Game': { route:'T-Boys Core Clash', question:'Do distinct movement and attack identities genuinely change the playable loop?', organ:'identity -> movement -> combat consequence' },
  'Sonic Forces: PvP Race': { route:'Drag & Aim', question:'What does high-speed control teach about input readability without copying a character or level?', organ:'input -> motion -> contact' }
});
const OWNERSHIP_UNKNOWN = 'UNKNOWN_NOT_OWNER_CONFIRMED';
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function must(ok, code) {if(!ok) throw new Error(code);}
export function auditRegister(register) {
  must(isObject(register) && register.schema === 'jm.gaming-influence-register.v1.1', 'REGISTER_SCHEMA_INVALID');
  must(Array.isArray(register.games), 'GAMES_ARRAY_REQUIRED');
  must(Array.isArray(register.unresolved), 'UNRESOLVED_ARRAY_REQUIRED');
  const seen = new Set();
  for (const game of register.games) {
    must(isObject(game) && typeof game['Game title'] === 'string' && !!game['Game title'].trim(), 'GAME_TITLE_REQUIRED');
    must(!seen.has(game['Game title']), 'DUPLICATE_TITLE');
    seen.add(game['Game title']);
  }
  const declared = Number(register.counts?.games_identified);
  must(Number.isInteger(declared) && declared === register.games.length, 'REGISTER_COUNT_MISMATCH');
  must(Number(register.counts?.unresolved) === register.unresolved.length, 'UNRESOLVED_COUNT_MISMATCH');
  return Object.freeze({identified:register.games.length,unresolved:register.unresolved.length});
}
function findTitle(register, title) {
  must(typeof title === 'string' && title.trim().length > 0, 'SELECTED_TITLE_REQUIRED');
  const key=title.trim().toLocaleLowerCase('en');
  const hits=register.games.filter(x=>x['Game title'].toLocaleLowerCase('en')===key);
  must(hits.length===1, 'TITLE_NOT_IN_PRIVATE_EXPORT');
  return hits[0];
}
export function comparePrivateEvidence(register, title) {
  auditRegister(register);
  const game = findTitle(register,title);
  const candidate=TARGETS[game['Game title']] ?? null;
  return {
    schema:SCHEMA,
    sourceTitle:game['Game title'],
    sourceEvidence:{
      type:'GOOGLE_PLAY_INSTALL_RECORD',
      evidenceClass:game['Evidence class'],
      firstInstalled:game['First recorded install'] || null,
      lastInstalled:game['Latest recorded install'] || null,
      installRecords:game['Install records'],
      sourcePath:game['Raw source path']
    },
    ownerPlayed:OWNERSHIP_UNKNOWN,
    ownerLiked:OWNERSHIP_UNKNOWN,
    relationship:candidate ? {
      type:'DESIGN_HYPOTHESIS_NOT_RECEIVER_PROOF',
      jmEstateRoute:candidate.route,
      organToInvestigate:candidate.organ,
      originalDesignQuestion:candidate.question,
      sourceAuthority:'games-beyond/README.md + games-beyond/WHOLE_GAMES_ESTATE_RECONCILIATION_2026-09-20.md',
      portedGameplay:false
    }:null,
    privateDataRetainedLocally:true,
    nativeGameStateMutation:false,
    proof:'EVIDENCE_TO_REVIEWABLE_COMPARISON_ONLY'
  };
}
export function listCandidateContacts(register){
  auditRegister(register);
  return register.games.filter(g=>Object.hasOwn(TARGETS,g['Game title']))
    .map(g=>comparePrivateEvidence(register,g['Game title']));
}
