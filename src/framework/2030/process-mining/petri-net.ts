/**
 * Petri Net representations and Token Replay Conformance Checking Engine.
 * Following the Dr. Wil van der Aalst process mining doctrine.
 * See [process-mining.md](file:///Users/sac/zoeapp/docs/vision2030/framework/process-mining.md) for details.
 */

export interface Arc {
  source: string;
  target: string;
  weight?: number;
}

export interface PetriNet {
  places: string[];
  transitions: string[];
  arcs: Arc[];
}

export type Marking = Record<string, number>;

export interface ReplayResult {
  fitness: number;
  produced: number;
  consumed: number;
  missing: number;
  remaining: number;
  finalMarking: Marking;
  isConforming: boolean;
  logs: string[];
}

/**
 * Formal Petri Net transitions and place schema for Agent Native operations.
 * Governs command execution, authorization gating, and state mutation.
 */
export const AGENT_NATIVE_PETRI_NET: PetriNet = {
  places: [
    'p_init',
    'p_received',
    'p_zkp_verified',
    'p_membrane_approved',
    'p_executed',
    'p_state_mutated',
    'p_completed',
    'p_failed'
  ],
  transitions: [
    't_receive',
    't_verify_zkp_success',
    't_verify_zkp_fail',
    't_inspect_state',
    't_membrane_success',
    't_membrane_fail',
    't_execute_success',
    't_execute_fail',
    't_mutate_state',
    't_complete'
  ],
  arcs: [
    // Receive phase
    { source: 'p_init', target: 't_receive' },
    { source: 't_receive', target: 'p_received' },

    // ZKP verification phase
    { source: 'p_received', target: 't_verify_zkp_success' },
    { source: 'p_received', target: 't_verify_zkp_fail' },
    { source: 't_verify_zkp_success', target: 'p_zkp_verified' },
    { source: 't_verify_zkp_fail', target: 'p_failed' },

    // State inspection bypass
    { source: 'p_zkp_verified', target: 't_inspect_state' },
    { source: 't_inspect_state', target: 'p_completed' },

    // Membrane admissibility phase
    { source: 'p_zkp_verified', target: 't_membrane_success' },
    { source: 'p_zkp_verified', target: 't_membrane_fail' },
    { source: 't_membrane_success', target: 'p_membrane_approved' },
    { source: 't_membrane_fail', target: 'p_failed' },

    // Execution phase
    { source: 'p_membrane_approved', target: 't_execute_success' },
    { source: 'p_membrane_approved', target: 't_execute_fail' },
    { source: 't_execute_success', target: 'p_executed' },
    { source: 't_execute_fail', target: 'p_failed' },

    // State Mutation phase
    { source: 'p_executed', target: 't_mutate_state' },
    { source: 't_mutate_state', target: 'p_state_mutated' },

    // Completion
    { source: 'p_state_mutated', target: 't_complete' },
    { source: 't_complete', target: 'p_completed' }
  ]
};

export class TokenReplayEngine {
  private net: PetriNet;

  constructor(net: PetriNet = AGENT_NATIVE_PETRI_NET) {
    this.net = net;
  }

  /**
   * Replays a single execution trace (ordered sequence of transition names)
   * on the Petri Net to verify conformance and calculate Fitness.
   */
  public replayTrace(
    trace: string[],
    initialMarking: Marking = { p_init: 1 },
    expectedFinalMarking: Marking = { p_completed: 1 }
  ): ReplayResult {
    const currentMarking: Marking = {};
    const logs: string[] = [];
    const absoluteDocLink = 'See the formal process mining specifications at [process-mining.md](file:///Users/sac/zoeapp/docs/vision2030/framework/process-mining.md).';

    // Deep clone initial marking
    for (const [place, count] of Object.entries(initialMarking)) {
      currentMarking[place] = count;
    }

    let produced = 0;
    let consumed = 0;
    let missing = 0;
    let remaining = 0;

    // Count initial marking as produced
    for (const count of Object.values(initialMarking)) {
      produced += count;
    }

    logs.push(`Starting token replay. ${absoluteDocLink}`);

    for (const step of trace) {
      if (!this.net.transitions.includes(step)) {
        logs.push(`[CONFORMANCE ERROR] Observed transition '${step}' is not part of the Petri Net schema. ${absoluteDocLink}`);
        // Log this deviation and fail/skip
        missing += 1;
        produced += 1;
        continue;
      }

      const incomingArcs = this.net.arcs.filter(arc => arc.target === step);
      const outgoingArcs = this.net.arcs.filter(arc => arc.source === step);

      // Check for enabling (presence of tokens in all input places)
      for (const arc of incomingArcs) {
        const place = arc.source;
        const weight = arc.weight ?? 1;
        const currentTokens = currentMarking[place] ?? 0;

        if (currentTokens < weight) {
          const shortage = weight - currentTokens;
          missing += shortage;
          produced += shortage;
          currentMarking[place] = (currentMarking[place] ?? 0) + shortage;
          logs.push(`[CONFORMANCE DEVIATION] Missing ${shortage} token(s) at place '${place}' to fire transition '${step}'. ${absoluteDocLink}`);
        }
      }

      // Consume tokens
      for (const arc of incomingArcs) {
        const place = arc.source;
        const weight = arc.weight ?? 1;
        currentMarking[place] = (currentMarking[place] ?? 0) - weight;
        consumed += weight;
      }

      // Produce tokens
      for (const arc of outgoingArcs) {
        const place = arc.target;
        const weight = arc.weight ?? 1;
        currentMarking[place] = (currentMarking[place] ?? 0) + weight;
        produced += weight;
      }
    }

    // Force match with expected final marking
    for (const [place, expected] of Object.entries(expectedFinalMarking)) {
      const actual = currentMarking[place] ?? 0;
      if (actual < expected) {
        const shortage = expected - actual;
        missing += shortage;
        produced += shortage;
        currentMarking[place] = (currentMarking[place] ?? 0) + shortage;
        logs.push(`[CONFORMANCE DEVIATION] Missing ${shortage} final token(s) at place '${place}'. ${absoluteDocLink}`);
      }
    }

    // Consume expected final marking
    for (const [place, expected] of Object.entries(expectedFinalMarking)) {
      currentMarking[place] = (currentMarking[place] ?? 0) - expected;
      consumed += expected;
    }

    // Identify remaining tokens as deviations
    for (const [place, actual] of Object.entries(currentMarking)) {
      if (actual > 0) {
        remaining += actual;
        logs.push(`[CONFORMANCE DEVIATION] Remaining token(s) found at place '${place}' after execution. ${absoluteDocLink}`);
      }
    }

    // Fitness formula: f = 0.5 * (1 - m/c) + 0.5 * (1 - r/p)
    const fitness =
      0.5 * (consumed > 0 ? (consumed - missing) / consumed : 1) +
      0.5 * (produced > 0 ? (produced - remaining) / produced : 1);

    const fitnessCleaned = Math.max(0, Math.min(1, fitness));
    const isConforming = fitnessCleaned === 1.0;

    if (isConforming) {
      logs.push(`Trace is fully conforming to the Petri Net model. ${absoluteDocLink}`);
    } else {
      logs.push(`Conformance audit complete. Fitness score: ${fitnessCleaned.toFixed(4)}. ${absoluteDocLink}`);
    }

    return {
      fitness: fitnessCleaned,
      produced,
      consumed,
      missing,
      remaining,
      finalMarking: currentMarking,
      isConforming,
      logs
    };
  }
}
