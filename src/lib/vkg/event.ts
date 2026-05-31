/**
 * @fileoverview VKG Event Schema Conversion, Telemetry Mapping, and Dispatch.
 * Provides functions to translate telemetry events into Schema.org Event JSON-LD representation,
 * map attributes to the Virtual Knowledge Graph (VKG), and dispatch them for synchronization.
 */

import { VirtualKnowledgeGraphClient } from './client';
import { Event as SchemaOrgEvent } from '../../types/semantic/Event';
import { DataFactory } from './rdf';

/**
 * Standard Telemetry Event interface representing raw tracking evidence.
 */
export interface TelemetryEvent {
  timestamp?: string;
  type: string;
  payload?: Record<string, any>;
}

/**
 * Converts a raw TelemetryEvent into a standard Schema.org Event JSON-LD document.
 * Leverages Truex architectural terminology mappings:
 * - "User Interface" / "Screen" -> "Avatar-Relative Projection"
 * - "API Call" -> "Propagation Trigger"
 * - "Offline Queue" -> "Pre-Admission Tension Queue"
 * - "Dashboard" -> "Consequence Supervision"
 */
export function telemetryToSchemaOrgEvent(telemetry: TelemetryEvent): SchemaOrgEvent {
  if (!telemetry || !telemetry.type) {
    throw new Error('Invalid telemetry event: type is required');
  }

  const timestamp = telemetry.timestamp || new Date().toISOString();
  
  // Apply terminology transformations on event names/types
  const typeLower = telemetry.type.toLowerCase();
  let mappedName = telemetry.type;
  if (typeLower.includes('screen') || typeLower.includes('user interface') || typeLower.includes('projection')) {
    mappedName = 'Avatar-Relative Projection Event';
  } else if (typeLower.includes('api') || typeLower.includes('propagation') || typeLower.includes('trigger')) {
    mappedName = 'Propagation Trigger Event';
  } else if (typeLower.includes('offline') || typeLower.includes('tension') || typeLower.includes('queue')) {
    mappedName = 'Pre-Admission Tension Queue Event';
  } else if (typeLower.includes('dashboard') || typeLower.includes('supervision')) {
    mappedName = 'Consequence Supervision Event';
  }

  // Create a unique URI/IRI for this event
  const uniqueId = `urn:event:${telemetry.type.toLowerCase().replace(/[^a-z0-9]/g, '-')}:${Math.random().toString(36).substring(2, 11)}`;

  // Convert payload properties with rebrands
  const mappedPayload: Record<string, any> = {};
  if (telemetry.payload) {
    for (const [key, value] of Object.entries(telemetry.payload)) {
      let mappedKey = key;
      // Terminology rebrand mappings for telemetry fields
      if (key === 'screen' || key === 'uiState') {
        mappedKey = 'avatarRelativeProjection';
      } else if (key === 'apiCall' || key === 'trigger') {
        mappedKey = 'propagationTrigger';
      } else if (key === 'offlineQueue' || key === 'queue') {
        mappedKey = 'preAdmissionTensionQueue';
      } else if (key === 'dashboard' || key === 'supervisionView') {
        mappedKey = 'consequenceSupervision';
      }

      mappedPayload[mappedKey] = value;
    }
  }

  return {
    '@id': uniqueId,
    '@type': 'https://schema.org/Event',
    name: mappedName,
    startDate: timestamp,
    description: `VKG Telemetry Event: ${telemetry.type}`,
    ...mappedPayload,
  };
}

/**
 * Dispatches a Schema.org Event to the Virtual Knowledge Graph.
 * Converts the Event JSON-LD to RDF Quads, saves them locally,
 * and queues them for synchronization to the authoritative Supabase Edge.
 */
export async function dispatchVkgEvent(
  client: VirtualKnowledgeGraphClient,
  event: SchemaOrgEvent
): Promise<void> {
  const quadsList = client.jsonLdToQuads(event);
  await client.addQuads(quadsList);
}

/**
 * VkgEventDispatcher orchestrates telemetry-to-VKG mapping and dispatching.
 */
export class VkgEventDispatcher {
  private client: VirtualKnowledgeGraphClient;
  private dispatchedCount = 0;

  constructor(client?: VirtualKnowledgeGraphClient) {
    this.client = client ?? new VirtualKnowledgeGraphClient();
  }

  /**
   * Translates a raw telemetry event to Schema.org Event, converts to RDF Quads,
   * writes locally, and queues synchronization.
   */
  public async dispatchTelemetry(telemetry: TelemetryEvent): Promise<SchemaOrgEvent> {
    const vkgEvent = telemetryToSchemaOrgEvent(telemetry);
    await dispatchVkgEvent(this.client, vkgEvent);
    this.dispatchedCount++;
    return vkgEvent;
  }

  public getDispatchedCount(): number {
    return this.dispatchedCount;
  }
}
