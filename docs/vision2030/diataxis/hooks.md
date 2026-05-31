# React Hooks (VKG Semantic & Route Admission)
 
This document provides comprehensive Diátaxis-compliant documentation for the custom React hooks under the Zoe Framework. These hooks manage semantic projections of the Virtual Knowledge Graph (VKG) and enforce cryptographic route admission gating.
 
---
 
## 1. Tutorial (Learning-oriented)
 
This tutorial guides you through creating a secure, gated screen that retrieves and modifies sermon metadata from the Virtual Knowledge Graph (VKG) using `useRouteAdmission` and `useSermon`.
 
### 1.1 Prerequisites
Ensure your application tree is wrapped with the required context providers (such as `SessionProvider` for session evaluation and `VkgProvider` for graph access). Typically, this configuration is located in your root layout:
 
```typescript
import React from 'react';
import { SessionProvider } from '@/context/SessionProvider';
import { VkgProvider } from '../framework/vkg/react';
import { Slot } from 'expo-router';
 
export default function RootLayout() {
  return (
    <SessionProvider>
      <VkgProvider>
        <Slot />
      </VkgProvider>
    </SessionProvider>
  );
}
```
 
### 1.2 Step 1: Establish Gating Rules
We want to restrict access to our sermon administrator screen. We define the admission rules using a `RouteDefinition` object. We will require:
1. An identity boundary level of `verified`.
2. Explicit disclosures indicating that terms have been accepted (`terms_accepted`) and email is confirmed (`email_verified`).
 
### 1.3 Step 2: Implement the Gated Component
Create a new file `src/screens/SermonAdminScreen.tsx` and write the following code. This screen evaluates route eligibility using `useRouteAdmission` and accesses the underlying database using `useSermon`:
 
```typescript
import React from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useRouteAdmission } from '../hooks/useRouteAdmission';
import { useSermon } from '../hooks/useSermon';
import { RouteDefinition } from '../route-law/types';
 
// Define the route security criteria
const SERMON_ADMIN_ROUTE: RouteDefinition = {
  requiredIdentityBoundary: 'verified',
  requiredDisclosures: ['terms_accepted', 'email_verified'],
};
 
export const SermonAdminScreen: React.FC = () => {
  // 1. Evaluate route admission constraints dynamically
  const { admitted, refusal, loading: authLoading } = useRouteAdmission(SERMON_ADMIN_ROUTE);
 
  // 2. Bind to a specific Sermon subject node in the VKG
  const targetSermonId = 'https://zoe.church/sermons/pentecost-2026';
  const {
    node,
    loading: vkgLoading,
    error,
    mutate,
    remove,
    refresh
  } = useSermon(targetSermonId);
 
  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.text}>Evaluating security boundaries...</Text>
      </View>
    );
  }
 
  // Handle security gating blockages
  if (!admitted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Clearance Denied</Text>
        <Text style={styles.text}>Reason: {refusal?.message || 'Access Restricted'}</Text>
        <Text style={styles.subtext}>Code: {refusal?.code}</Text>
      </View>
    );
  }
 
  if (vkgLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.text}>Retrieving sermon ontology representation...</Text>
      </View>
    );
  }
 
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Semantic Query Error</Text>
        <Text style={styles.text}>{error.message}</Text>
        <Button title="Retry Sync" onPress={() => refresh()} />
      </View>
    );
  }
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sermon Portal</Text>
      
      {node ? (
        <View style={styles.card}>
          <Text style={styles.label}>Resource ID (IRI):</Text>
          <Text style={styles.value}>{node['@id']}</Text>
          
          <Text style={styles.label}>Sermon Title:</Text>
          <Text style={styles.value}>{node.name || 'Untitled Sermon'}</Text>
          
          <Text style={styles.label}>Sermon Description:</Text>
          <Text style={styles.value}>{node.description || 'No description assigned.'}</Text>
          
          <View style={styles.row}>
            <Button
              title="Update Title"
              onPress={async () => {
                await mutate({
                  name: 'Pentecost 2026: The Descent of Fire',
                  description: 'A study of Acts Chapter 2.',
                });
              }}
            />
            <Button
              title="Purge Node"
              color="#ef4444"
              onPress={async () => {
                await remove();
              }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.text}>No sermon entity exists at this ID.</Text>
          <Button
            title="Create Sermon Node"
            onPress={async () => {
              await mutate({
                name: 'Pentecost 2026: Initial Inception',
                description: 'A study of Acts Chapter 2.',
              });
            }}
          />
        </View>
      )}
    </View>
  );
};
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#090d16',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#090d16',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#818cf8',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    color: '#e5e7eb',
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f87171',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtext: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6b7280',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});
```
 
