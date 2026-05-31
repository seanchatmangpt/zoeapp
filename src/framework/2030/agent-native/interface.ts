import { Membrane } from '../../membrane/membrane';
import { zkEngine } from '../../auth/zkp/engine';
import { 
  SemanticCommand, 
  AgentExecutionResult, 
  AgentNativeConfig, 
  StateInspectionRequest 
} from './types';
import { ZkClaim } from '../../auth/zkp/types';

/**
 * The Agent-First Interface provides a secure, ZKP-verified gateway for 
 * external AI agents to interact with the Zoe Framework.
 */
export class AgentNativeInterface {
  private membrane: Membrane;
  private config: AgentNativeConfig;
  private state: any;

  constructor(membrane: Membrane, state: any, config: AgentNativeConfig) {
    this.membrane = membrane;
    this.state = state;
    this.config = config;
  }

  /**
   * Allows an agent to inspect the application state if authorized via ZKP.
   */
  public async inspectState(request: StateInspectionRequest): Promise<any> {
    const { path, zkp } = request;

    // 1. ZKP Verification
    if (this.config.enforceZkp) {
      const claim: ZkClaim = {
        id: zkp.claimId,
        type: 'READ_ACCESS',
        resource: path,
        timestamp: Date.now(),
      };

      const verification = await zkEngine.verify(claim, zkp);
      if (!verification.verified) {
        throw new Error(`ZKP Verification failed for path: ${path}. Error: ${verification.error}`);
      }
    }

    // 2. State Access (Simplified JSON Path)
    return this.resolvePath(this.state, path);
  }

  /**
   * Dispatches a semantic command from an agent through the Operational Membrane.
   */
  public async dispatch<T = any>(command: SemanticCommand): Promise<AgentExecutionResult<T>> {
    const { id, action, params, zkp } = command;

    // 1. ZKP Verification
    if (this.config.enforceZkp) {
      const claim: ZkClaim = {
        id: zkp.claimId,
        type: 'EXECUTE_ACTION',
        resource: action,
        timestamp: Date.now(),
      };

      const verification = await zkEngine.verify(claim, zkp);
      if (!verification.verified) {
        return {
          success: false,
          commandId: id,
          result: null,
          verdict: 'deny',
          receiptId: 'n/a',
          error: `ZKP Authorization failed: ${verification.error}`,
        };
      }
    }

    // 2. Membrane Execution
    const executionBlock = async () => {
      // In a real implementation, this would map the semantic action 
      // to an actual function call or capability.
      // For this innovation, we simulate the action execution.
      return this.executeSemanticAction(action, params);
    };

    const membraneResult = await this.membrane.run<T>(
      `agent-action:${action}`,
      id,
      params,
      executionBlock
    );

    return {
      success: membraneResult.success,
      commandId: id,
      result: membraneResult.result,
      verdict: membraneResult.receipt.verdict,
      receiptId: membraneResult.receipt.id,
      error: membraneResult.error,
    };
  }

  /**
   * Helper to resolve dot-notated paths in state object.
   */
  private resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev ? prev[curr] : undefined;
    }, obj);
  }

  /**
   * Internal dispatcher for semantic actions.
   */
  private async executeSemanticAction(action: string, params: Record<string, any>): Promise<any> {
    // INNOVATION: This is where we bridge semantic intent to runtime execution.
    // In the Zoe 2030 vision, this is driven by the ontology.
    
    // For now, we simulate a few common actions
    switch (action) {
      case 'update_state':
        const { path, value } = params;
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((prev: any, curr: string) => prev[curr], this.state);
        if (target && lastKey) {
          target[lastKey] = value;
          return { status: 'updated', path, value };
        }
        throw new Error(`Target path not found: ${path}`);
      
      case 'ping':
        return { pong: true, timestamp: Date.now() };

      default:
        return { status: 'acknowledged', action, params };
    }
  }
}
