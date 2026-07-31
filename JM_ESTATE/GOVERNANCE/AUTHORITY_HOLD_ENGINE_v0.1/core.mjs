export const STATES = Object.freeze({
  UNBOUND: 'UNBOUND',
  PROPOSED: 'PROPOSED',
  GOVERNING: 'GOVERNING',
  CONTESTED: 'CONTESTED',
  HELD: 'HELD',
  SUSPENDED: 'SUSPENDED',
  RELEASED: 'RELEASED',
  REPLACED: 'REPLACED',
  EXPIRED: 'EXPIRED',
  INVALIDATED: 'INVALIDATED',
  BREACHED: 'BREACHED',
});

export const CHALLENGE_CLASSES = Object.freeze([
  'CONTINUATION',
  'CLARIFICATION',
  'NARROWING',
  'EXTENSION',
  'MODIFICATION',
  'SUSPENSION',
  'RELEASE',
  'REPLACEMENT',
  'PROBE',
  'ATTACK',
  'ERROR',
  'UNKNOWN',
]);

const ACTIVE_STATES = new Set([
  STATES.PROPOSED,
  STATES.GOVERNING,
  STATES.CONTESTED,
  STATES.HELD,
  STATES.SUSPENDED,
  STATES.BREACHED,
]);

const TERMINAL_STATES = new Set([
  STATES.RELEASED,
  STATES.REPLACED,
  STATES.EXPIRED,
  STATES.INVALIDATED,
]);

const nowIso = () => new Date().toISOString();
const randomId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const normalize = (value) => String(value ?? '').trim();
const normalizeKey = (value) => normalize(value).toLocaleLowerCase();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function createInstruction(input = {}) {
  const createdAt = input.createdAt ?? nowIso();
  const durationMinutes = Number.isFinite(Number(input.durationMinutes))
    ? Math.max(0, Number(input.durationMinutes))
    : 0;
  const expiresAt = input.expiresAt
    ?? (durationMinutes > 0
      ? new Date(new Date(createdAt).getTime() + durationMinutes * 60_000).toISOString()
      : null);

  const instruction = {
    id: input.id ?? randomId('instruction'),
    issuer: normalize(input.issuer) || 'Unknown issuer',
    receiver: normalize(input.receiver) || 'Receiving body',
    action: normalize(input.action),
    scope: normalize(input.scope) || 'Current route',
    channel: normalize(input.channel) || 'Unspecified channel',
    createdAt,
    expiresAt,
    durationMinutes,
    authorityRank: Math.max(0, Number(input.authorityRank ?? 1)),
    sourceVerified: Boolean(input.sourceVerified),
    releaseKey: normalize(input.releaseKey),
    allowSameIssuerRelease: input.allowSameIssuerRelease !== false,
    allowHigherAuthority: input.allowHigherAuthority !== false,
    allowEmergencyBoundary: input.allowEmergencyBoundary !== false,
    antiOverride: Boolean(input.antiOverride),
    notes: normalize(input.notes),
  };

  assert(instruction.action, 'Instruction action is required.');
  return instruction;
}

export function createChallenge(input = {}) {
  const classification = normalize(input.classification).toUpperCase() || 'UNKNOWN';
  assert(CHALLENGE_CLASSES.includes(classification), `Unknown challenge class: ${classification}`);

  return {
    id: input.id ?? randomId('challenge'),
    message: normalize(input.message),
    operator: normalize(input.operator) || 'Unknown operator',
    channel: normalize(input.channel) || 'Unspecified channel',
    authorityRank: Math.max(0, Number(input.authorityRank ?? 0)),
    sourceVerified: Boolean(input.sourceVerified),
    scope: normalize(input.scope),
    classification,
    conflicts: input.conflicts !== false,
    suppliedReleaseKey: normalize(input.suppliedReleaseKey),
    emergencyBoundary: Boolean(input.emergencyBoundary),
    executable: input.executable !== false,
    proposedAction: normalize(input.proposedAction),
    receivedAt: input.receivedAt ?? nowIso(),
    notes: normalize(input.notes),
  };
}

export class AuthorityHoldEngine {
  constructor(snapshot = null) {
    this.version = '0.1.0';
    this.state = STATES.UNBOUND;
    this.instruction = null;
    this.receipts = [];
    this.lastDecision = null;
    if (snapshot) this.restore(snapshot);
  }