### 1.4 Step 3: Verify the Flow
When you navigate to this screen:
1. **Security Evaluation**: `useRouteAdmission` fetches the current session. If the user is unauthenticated, it returns `{ admitted: false, refusal: { code: "UNAUTHENTICATED", ... } }` and blocks access.
2. **VKG Matching**: If verified and terms are accepted, the block clears. `useSermon` coordinates with `VirtualKnowledgeGraphClient` to query triples whose subject is `https://zoe.church/sermons/pentecost-2026` and predicate matches `http://www.w3.org/1999/02/22-rdf-syntax-ns#type`.
3. **Reactive Binding**: Updating the title triggers `mutate`, converting the JSON-LD to RDF quads and updating the local storage immediately.
 
---
 
## 2. How-To Guide (Task-oriented)
 
### 2.1 Implementing a Gated Screen with Cryptographic Receipt Verification and Semantic Node Modifications
 
This guide details how to restrict access to a screen based on a **BLAKE3 Cryptographic Receipt** and manage multiple linked entities (`Event` and `CreativeWork`) concurrently.
 
#### Implementation Code: `src/screens/SecureCreativeEventPortal.tsx`
 
```typescript
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native';
import { useRouteAdmission } from '../hooks/useRouteAdmission';
import { useEvent } from '../hooks/useEvent';
import { useCreativeWork } from '../hooks/useCreativeWork';
import { RouteDefinition } from '../route-law/types';
 
// Gate access using security hierarchy level + BLAKE3 command receipt validation
const GATED_PORTAL_ROUTE: RouteDefinition = {
  requiredIdentityBoundary: 'verified',
  requiredDisclosures: ['terms_accepted'],
  requiredReceiptCommandId: 'cmd_publish_creative_work_0987',
  requiredReceiptDeltaHash: 'b3_hash_representation_for_delta_9921',
};
 
export const SecureCreativeEventPortal: React.FC = () => {
  // 1. Evaluate safety boundaries & cryptographic proof presence
  const { admitted, refusal, loading: authLoading } = useRouteAdmission(GATED_PORTAL_ROUTE);
 
  // Form input states
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [workName, setWorkName] = useState('');
  const [workDesc, setWorkDesc] = useState('');
 
  // Subject IDs for the graph nodes
  const eventId = 'https://zoe.church/events/pentecost-conference-2026';
  const workId = 'https://zoe.church/creativeworks/pentecost-sermon-guide';
 
  // 2. Bind hooks to respective Schema.org ontologies
  const {
    node: eventNode,
    loading: eventLoading,
    error: eventError,
    mutate: mutateEvent,
    remove: removeEvent
  } = useEvent(eventId);
 
  const {
    node: workNode,
    loading: workLoading,
    error: workError,
    mutate: mutateWork,
    remove: removeWork
  } = useCreativeWork(workId);
 
  // Sync loaded semantic metadata to form state
  useEffect(() => {
    if (eventNode) {
      setEventName(eventNode.name || '');
      setEventDesc(eventNode.description || '');
    }
  }, [eventNode]);
 
  useEffect(() => {
    if (workNode) {
      setWorkName(workNode.name || '');
      setWorkDesc(workNode.description || '');
    }
  }, [workNode]);
 
  const handleSaveEvent = async () => {
    try {
      await mutateEvent({
        name: eventName,
        description: eventDesc,
        location: 'Zoe Cathedral Hall',
      });
      Alert.alert('Success', 'Event semantic metadata successfully synchronized with the VKG.');
    } catch (err: any) {
      Alert.alert('Mutation Failed', err.message || 'Error occurred during Event update.');
    }
  };
 
  const handleSaveWork = async () => {
    try {
      await mutateWork({
        name: workName,
        description: workDesc,
        associatedEvent: eventId, // Link the CreativeWork to the Event in the RDF graph
      });
      Alert.alert('Success', 'CreativeWork semantic metadata successfully synchronized with the VKG.');
    } catch (err: any) {
      Alert.alert('Mutation Failed', err.message || 'Error occurred during CreativeWork update.');
    }
  };
 
  const handleDeleteAll = async () => {
    try {
      await removeEvent();
      await removeWork();
      setEventName('');
      setEventDesc('');
      setWorkName('');
      setWorkDesc('');
      Alert.alert('Cleaned', 'Both Semantic Entities have been purged from the Local VKG.');
    } catch (err: any) {
      Alert.alert('Removal Failed', err.message || 'Error purging entities.');
    }
  };
 
  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.statusText}>Decrypting Credentials & Receipts...</Text>
      </View>
    );
  }
 
  if (!admitted) {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.blockedCard}>
          <Text style={styles.blockedTitle}>Clearance Required</Text>
          <Text style={styles.blockedCode}>Refusal: {refusal?.code}</Text>
          <Text style={styles.blockedMessage}>{refusal?.message}</Text>
          {refusal?.code === 'RECEIPT_NOT_FOUND' && (
            <View style={styles.receiptHelp}>
              <Text style={styles.helpText}>
                This screen is secured by BLAKE3 Receipt Gating.
              </Text>
              <Text style={styles.helpText}>
                Command ID: {GATED_PORTAL_ROUTE.requiredReceiptCommandId}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
 
  const overallLoading = eventLoading || workLoading;
  if (overallLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.statusText}>Traversing Semantic Relational Nodes...</Text>
      </View>
    );
  }
 
  if (eventError || workError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.blockedTitle}>Graph Ingestion Error</Text>
        <Text style={styles.blockedMessage}>
          {eventError?.message || workError?.message || 'Failed to sync with local VKG client.'}
        </Text>
      </View>
    );
  }
 
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.mainHeader}>Creative & Event Coordinator</Text>
      <Text style={styles.subHeader}>Linked Entity Management System</Text>
 
      {/* Event Details Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>1. Target Event Ontology Node</Text>
        <Text style={styles.iriLabel}>IRI: {eventId}</Text>
        
        <Text style={styles.inputLabel}>Event Name</Text>
        <TextInput
          style={styles.textInput}
          value={eventName}
          onChangeText={setEventName}
          placeholder="e.g. Pentecost Gathering"
        />
 
        <Text style={styles.inputLabel}>Event Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={eventDesc}
          onChangeText={setEventDesc}
          placeholder="Provide summary description of the event..."
          multiline
        />
 
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveEvent}>
          <Text style={styles.buttonText}>Commit Event Node</Text>
        </TouchableOpacity>
      </View>
 
      {/* Creative Work Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>2. Associated CreativeWork Node</Text>
        <Text style={styles.iriLabel}>IRI: {workId}</Text>
        
        <Text style={styles.inputLabel}>Work Title</Text>
        <TextInput
          style={styles.textInput}
          value={workName}
          onChangeText={setWorkName}
          placeholder="e.g. Study Guide / Sermon Outlines"
        />
 
        <Text style={styles.inputLabel}>Work Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={workDesc}
          onChangeText={setWorkDesc}
          placeholder="Provide details about the resource materials..."
          multiline
        />
 
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveWork}>
          <Text style={styles.buttonText}>Commit CreativeWork Node</Text>
        </TouchableOpacity>
      </View>
 
      <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAll}>
        <Text style={styles.buttonText}>Delete Both From VKG</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginTop: 10,
  },
  subHeader: {
    fontSize: 13,
    color: '#818cf8',
    textAlign: 'center',
    marginBottom: 25,
  },
  sectionCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  iriLabel: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#9ca3af',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 10,
    color: '#f9fafb',
    fontSize: 14,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  dangerButton: {
    backgroundColor: '#b91c1c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusText: {
    color: '#9ca3af',
    marginTop: 15,
    fontSize: 14,
  },
  blockedContainer: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  blockedCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  blockedCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#f87171',
    backgroundColor: '#7f1d1d',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  blockedMessage: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    lineHeight: 20,
  },
  receiptHelp: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
    marginTop: 16,
    width: '100%',
  },
  helpText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
```
 
