import { MembraneTelemetryEvent, TelemetryListener } from '../types';

export class TelemetryManager {
  private listeners = new Set<TelemetryListener>();

  public register(listener: TelemetryListener) {
    this.listeners.add(listener);
  }

  public unregister(listener: TelemetryListener) {
    this.listeners.delete(listener);
  }

  public clear() {
    this.listeners.clear();
  }

  public emit(event: MembraneTelemetryEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in membrane telemetry listener:', e);
      }
    }
  }
}
