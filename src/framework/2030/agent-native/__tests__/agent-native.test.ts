import { Membrane } from '../../../membrane/membrane';
import { AgentNativeInterface } from '../interface';
import { SemanticCommand, StateInspectionRequest } from '../types';
import { zkEngine } from '../../../auth/zkp/engine';

describe('AgentNativeInterface', () => {
  let membrane: Membrane;
  let agentInterface: AgentNativeInterface;
  let initialState: any;

  beforeEach(() => {
    membrane = new Membrane({ mode: 'strict' });
    initialState = {
      user: {
        id: 'user_123',
        profile: {
          name: 'Zoe',
          email: 'zoe@example.com',
        },
      },
      settings: {
        theme: 'dark',
      },
    };
    agentInterface = new AgentNativeInterface(membrane, initialState, {
      enforceZkp: true,
      membraneId: 'test-membrane',
    });
  });

  describe('inspectState', () => {
    it('should allow inspecting state with a valid ZKP', async () => {
      const request: StateInspectionRequest = {
        path: 'user.profile.name',
        zkp: {
          claimId: 'claim_1',
          proofData: 'valid_proof',
          publicSignals: ['signal_1'],
        },
      };

      const result = await agentInterface.inspectState(request);
      expect(result).toBe('Zoe');
    });

    it('should throw error if ZKP verification fails', async () => {
      const request: StateInspectionRequest = {
        path: 'user.profile.name',
        zkp: {
          claimId: 'claim_1',
          proofData: '', // Empty proof data causes failure
          publicSignals: [],
        },
      };

      await expect(agentInterface.inspectState(request)).rejects.toThrow(
        'ZKP Verification failed for path: user.profile.name'
      );
    });

    it('should resolve deep paths', async () => {
      const request: StateInspectionRequest = {
        path: 'settings.theme',
        zkp: {
          claimId: 'claim_2',
          proofData: 'valid_proof',
          publicSignals: ['signal_1'],
        },
      };

      const result = await agentInterface.inspectState(request);
      expect(result).toBe('dark');
    });

    it('should return undefined for non-existent paths', async () => {
      const request: StateInspectionRequest = {
        path: 'non.existent.path',
        zkp: {
          claimId: 'claim_3',
          proofData: 'valid_proof',
          publicSignals: ['signal_1'],
        },
      };

      const result = await agentInterface.inspectState(request);
      expect(result).toBeUndefined();
    });

    it('should skip ZKP verification if enforceZkp is false', async () => {
      const relaxedInterface = new AgentNativeInterface(membrane, initialState, {
        enforceZkp: false,
        membraneId: 'test-membrane',
      });

      const request: StateInspectionRequest = {
        path: 'user.profile.name',
        zkp: {
          claimId: 'invalid_claim',
          proofData: '',
          publicSignals: [],
        },
      };

      const result = await relaxedInterface.inspectState(request);
      expect(result).toBe('Zoe');
    });
  });

  describe('dispatch', () => {
    it('should successfully dispatch a semantic command with valid ZKP', async () => {
      const command: SemanticCommand = {
        id: 'cmd_1',
        action: 'ping',
        params: {},
        zkp: {
          claimId: 'claim_4',
          proofData: 'valid_proof',
          publicSignals: ['signal_1'],
        },
      };

      const result = await agentInterface.dispatch(command);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(expect.objectContaining({ pong: true }));
      expect(result.verdict).toBe('allow');
    });

    it('should fail dispatch if ZKP verification fails', async () => {
      const command: SemanticCommand = {
        id: 'cmd_2',
        action: 'ping',
        params: {},
        zkp: {
          claimId: 'claim_4',
          proofData: '', // Invalid proof data
          publicSignals: [],
        },
      };

      const result = await agentInterface.dispatch(command);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ZKP Authorization failed');
    });

    it('should execute update_state semantic action', async () => {
      const command: SemanticCommand = {
        id: 'cmd_3',
        action: 'update_state',
        params: {
          path: 'settings.theme',
          value: 'light',
        },
        zkp: {
          claimId: 'claim_5',
          proofData: 'valid_proof',
          publicSignals: ['signal_1'],
        },
      };

      const result = await agentInterface.dispatch(command);
      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        status: 'updated',
        path: 'settings.theme',
        value: 'light',
      });
      expect(initialState.settings.theme).toBe('light');
    });

    it('should handle non-existent actions', async () => {
      const command: SemanticCommand = {
        id: 'cmd_4',
        action: 'unknown_action',
        params: { foo: 'bar' },
        zkp: {
          claimId: 'claim_6',
          proofData: 'valid_proof',
          publicSignals: ['signal_1'],
        },
      };

      const result = await agentInterface.dispatch(command);
      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        status: 'acknowledged',
        action: 'unknown_action',
        params: { foo: 'bar' },
      });
    });

    it('should throw error if update_state path is invalid', async () => {
       const command: SemanticCommand = {
        id: 'cmd_5',
        action: 'update_state',
        params: {
          path: 'invalid.path',
          value: 'val',
        },
        zkp: {
          claimId: 'claim_7',
          proofData: 'valid_proof',
          publicSignals: ['signal_1'],
        },
      };

      const result = await agentInterface.dispatch(command);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Target path not found: invalid.path');
    });

    it('should use membrane to govern execution', async () => {
      // Register an interceptor that denies all agent actions
      membrane.interceptors.register(async (ctx) => {
        if (ctx.capabilityId.startsWith('agent-action:')) {
          return false;
        }
        return true;
      });

      const command: SemanticCommand = {
        id: 'cmd_6',
        action: 'ping',
        params: {},
        zkp: {
          claimId: 'claim_8',
          proofData: 'valid_proof',
          publicSignals: ['signal_1'],
        },
      };

      const result = await agentInterface.dispatch(command);
      expect(result.success).toBe(false);
      expect(result.verdict).toBe('deny');
      expect(result.error).toBe('Denied by membrane');
    });
  });
});