---
 
## 3. Reference Guide (Information-oriented)
 
### 3.1 Directory File Layout
The core hooks and their associated automated unit tests are arranged as follows:
 
* [useCreativeWork.ts](file:///Users/sac/zoeapp/src/hooks/useCreativeWork.ts) — Direct projection mapping to Schema.org `CreativeWork` resources.
* [useEvent.ts](file:///Users/sac/zoeapp/src/hooks/useEvent.ts) — Direct projection mapping to Schema.org `Event` resources.
* [useSermon.ts](file:///Users/sac/zoeapp/src/hooks/useSermon.ts) — Direct projection mapping to Schema.org `Sermon` resources.
* [useRouteAdmission.ts](file:///Users/sac/zoeapp/src/hooks/useRouteAdmission.ts) — Integrates local routing law configuration with standard security context evaluation.
* [__tests__/useCreativeWork.test.ts](file:///Users/sac/zoeapp/src/hooks/__tests__/useCreativeWork.test.ts) — Validates initial state scenarios, CRUD cycles, error traps, and mutation mappings.
* [__tests__/useEvent.test.ts](file:///Users/sac/zoeapp/src/hooks/__tests__/useEvent.test.ts) — Validates quad transitions and type validations for Event entities.
* [__tests__/useSermon.test.ts](file:///Users/sac/zoeapp/src/hooks/__tests__/useSermon.test.ts) — Verifies Drizzle-backed and VKG-backed transactions for Sermon entities.
 
---
 
### 3.2 VKG Semantic Hooks API (`useCreativeWork`, `useEvent`, `useSermon`)
 
These hooks are created using the `createSemanticHook` factory method. They expose identical interfaces tailored to their specific Schema.org types.
 
#### Signature
```typescript
export function createSemanticHook<T extends { '@type': string | string[]; '@id': string }>(typeUri: string): (
  id?: string,
  options?: UseSemanticNodeOptions
) => {
  node: T | null;
  loading: boolean;
  error: Error | null;
  mutate: (updatedData: Omit<T, '@type' | '@id'>) => Promise<void>;
  remove: () => Promise<void>;
  refresh: () => Promise<void>;
};
```
 
#### Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | The subject resource IRI (e.g. `https://zoe.church/events/1`). If undefined, the hook bypasses queries and remains in a null state. |
| `options` | `UseSemanticNodeOptions` | No | Advanced settings, such as custom VKG clients or custom memory overlays. |
 
#### `UseSemanticNodeOptions`
```typescript
export interface UseSemanticNodeOptions {
  /** Optional custom client to use instead of the shared default instance */
  vkgClient?: VirtualKnowledgeGraphClient;
}
```
 
#### Return Value
```typescript
export interface UseSemanticNodeResult<T> {
  /** The parsed JSON-LD node structure representation */
  node: T | null;
  /** Boolean indicating query state progress */
  loading: boolean;
  /** Any error returned during triple matching or parsing */
  error: Error | null;
  /** Commits the Omit<T, '@type' | '@id'> data as quads to the local VKG */
  mutate: (updatedData: Omit<T, '@type' | '@id'>) => Promise<void>;
  /** Removes all triple entries matching the subject ID */
  remove: () => Promise<void>;
  /** Forces database traversal to refresh state data */
  refresh: () => Promise<void>;
}
```
 
---
 
### 3.3 Route Admission Hook API (`useRouteAdmission`)
 
A specialized hook that verifies if the current session meets the authentication boundaries and disclosures defined by the route security settings.
 
#### Signature
```typescript
export const useRouteAdmission: (
  route: RouteDefinition,
  options?: UseRouteAdmissionOptions
) => UseRouteAdmissionResult;
```
 
#### Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `route` | `RouteDefinition` | Yes | Gating criteria (identity boundary, disclosures, custom guards, and BLAKE3 receipts). |
| `options` | `UseRouteAdmissionOptions` | No | Overrides for session resolution, identity boundaries hierarchy, and participant overrides. |
 
#### Supporting Types & Interfaces
 
##### `RouteDefinition`
Located at [types.ts](file:///Users/sac/zoeapp/src/route-law/types.ts#L52-L83):
```typescript
export interface RouteDefinition {
  /** Minimum security level to navigate here (e.g. 'verified') */
  requiredIdentityBoundary?: IdentityBoundary;
 
  /** Disclosures required before rendering */
  requiredDisclosures?: readonly Disclosure[];
 
  /** Optional custom hook logic block */
  customGuard?: (participant: ParticipantBasis) => RefusalReason | null;
 
  /** Optional BLAKE3 cryptographic receipt identifier required for access */
  requiredReceiptCommandId?: string;
 
  /** Expected BLAKE3 signature of receipt payload to match */
  requiredReceiptDeltaHash?: string;
}
```
 
##### `UseRouteAdmissionOptions`
Located at [createRouteAdmissionHook.ts](file:///Users/sac/zoeapp/src/framework/data/auth/createRouteAdmissionHook.ts#L3-L10):
```typescript
export interface UseRouteAdmissionOptions {
  /** Optional custom resolver to convert the raw session to a ParticipantBasis */
  resolveParticipant?: (session: any) => ParticipantBasis;
  /** Optional custom identity hierarchy list */
  hierarchy?: readonly IdentityBoundary[];
  /** Optional explicit participant basis to bypass default useSession resolution */
  participant?: ParticipantBasis;
}
```
 
##### `UseRouteAdmissionResult`
Located at [createRouteAdmissionHook.ts](file:///Users/sac/zoeapp/src/framework/data/auth/createRouteAdmissionHook.ts#L12-L19):
```typescript
export interface UseRouteAdmissionResult {
  /** True if the user meets all gating conditions of the route */
  admitted: boolean;
  /** Detailed reason why admission was denied, if applicable */
  refusal?: RefusalReason;
  /** True if the underlying session check is still loading */
  loading: boolean;
}
```
 
##### `RefusalReason`
Located at [types.ts](file:///Users/sac/zoeapp/src/route-law/types.ts#L20-L39):
```typescript
export interface RefusalReason {
  code:
    | 'UNAUTHENTICATED'
    | 'INSUFFICIENT_IDENTITY_LEVEL'
    | 'MISSING_DISCLOSURE'
    | 'CUSTOM_GUARD_FAILED'
    | 'INVALID_CONFIGURATION'
    | string;
  message: string;
  requiredIdentityBoundary?: IdentityBoundary;
  actualIdentityBoundary?: IdentityBoundary;
  missingDisclosures?: readonly Disclosure[];
}
```
 
---
 
## 4. Explanation (Understanding-oriented)
 
The hooks under `src/hooks` serve as critical interfaces between raw system databases/session context managers and the visual presentation layout.
 
### 4.1 Relationship to the Truex Substrate Architecture
The Truex framework implements an architectural model composed of four distinct layers:
 
```
  ┌──────────────────────────────────────────────────────────┐
  │                        MEMBRANE                          │
  │     Isolates low-level engines from client consumers.     │
  └────────────────────────────┬─────────────────────────────┘
                               │
  ┌────────────────────────────▼─────────────────────────────┐
  │                         INTAKE                           │
  │     Transforms user intents into structured triples.     │
  └────────────────────────────┬─────────────────────────────┘
                               │
  ┌────────────────────────────▼─────────────────────────────┐
  │                       PROJECTION                         │
  │     Translates semantic graphs into reactive layouts.     │
  │   - useSermon    - useEvent    - useCreativeWork         │
  └────────────────────────────┬─────────────────────────────┘
                               │
  ┌────────────────────────────▼─────────────────────────────┐
  │                       SUPERVISION                        │
  │    Validates rules, integrity checks, and signatures.    │
  │   - useRouteAdmission                                    │
  └──────────────────────────────────────────────────────────┘
```
 
* **Projection Layer**: `useSermon`, `useEvent`, and `useCreativeWork` act as projections. Instead of presenting raw triples, they project segments of the Virtual Knowledge Graph as typed JSON-LD structures.
* **Supervision Layer**: `useRouteAdmission` functions as a supervisor, enforcing route gating boundaries, confirming identity transitions, and validating cryptographic signatures before permitting components to mount.
 
---
 
### 4.2 Mathematical Mapping to the Chatman Equation
 
The execution of the custom hooks conforms to the **Receipted Chatman Equation**:
 
$$R \vdash A = \mu(O^*)$$
 
Where:
 
* $O^*$ (**The Lawful Closure Ontology**): Represents the set of active graph relationships and security parameters stored in SQLite and MMKV databases. For semantic hooks, this is defined by Schema.org vocabularies. For admission, this is defined by `DEFAULT_IDENTITY_HIERARCHY` and route schemas.
* $\mu$ (**The Transformation Function**): Evaluates constraints and patterns. For semantic hooks, $\mu$ matches subject triples and maps quads to JSON-LD. For route admission, $\mu$ computes identity levels via the index positions inside `DEFAULT_IDENTITY_HIERARCHY` and checks disclosure sets.
* $A$ (**The Emitted Consequence**): The UI reaction. This is the output state returned by the hooks (`node`, `loading`, `admitted`, `refusal`), which either mounts the screen layout or triggers navigation redirects.
* $R$ (**The Receipt Lineage**): Represents the cryptographic proofs validating the transaction trajectory. The `ProtectedRoute` and `useRouteAdmission` hooks verify that the specified `requiredReceiptCommandId` and its matching `requiredReceiptDeltaHash` are present in Zustand, MMKV, or the SQLite table. This verifies that a given action sequence was successfully signed and recorded.
 
---
 
### 4.3 Design Trade-offs & Constraints
 
1. **Triples Parsing Overhead**: Storing data as RDF quads provides high schema flexibility but incurs conversion costs. Resolving a subject node requires querying multiple triples matching the subject IRI, followed by translating those quads into JSON-LD format. This process requires more CPU and memory resources than standard SQL queries.
2. **Synchronous MMKV vs. Asynchronous Drizzle**: Cryptographic receipt verification checks multiple storage locations in order of latency:
   * First, it performs a fast lookup in the Zustand store memory.
   * Second, it checks the synchronous MMKV storage.
   * Finally, if the record is missing from the faster storage layers, it performs an asynchronous SQLite query using Drizzle. This hybrid model minimizes loading flicker while maintaining data persistence.
3. **Write Concurrency and Optimistic Mutations**: The `mutate` function updates the local React state immediately and issues a write operation to the database asynchronously. Concurrent mutation calls to the same resource IRI can result in database write conflicts if operations are not serialized properly.
