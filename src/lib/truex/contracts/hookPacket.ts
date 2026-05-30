import { HookMessage } from '../hook-otp/types';

export interface HookPacket {
  packetId: string;
  tenantId: string;
  message: HookMessage;
  sentAt: string;
  attempts: number;
}
