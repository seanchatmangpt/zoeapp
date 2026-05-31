import { MembraneConfig, ExecutionResult, MembraneReceipt } from './types';
import { InterceptorManager } from './managers/interceptors';
import { ReceiptManager } from './managers/receipts';
import { QuarantineManager } from './managers/quarantine';
import { TrajectoryManager } from './managers/trajectories';
import { TelemetryManager } from './managers/telemetry';
import { sha256, canonicalStringify } from '../../lib/crypto/receipts';

export class Membrane {
  public config: MembraneConfig;
  public interceptors: InterceptorManager;
  public receipts: ReceiptManager;
  public quarantine: QuarantineManager;
  public trajectories: TrajectoryManager;
  public telemetry: TelemetryManager;

  constructor(config: MembraneConfig) {
    this.config = config;
    this.interceptors = new InterceptorManager();
    this.receipts = new ReceiptManager();
    this.quarantine = new QuarantineManager();
    this.trajectories = new TrajectoryManager();
    this.telemetry = new TelemetryManager();
  }

  /**
   * Governs execution of any operation or process capability before settlement
   */
  public async run<T>(
    capabilityId: string,
    commandId: string,
    input: any,
    executionBlock: () => Promise<T>
  ): Promise<ExecutionResult<T>> {
    const timestamp = new Date().toISOString();
    const prevHash = this.receipts.getLastHash();

    // 1. Run Interceptor chain (Gate Admissibility)
    const interceptCtx = { commandId, capabilityId, input, config: this.config };
    const verdict = await this.interceptors.evaluate(interceptCtx);

    if (verdict === 'deny') {
      const receipt = await this.receipts.emitRefusal(
        commandId,
        capabilityId,
        prevHash,
        'Admissibility denied by membrane interceptor'
      );
      return { success: false, result: null, receipt, error: 'Denied by membrane' };
    }

    // 2. Run Trajectory checks
    if (input.flowName && input.fromState !== undefined && input.toState !== undefined) {
      const flowValid = this.trajectories.validateTransition(input.flowName, input.fromState, input.toState);
      if (!flowValid) {
        const errorMsg = `Illegal state transition in ${input.flowName}: ${input.fromState} -> ${input.toState}`;
        const receipt = await this.receipts.emitRefusal(commandId, capabilityId, prevHash, errorMsg);
        await this.quarantine.isolate(commandId, input, errorMsg);
        return { success: false, result: null, receipt, error: 'Illegal trajectory transition' };
      }
    }

    // 3. Execute payload under membrane protection
    try {
      const executionResult = await executionBlock();

      // Compute deterministic state hash
      const resultHash = sha256(canonicalStringify(executionResult || {}));
      const receiptHash = sha256(prevHash + resultHash);

      const receipt: MembraneReceipt = {
        id: `rec_memb_${Math.random().toString(36).substring(2, 11)}`,
        commandId,
        capabilityId,
        timestamp,
        verdict,
        success: true,
        deltaHash: receiptHash,
        previousHash: prevHash
      };

      this.receipts.append(receipt);

      return { success: true, result: executionResult, receipt };
    } catch (err: any) {
      // 4. Quarantine on crash
      const errorMsg = err.message || 'Unknown execution fault';
      const receipt = await this.receipts.emitRefusal(commandId, capabilityId, prevHash, errorMsg);
      await this.quarantine.isolate(commandId, input, errorMsg);

      return { success: false, result: null, receipt, error: errorMsg };
    }
  }

  public getConfig(): MembraneConfig {
    return this.config;
  }
}
