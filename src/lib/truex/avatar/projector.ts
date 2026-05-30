import { AvatarRole, AvatarProjection } from './types';
import { PROJECTION_MATRIX } from './matrix';

export function projectHookOutput(hookId: string, data: any, role: AvatarRole): AvatarProjection {
  const projector = PROJECTION_MATRIX[hookId];
  if (!projector) {
    return {
      role,
      visible: true,
      surface: 'default',
      allowedActions: [],
      payload: data,
    };
  }
  return projector(data, role);
}

export function projectAll(hookId: string, data: any): Record<AvatarRole, AvatarProjection> {
  const result: any = {};
  const roles: AvatarRole[] = ['guest', 'member', 'volunteer', 'teamLead', 'pastor', 'admin', 'operator'];
  for (const role of roles) {
    result[role] = projectHookOutput(hookId, data, role);
  }
  return result;
}
