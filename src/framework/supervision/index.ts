import { SupervisionProcessConformanceEvaluator, ConformanceReport } from '../../lib/truex/supervision/supervision';
import { HookRuntime } from '../../lib/truex/hook-otp/runtime';
import { TensionQueueMapper, TensionQueueAuditResult, TensionQueueMappingResult } from '../../lib/truex/packs/packs';
import { HookMessage, SupervisorAction, HookActorRef, HookBehavior, HookSupervisor, HookState } from '../../lib/truex/hook-otp/types';
import { HookActorInstance } from '../../lib/truex/hook-otp/registry';

export { ConformanceReport, TensionQueueAuditResult, TensionQueueMappingResult };

export interface AutonomicConfig {
  supervision?: {
    maxFloodLimit?: number;
    floodWindowMs?: number;
    maxQueueLength?: number;
    maxOscillationDepth?: number;
    maxLoadFactor?: number;
  };
}

export class AutonomicFramework {
  public readonly runtime: HookRuntime;
  public readonly conformance: SupervisionProcessConformanceEvaluator;
  public readonly queueMapper: TensionQueueMapper;

  constructor(config: AutonomicConfig = {}) {
    this.runtime = new HookRuntime();
    
    const supConfig = config.supervision || {};
    this.conformance = new SupervisionProcessConformanceEvaluator(
      supConfig.maxFloodLimit,
      supConfig.floodWindowMs,
      supConfig.maxQueueLength,
      supConfig.maxOscillationDepth,
      supConfig.maxLoadFactor
    );

    this.queueMapper = new TensionQueueMapper();
  }

  /**
   * Spawns an actor via the embedded HookRuntime and optionally registers it 
   * to ensure it's ready for lifecycle management and conformance checks.
   */
  public async spawnActor(
    ref: HookActorRef,
    behavior: HookBehavior,
    supervisor?: HookSupervisor,
    initialState?: HookState
  ): Promise<HookActorInstance> {
    return this.runtime.spawn(ref, behavior, supervisor, initialState);
  }

  /**
   * Evaluates a message for conformance, then either forwards it to the runtime 
   * or intercepts it if it violates autonomy rules.
   */
  public send(ref: HookActorRef, msg: HookMessage, currentLoadFactor = 0.0): { success: boolean; action: SupervisorAction | 'allow'; reason?: string } {
    const registry = this.runtime.getRegistry();
    const instance = registry.get(ref);
    
    if (instance) {
      const evaluation = this.conformance.evaluateMessage(msg, instance, currentLoadFactor);
      
      if (evaluation.action === 'quarantine' || evaluation.action === 'suppress') {
        // Evaluate logic dictated that this shouldn't be processed normally
        return { success: false, action: evaluation.action, reason: evaluation.reason };
      }
    }

    this.runtime.send(ref, msg);
    return { success: true, action: 'allow' };
  }

  /**
   * Audits a pack's tension queue for pending operational jobs.
   */
  public async auditPackTension(packName: string): Promise<TensionQueueAuditResult> {
    return this.queueMapper.auditTensionQueue(packName);
  }

  /**
   * Maps un-admitted tension queue items using provided ontological rules.
   */
  public async mapPackTensionQueue(packName: string, mappingRules: Record<string, string>): Promise<TensionQueueMappingResult> {
    return this.queueMapper.mapTensionQueueState(packName, mappingRules);
  }

  /**
   * Evaluates offline trace conformance.
   */
  public evaluateTrace(declared: string[], actual: string[]): ConformanceReport {
    return this.conformance.evaluateTraceConformance(declared, actual);
  }
}
