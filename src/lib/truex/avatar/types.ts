export type AvatarRole = 'guest' | 'member' | 'volunteer' | 'teamLead' | 'pastor' | 'admin' | 'operator';

export interface AvatarProjection {
  role: AvatarRole;
  visible: boolean;
  surface: string;
  allowedActions: string[];
  payload: any;
}
