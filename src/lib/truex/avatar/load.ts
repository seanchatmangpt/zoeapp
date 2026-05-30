import { AvatarProjection } from './types';

export function adjustProjectionForLoad(projection: AvatarProjection, loadFactor: number): AvatarProjection {
  if (loadFactor > 0.85) {
    return {
      ...projection,
      allowedActions: projection.allowedActions.slice(0, 1),
      payload: { ...projection.payload, loadMuted: true },
    };
  }
  return projection;
}
