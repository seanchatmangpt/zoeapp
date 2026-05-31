# Zoe 2030 On-Device AI Module

The `ai` module (located under `src/framework/ai`) provides the foundational on-device LLM (Large Language Model) inference engine and corresponding React hooks for the **Zoe 2030 Innovation Peak** framework. By running local models directly on the client substrate, it ensures data privacy, mitigates network latency, and enforces the trust boundary requirements of the Truex architecture.

---

## 1. Overview

In high-trust, decentralized, or offline-first operational environments, relying on external, cloud-hosted LLM APIs introduces operational risks:
1. **Latency & Reliability:** Synchronous UI adaptations require immediate, sub-second responses. Network round-trips to cloud providers introduce uncontrollable jitter.
2. **Data Leakage:** Enterprise data, state contexts, and operator intents should not be transmitted to third-party endpoints.
3. **Offline Survivability:** The Zoe runtime must function autonomously in degraded environments (e.g., satellite, LoRa, or disconnected operations).

The `ai` module solves these issues by introducing:
* **`ILocalInferenceEngine`:** A unified interface contract for running on-device models (e.g., WebAssembly-compiled model runtimes, CoreML, or Android NNAPI).
* **`LocalInferenceEngine`:** An implementation managing execution, simulating token generation, and offering both buffered and streaming inference capabilities.
* **`useLocalInference`:** A custom React Hook that encapsulates state management (loading, error, result), coordinates async execution, and manages lifecycle controls (such as overlapping request aborting and cleanup).

---

## 2. Architectural & Philosophical Mapping

The `ai` module is a core pillar of the **Truex Collaborative Substrate** and maps directly to the four structural elements of Truex execution and the Chatman Equation.

### 2.1 Mappings to the Truex Execution Pillars
* **Intake:** Prompts and configuration options (`RunInferenceOptions`) act as system intakes, translating raw operator inputs or environmental state signals into structured options for processing.
* **Membrane:** The local, offline-first inference engine serves as a private execution boundary (membrane). It guarantees that sensitive user prompts are resolved without data exiting the device boundaries, preserving the absolute privacy-preserving closure of the client substrate.
* **Projection:** The generated output or token stream (`LocalInferenceResult`) represents the projected state change. When consumed by layers like GenEx, it shapes dynamic layout variants ($A$) directly.
* **Supervision:** Lifecycle and safety checks—including token limits (`maxTokens`), performance tracking (`usage`), error isolation, and immediate command abortion (`AbortController`) to prevent thread blocks—act as runtime supervisors.

### 2.2 Alignment with the Receipted Chatman Equation

The module executes in strict accordance with the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where:
* **$O^*$ (Lawful Closure Ontology):** The parameters, configuration options (`LocalInferenceConfig`), and model metadata (e.g., `'phi-2-orange'`) representing the closed, valid state boundaries of the local model environment.
* **$\mu$ (Transformation/Manufacturing Function):** The local inference engine execution pipeline (`LocalInferenceEngine.infer` or `LocalInferenceEngine.streamInfer`) which consumes options and performs local tensor calculations or simulations.
* **$A$ (Emitted Consequence):** The resulting `LocalInferenceResult` containing the generated text that triggers visual updates, layout shifts, or local state mutations.
* **$R$ (Receipt Lineage):** The cryptographic-ready metadata token receipt (`usage` detailing `promptTokens`, `completionTokens`, and `totalTokens`) that proves execution conforms to resources and limits.

---

## 3. Source Code Structure

