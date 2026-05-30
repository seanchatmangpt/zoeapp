import { AvatarRole } from './types';

export function canEscalate(fromRole: AvatarRole, toRole: AvatarRole): boolean {
  const hierarchy: AvatarRole[] = ['guest', 'member', 'volunteer', 'teamLead', 'pastor', 'admin', 'operator'];
  const fromIndex = hierarchy.indexOf(fromRole);
  const toIndex = hierarchy.indexOf(toRole);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex > fromIndex;
}