  mountInstruction(input) {
    const instruction = createInstruction(input);
    this.instruction = instruction;
    this.state = STATES.PROPOSED;
    this.#record('INSTRUCTION_PROPOSED', {
      decision: 'PROPOSE',
      reason: 'Instruction entered the route and awaits mounting.',
    });
    this.state = STATES.GOVERNING;
    this.#record('INSTRUCTION_MOUNTED', {
      decision: 'GOVERN',
      reason: 'Instruction passed the minimum packet gate and became governing.',
    });
    this.lastDecision = 'GOVERN';
    return this.snapshot();
  }

  evaluateChallenge(input) {
    assert(this.instruction, 'No governing instruction is mounted.');
    this.tick(input.receivedAt);
    if (TERMINAL_STATES.has(this.state)) {
      return this.#decision('NO_ACTIVE_GOVERNANCE', input, {
        nextState: this.state,
        reason: `Instruction is already ${this.state.toLowerCase()}.`,
        challengeClass: normalize(input.classification).toUpperCase() || 'UNKNOWN',
        gates: this.#emptyGates(),
      });
    }

    const challenge = createChallenge(input);
    const previousState = this.state;

    if (!challenge.conflicts || ['CONTINUATION', 'CLARIFICATION'].includes(challenge.classification)) {
      return this.#decision('CONTINUE', challenge, {
        previousState,
        nextState: this.state === STATES.SUSPENDED ? STATES.SUSPENDED : STATES.GOVERNING,
        reason: 'The message does not validly replace the governing instruction.',
        challengeClass: challenge.classification,
        gates: {
          ...this.#emptyGates(),
          conflict: false,
          trace: true,
        },
      });
    }

    this.state = STATES.CONTESTED;
    this.#record('CHALLENGE_RECEIVED', {
      challenge,
      previousState,
      decision: 'CONTEST',
      reason: 'A conflicting message entered the route.',
    });

    this.state = STATES.HELD;

    const sameIssuer = normalizeKey(challenge.operator) === normalizeKey(this.instruction.issuer);
    const sameChannel = normalizeKey(challenge.channel) === normalizeKey(this.instruction.channel);
    const scopeMatch = this.#scopeMatches(challenge.scope, this.instruction.scope);
    const releaseKeyValid = Boolean(this.instruction.releaseKey)
      && normalizeKey(challenge.suppliedReleaseKey) === normalizeKey(this.instruction.releaseKey);
    const sourceGate = challenge.sourceVerified;
    const authorityGate = challenge.sourceVerified
      && challenge.authorityRank >= this.instruction.authorityRank;
    const sameIssuerGate = sameIssuer
      && challenge.sourceVerified
      && this.instruction.allowSameIssuerRelease;
    const higherAuthorityGate = authorityGate
      && challenge.authorityRank > this.instruction.authorityRank
      && this.instruction.allowHigherAuthority;
    const boundaryGate = challenge.emergencyBoundary
      && this.instruction.allowEmergencyBoundary;
    const releaseGate = releaseKeyValid || sameIssuerGate || higherAuthorityGate || boundaryGate;
    const gates = {
      conflict: true,
      source: sourceGate,
      authority: authorityGate,
      scope: scopeMatch,
      release: releaseGate,
      boundary: boundaryGate || !challenge.emergencyBoundary,
      executable: challenge.executable,
      trace: true,
      sameChannel,
      sameIssuer,
      releaseKeyValid,
      higherAuthority: higherAuthorityGate,
    };

    if (!challenge.executable) {
      return this.#decision('HOLD', challenge, {
        previousState,
        nextState: STATES.HELD,
        reason: 'The proposed replacement is not executable.',
        challengeClass: challenge.classification,
        gates,
      });
    }

    if (challenge.classification === 'SUSPENSION' && scopeMatch && releaseGate) {
      return this.#decision('SUSPEND', challenge, {
        previousState,
        nextState: STATES.SUSPENDED,
        reason: boundaryGate
          ? 'A higher boundary validly suspended the governing instruction.'
          : 'The suspension satisfied the configured release route.',
        challengeClass: challenge.classification,
        gates,
      });
    }

    if (challenge.classification === 'RELEASE' && scopeMatch && releaseGate) {
      return this.#decision('RELEASE', challenge, {
        previousState,
        nextState: STATES.RELEASED,
        reason: releaseKeyValid
          ? 'The supplied release key matched the governing packet.'
          : boundaryGate
            ? 'A higher boundary validly released the instruction.'
            : sameIssuerGate
              ? 'The verified originating issuer validly released the instruction.'
              : 'Verified higher authority validly released the instruction.',
        challengeClass: challenge.classification,
        gates,
      });
    }

    if (['REPLACEMENT', 'MODIFICATION', 'NARROWING', 'EXTENSION'].includes(challenge.classification)
      && scopeMatch
      && releaseGate) {
      return this.#decision('REPLACE', challenge, {
        previousState,
        nextState: STATES.REPLACED,
        reason: releaseKeyValid
          ? 'The replacement satisfied the pre-established release route.'
          : boundaryGate
            ? 'A higher boundary authorised the state change.'
            : sameIssuerGate
              ? 'The verified originating issuer authorised the state change.'
              : 'Verified higher authority authorised the state change.',
        challengeClass: challenge.classification,
        gates,
      });
    }

    const failed = [];
    if (!sourceGate) failed.push('source');
    if (!scopeMatch) failed.push('scope');
    if (!releaseGate) failed.push('release');
    if (this.instruction.antiOverride && !releaseKeyValid && !boundaryGate) failed.push('anti-override');

    return this.#decision('HOLD', challenge, {
      previousState,
      nextState: STATES.HELD,
      reason: `Challenge held: ${failed.length ? failed.join(', ') : 'handoff threshold not met'}.`,
      challengeClass: challenge.classification,
      gates,
    });
  }

  resume(reason = 'Suspension ended through an authorised route.') {
    assert(this.instruction, 'No instruction is mounted.');
    assert(this.state === STATES.SUSPENDED, 'Only a suspended instruction can resume.');
    const previousState = this.state;
    this.state = STATES.GOVERNING;
    this.lastDecision = 'RESUME';
    return this.#record('INSTRUCTION_RESUMED', {
      previousState,
      decision: 'RESUME',
      reason,
    });
  }

  markBreach(reason = 'Behaviour departed from the still-governing instruction.') {
    assert(this.instruction, 'No instruction is mounted.');
    assert(ACTIVE_STATES.has(this.state), 'Only an active instruction can be breached.');
    const previousState = this.state;
    this.state = STATES.BREACHED;
    this.lastDecision = 'BREACH';
    return this.#record('INSTRUCTION_BREACHED', {
      previousState,
      decision: 'BREACH',
      reason,
    });
  }

  restoreGovernance(reason = 'Governance restored after breach; history retained.') {
    assert(this.state === STATES.BREACHED, 'Only a breached instruction can be restored.');
    const previousState = this.state;
    this.state = STATES.GOVERNING;
    this.lastDecision = 'RESTORE';
    return this.#record('GOVERNANCE_RESTORED', {
      previousState,
      decision: 'RESTORE',
      reason,
    });
  }

  invalidate(reason = 'Instruction failed a governing validity gate.') {
    assert(this.instruction, 'No instruction is mounted.');
    const previousState = this.state;
    this.state = STATES.INVALIDATED;
    this.lastDecision = 'INVALIDATE';
    return this.#record('INSTRUCTION_INVALIDATED', {
      previousState,
      decision: 'INVALIDATE',
      reason,
    });
  }

  tick(at = nowIso()) {
    if (!this.instruction?.expiresAt || TERMINAL_STATES.has(this.state)) return this.state;
    const now = new Date(at).getTime();
    const expiry = new Date(this.instruction.expiresAt).getTime();
    if (Number.isFinite(now) && Number.isFinite(expiry) && now >= expiry) {
      const previousState = this.state;
      this.state = STATES.EXPIRED;
      this.lastDecision = 'EXPIRE';
      this.#record('INSTRUCTION_EXPIRED', {
        previousState,
        decision: 'EXPIRE',
        reason: 'The packet reached its defined expiry.',
        at,
      });
    }
    return this.state;
  }

  remainingMs(at = Date.now()) {
    if (!this.instruction?.expiresAt) return null;
    return Math.max(0, new Date(this.instruction.expiresAt).getTime() - Number(at));
  }

  snapshot() {
    return {
      engine: 'JM Authority Hold Engine',
      version: this.version,
      state: this.state,
      instruction: this.instruction ? structuredClone(this.instruction) : null,
      lastDecision: this.lastDecision,
      receipts: structuredClone(this.receipts),
      exportedAt: nowIso(),
    };
  }

  restore(snapshot) {
    assert(snapshot && typeof snapshot === 'object', 'Snapshot must be an object.');
    this.version = normalize(snapshot.version) || '0.1.0';
    this.state = Object.values(STATES).includes(snapshot.state) ? snapshot.state : STATES.UNBOUND;
    this.instruction = snapshot.instruction ? structuredClone(snapshot.instruction) : null;
    this.receipts = Array.isArray(snapshot.receipts) ? structuredClone(snapshot.receipts) : [];
    this.lastDecision = snapshot.lastDecision ?? null;
    this.tick();
    return this.snapshot();
  }

  reset() {
    this.state = STATES.UNBOUND;
    this.instruction = null;
    this.receipts = [];
    this.lastDecision = null;
    return this.snapshot();
  }

  #scopeMatches(challengeScope, instructionScope) {
    const challenge = normalizeKey(challengeScope);
    const governing = normalizeKey(instructionScope);
    if (!challenge || challenge === '*' || challenge === 'same') return true;
    return challenge === governing || challenge.includes(governing) || governing.includes(challenge);
  }

  #emptyGates() {
    return {
      conflict: false,
      source: false,
      authority: false,
      scope: false,
      release: false,
      boundary: false,
      executable: false,
      trace: true,
      sameChannel: false,
      sameIssuer: false,
      releaseKeyValid: false,
      higherAuthority: false,
    };
  }

  #decision(decision, challenge, details) {
    const previousState = details.previousState ?? this.state;
    this.state = details.nextState;
    this.lastDecision = decision;
    const receipt = this.#record('HANDOFF_DECISION', {
      previousState,
      challenge: structuredClone(challenge),
      decision,
      reason: details.reason,
      challengeClass: details.challengeClass,
      gates: details.gates,
      nextState: this.state,
      recourse: this.#recourseFor(decision),
    });
    return { decision, state: this.state, reason: details.reason, gates: details.gates, receipt };
  }

  #recourseFor(decision) {
    switch (decision) {
      case 'HOLD': return 'Supply a valid release route, verify authority, narrow scope, wait for expiry, or invoke a genuine higher boundary.';
      case 'RELEASE': return 'Mount a new instruction if further governance is required.';
      case 'REPLACE': return 'Mount the replacement packet as a new governing instruction; retain this receipt.';
      case 'SUSPEND': return 'Resume through an authorised route or release/replace the instruction.';
      case 'CONTINUE': return 'Continue the governing instruction and preserve its trace.';
      default: return 'Review the receipt and mount a valid next state.';
    }
  }

  #record(event, details = {}) {
    const receipt = {
      receiptId: randomId('receipt'),
      event,
      recordedAt: details.at ?? nowIso(),
      engineVersion: this.version,
      instructionId: this.instruction?.id ?? null,
      previousState: details.previousState ?? null,
      currentState: this.state,
      decision: details.decision ?? null,
      reason: details.reason ?? null,
      challengeClass: details.challengeClass ?? null,
      channel: details.challenge?.channel ?? this.instruction?.channel ?? null,
      knownOperator: details.challenge?.operator ?? this.instruction?.issuer ?? null,
      authorityStatus: details.gates
        ? (details.gates.source ? 'VERIFIED_OR_ACCEPTED' : 'UNVERIFIED_OR_INSUFFICIENT')
        : (this.instruction?.sourceVerified ? 'VERIFIED' : 'CLAIMED'),
      gates: details.gates ? structuredClone(details.gates) : null,
      challenge: details.challenge ? structuredClone(details.challenge) : null,
      output: details.decision ?? null,
      recourse: details.recourse ?? null,
    };
    this.receipts.push(receipt);
    return structuredClone(receipt);
  }
}