The module is located at [ai](file:///Users/sac/zoeapp/src/framework/ai) and contains the following files and directories:

* **[index.ts](file:///Users/sac/zoeapp/src/framework/ai/on-device/index.ts):**
  The entry point for the on-device AI package. It exports all types, the default engine instance, and the react hooks.
* **[types.ts](file:///Users/sac/zoeapp/src/framework/ai/on-device/types.ts):**
  Contains TypeScript interfaces and contracts governing configurations, results, states, and the inference engine interface.
* **[LocalInferenceEngine.ts](file:///Users/sac/zoeapp/src/framework/ai/on-device/LocalInferenceEngine.ts):**
  Defines the `LocalInferenceEngine` class and exports a default global singleton instance `defaultLocalInferenceEngine`.
* **[useLocalInference.ts](file:///Users/sac/zoeapp/src/framework/ai/on-device/useLocalInference.ts):**
  Implements the React hook `useLocalInference` for state integration and execution abortion.
* **[__tests__/LocalInferenceEngine.test.ts](file:///Users/sac/zoeapp/src/framework/ai/on-device/__tests__/LocalInferenceEngine.test.ts):**
  Unit tests verifying non-streaming, streaming, and custom model parameter behavior of the inference engine.
* **[__tests__/useLocalInference.test.ts](file:///Users/sac/zoeapp/src/framework/ai/on-device/__tests__/useLocalInference.test.ts):**
  Comprehensive React hook tests validating states, error mapping, stream accumulations, reset mechanisms, and cancellation/abort handling.

---

## 4. API Contracts

### 4.1 Data Types & Interfaces (`types.ts`)

#### `LocalInferenceConfig`
Configuration parameters for controlling local inference behavior.
* `modelId?: string` (Optional): The ID of the model to use. Defaults to `'phi-2-orange'`.
* `temperature?: number` (Optional): Controls sampling randomness (higher values mean more random text).
* `maxTokens?: number` (Optional): Limits the maximum count of tokens generated in a single pass.
* `stream?: boolean` (Optional): When true, generated text is streamed token-by-token.

#### `LocalInferenceResult`
The output of a completed or streaming inference invocation.
* `text: string`: The accumulated generated text response.
* `usage?: object` (Optional): Metadata capturing the token footprint of the run:
  * `promptTokens: number`: Quantity of tokens in the input prompt.
  * `completionTokens: number`: Quantity of tokens in the generated response.
  * `totalTokens: number`: Combined total token usage.

#### `LocalInferenceState`
The reactive state object representing the current status of the hook.
* `isLoading: boolean`: Indicates if the inference engine is currently generating tokens.
* `error: Error | null`: Contains any error thrown during model execution, or `null`.
* `result: LocalInferenceResult | null`: Holds the latest successful output or partially accumulated stream text, or `null`.

#### `RunInferenceOptions`
Inherits all properties from `Partial<LocalInferenceConfig>`.
* `prompt: string`: The input prompt to be processed by the LLM.

#### `ILocalInferenceEngine`
The service contract that all on-device inference engines must satisfy.
* `infer(options: RunInferenceOptions): Promise<LocalInferenceResult>`: Runs non-streaming, buffered inference.
* `streamInfer(options: RunInferenceOptions, onToken: (token: string) => void): Promise<LocalInferenceResult>`: Runs streaming inference, calling `onToken` synchronously as each token generates.

---

### 4.2 Engine Classes (`LocalInferenceEngine.ts`)

#### `LocalInferenceEngine`
Implements `ILocalInferenceEngine`. It encapsulates model simulation, network latency simulations, and token metrics mapping.
* `async infer(options: RunInferenceOptions): Promise<LocalInferenceResult>`
  * Simulates a 500ms delay to represent hardware processing.
  * Returns a structured `LocalInferenceResult` featuring details on the model, prompt, and token counts.
* `async streamInfer(options: RunInferenceOptions, onToken: (token: string) => void): Promise<LocalInferenceResult>`
  * Generates response tokens sequentially, splitting the simulated answer by spaces.
  * Pauses for 50ms per token to simulate on-device text generation.
  * Emits each token to the `onToken` callback and returns the finalized output.

#### `defaultLocalInferenceEngine`
A global singleton instance of `LocalInferenceEngine` exported as the default runner.

---

### 4.3 Custom Hooks (`useLocalInference.ts`)

#### `useLocalInference(config?: LocalInferenceConfig)`
A React hook that abstracts model execution and hooks directly into the React component lifecycle.
* **Arguments:** An optional `LocalInferenceConfig` representing default fallback parameters.
* **Return Value:** An object containing:
  * `isLoading: boolean`
  * `error: Error | null`
  * `result: LocalInferenceResult | null`
  * `runInference(options: RunInferenceOptions): Promise<LocalInferenceResult | null>`: Executes the local model, handling automatic cancellation of prior active requests and catching/wrapping runtime errors.
  * `reset(): void`: Aborts any ongoing inference, cancels active timers, and returns the state fields to initial values.

---

## 5. Usage Guide

Below is a complete, copy-pasteable TypeScript integration illustrating how to consume the `useLocalInference` hook within a React Native component.

```typescript
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalInference } from '../../src/framework/ai/on-device/useLocalInference';

export const LocalInferenceDemoComponent: React.FC = () => {
  const [promptInput, setPromptInput] = useState('');
  const [isStreamingMode, setIsStreamingMode] = useState(true);

  // Initialize the hook with default configuration options
  const { runInference, isLoading, error, result, reset } = useLocalInference({
    modelId: 'phi-2-orange',
    temperature: 0.7,
    maxTokens: 150,
    stream: isStreamingMode,
  });

  const handleExecute = async () => {
    if (!promptInput.trim()) {
      return;
    }
    try {
      // Execute inference. Merges defaults with prompt configuration.
      await runInference({
        prompt: promptInput,
        stream: isStreamingMode,
      });
    } catch (err) {
      console.error('Inference execution error:', err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Zoe On-Device AI Inference</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter your local prompt..."
        value={promptInput}
        onChangeText={setPromptInput}
        multiline
      />

      <View style={styles.row}>
        <TouchableOpacity 
          style={[styles.toggleButton, isStreamingMode && styles.activeToggle]}
          onPress={() => setIsStreamingMode(true)}
        >
          <Text style={isStreamingMode ? styles.activeText : styles.inactiveText}>Streaming</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, !isStreamingMode && styles.activeToggle]}
          onPress={() => setIsStreamingMode(false)}
        >
          <Text style={!isStreamingMode ? styles.activeText : styles.inactiveText}>Buffered</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]} 
          onPress={handleExecute}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Run Model</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={reset}>
          <Text style={styles.buttonText}>Reset/Abort</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0066cc" />
          <Text style={styles.loadingText}>Generating on-device tokens...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Error: {error.message}</Text>
        </View>
      )}

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Output Result:</Text>
          <Text style={styles.resultText}>{result.text}</Text>
          {result.usage && (
            <View style={styles.usageBox}>
              <Text style={styles.usageText}>Prompt Tokens: {result.usage.promptTokens}</Text>
              <Text style={styles.usageText}>Completion Tokens: {result.usage.completionTokens}</Text>
              <Text style={styles.usageText}>Total Tokens: {result.usage.totalTokens}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f9f9f9' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#333' },
  input: { height: 100, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, padding: 8, backgroundColor: '#fff', textAlignVertical: 'top', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  toggleButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', marginHorizontal: 4, borderRadius: 4 },
  activeToggle: { backgroundColor: '#0066cc', borderColor: '#0066cc' },
  activeText: { color: '#fff', fontWeight: 'bold' },
  inactiveText: { color: '#666' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  button: { flex: 1, padding: 12, borderRadius: 6, alignItems: 'center', marginHorizontal: 4 },
  primaryButton: { backgroundColor: '#28a745' },
  dangerButton: { backgroundColor: '#dc3545' },
  disabledButton: { backgroundColor: '#a5d6a7' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  loadingText: { marginLeft: 8, color: '#666' },
  errorBox: { padding: 12, backgroundColor: '#f8d7da', borderColor: '#f5c6cb', borderWidth: 1, borderRadius: 6, marginVertical: 12 },
  errorText: { color: '#721c24' },
  resultBox: { padding: 16, backgroundColor: '#fff', borderColor: '#e1e4e8', borderWidth: 1, borderRadius: 8 },
  resultLabel: { fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  resultText: { fontSize: 14, color: '#24292e', lineHeight: 20 },
  usageBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eaecef', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  usageText: { fontSize: 11, color: '#586069' }
});
```

---

## 6. Test Suite

The module contains fully realized unit and integration tests written with Jest and `@testing-library/react-native`.

### 6.1 What the Tests Validate

1. **`LocalInferenceEngine.test.ts`:**
   * **Buffered inference:** Confirms that `infer()` returns a valid output string containing the input prompt and includes proper token counts.
   * **Model parameter overrides:** Assures the simulated output reflects custom configurations, such as custom `modelId` parameters.
   * **Streaming inference:** Verifies that tokens are generated one by one, that `onToken` is called for each segment, and that the reconstructed string matches the token assembly.

2. **`useLocalInference.test.ts`:**
   * **Default states:** Validates that the hook initial state matches expectations (`isLoading` is false, `error` and `result` are null).
   * **State transition (non-streaming):** Mocks the underlying engine, triggers execution, and ensures `isLoading` toggles and `result` populates.
   * **State transition (streaming):** Validates that `result.text` accumulates incrementally as tokens are resolved.
   * **Exception Handling:** Checks that caught exceptions are captured in the hook's `error` state and converted into valid `Error` objects (even if they were rejected as raw string literals).
   * **Abort controls & Race Conditions:** Checks that if multiple calls overlap, prior unresolved executions are aborted cleanly. It verifies that `AbortError` instances are handled silently without surfacing raw errors to the user UI, and that manual invocation of `reset()` immediately cancels any active requests.

### 6.2 Running the Tests

To execute the test suite for this module specifically, run the following command in the project root:

```bash
npm run test -- src/framework/ai/on-device
```
