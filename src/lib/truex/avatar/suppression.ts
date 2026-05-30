import { AvatarProjection } from './types';

export function suppressFieldsForRole(projection: AvatarProjection, suppressedFields: string[]): AvatarProjection {
  if (!projection.payload) return projection;
  const cleanedPayload = { ...projection.payload };
  for (const field of suppressedFields) {
    delete cleanedPayload[field];
  }
  return {
    ...projection,
    payload: cleanedPayload,
  };
}
