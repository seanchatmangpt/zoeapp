import { ILocalInferenceEngine, LocalInferenceResult, RunInferenceOptions } from './types';

/**
 * A stub implementation of the Local Inference Engine.
 * In a real-world scenario, this would interface with Wasm-based LLMs,
 * CoreML, or Android NNAPI.
 */
export class LocalInferenceEngine implements ILocalInferenceEngine {
  /**
   * Runs inference on the given prompt.
   * @param options Inference options including prompt.
   * @returns A promise resolving to the inference result.
   */
  async infer(options: RunInferenceOptions): Promise<LocalInferenceResult> {
    // Simulate network/compute delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const text = `[Local Inference Stub] Responding to: "${options.prompt}"\nModel: ${options.modelId || 'phi-2-orange'}\nThis is a privacy-preserving, on-device response.`;

    return {
      text,
      usage: {
        promptTokens: options.prompt.split(' ').length,
        completionTokens: text.split(' ').length,
        totalTokens: options.prompt.split(' ').length + text.split(' ').length,
      },
    };
  }

  /**
   * Streams inference results for the given prompt.
   * @param options Inference options including prompt.
   * @param onToken Callback for each generated token.
   * @returns A promise resolving to the final inference result.
   */
  async streamInfer(options: RunInferenceOptions, onToken: (token: string) => void): Promise<LocalInferenceResult> {
    const fullText = `[Local Inference Stream Stub] Responding to: "${options.prompt}"\nModel: ${options.modelId || 'phi-2-orange'}\nThis response was streamed token-by-token.`;
    const tokens = fullText.split(' ');

    let currentText = '';
    for (const token of tokens) {
      // Simulate token generation delay
      await new Promise((resolve) => setTimeout(resolve, 50));
      const tokenWithSpace = token + ' ';
      currentText += tokenWithSpace;
      onToken(tokenWithSpace);
    }

    return {
      text: currentText.trim(),
      usage: {
        promptTokens: options.prompt.split(' ').length,
        completionTokens: tokens.length,
        totalTokens: options.prompt.split(' ').length + tokens.length,
      },
    };
  }
}

/**
 * Default singleton instance of the LocalInferenceEngine.
 */
export const defaultLocalInferenceEngine = new LocalInferenceEngine();
