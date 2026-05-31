import { AvatarRole, AvatarProjection } from './types';

export const AVATAR_ROLES: AvatarRole[] = ['guest', 'member', 'volunteer', 'teamLead', 'pastor', 'admin', 'operator'];

export const PROJECTION_MATRIX: Record<string, (data: any, role: AvatarRole) => AvatarProjection> = {
  volunteer_shortage: (data, role) => {
    switch (role) {
      case 'guest':
        return {
          role,
          visible: false,
          surface: 'hidden',
          allowedActions: [],
          payload: null,
        };
      case 'member':
        return {
          role,
          visible: true,
          surface: 'help invitation',
          allowedActions: ['sign_up_interest'],
          payload: { message: 'Join us in welcoming others! High need for volunteers this Sunday.' },
        };
      case 'volunteer':
        return {
          role,
          visible: true,
          surface: 'shift prompt',
          allowedActions: ['accept_shift', 'decline_shift'],
          payload: { message: 'We need you! Open slots are available.', openSlots: data.openSlots },
        };
      case 'teamLead':
        return {
          role,
          visible: true,
          surface: 'candidate list',
          allowedActions: ['assign_volunteer', 'contact_volunteer'],
          payload: { candidates: data.candidates || [] },
        };
      case 'pastor':
        return {
          role,
          visible: true,
          surface: 'risk summary',
          allowedActions: ['acknowledge_risk'],
          payload: { 
            riskLevel: data.shortageRatio > 0.6 ? 'High' : data.shortageRatio > 0.3 ? 'Medium' : 'Low', 
            shortageRatio: data.shortageRatio 
          },
        };
      case 'admin':
        return {
          role,
          visible: true,
          surface: 'receipt/audit',
          allowedActions: ['audit_runs', 'view_event_log'],
          payload: { runId: data.runId, history: data.history || [] },
        };
      case 'operator':
        return {
          role,
          visible: true,
          surface: 'replay/topology',
          allowedActions: ['trigger_replay', 'check_telemetry'],
          payload: { topology: data.topology || {}, stateHash: data.stateHash },
        };
    }
  },
};
