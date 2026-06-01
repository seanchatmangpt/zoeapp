import { LocalInferenceEngine } from '../LocalInferenceEngine';

describe('LocalInferenceEngine', () => {
  let engine: LocalInferenceEngine;

  beforeEach(() => {
    engine = new LocalInferenceEngine();
  });

  it('should perform non-streaming inference', async () => {
    const prompt = 'Hello world';
    const result = await engine.infer({ prompt });

    expect(result.text).toContain('Hello');
    expect(result.usage).toBeDefined();
    expect(result.usage?.promptTokens).toBeGreaterThan(0);
    expect(result.usage?.completionTokens).toBeGreaterThan(0);
  });

  it('should use specified modelId', async () => {
    const prompt = 'Hello';
    const modelId = 'test-model';
    const result = await engine.infer({ prompt, modelId });

    expect(result.text).toContain(modelId);
  });

  it('should perform streaming inference', async () => {
    const prompt = 'Streaming test';
    const tokens: string[] = [];
    const onToken = jest.fn((token: string) => tokens.push(token));

    const result = await engine.streamInfer({ prompt }, onToken);

    expect(onToken).toHaveBeenCalled();
    expect(result.text).toEqual(tokens.join('').trim());
    expect(result.usage?.completionTokens).toEqual(tokens.filter(t => !/^\s+$/.test(t)).length);
  });

  it('should run a genuine conformance alignment check when asked about fitness/conformance', async () => {
    const prompt = 'calculate conformance fitness';
    const result = await engine.infer({ prompt });

    expect(result.text).toContain('optimal A* state-space alignment search');
    expect(result.text).toContain('Alignment Fitness: 1.0000');
    expect(result.text).toContain('Conforming: true');
  });

  it('should run conformance alignment check with deviation when asked with fail/error', async () => {
    const prompt = 'show conformance deviation error';
    const result = await engine.infer({ prompt });

    expect(result.text).toContain('optimal A* state-space alignment search');
    expect(result.text).toContain('Conforming: false');
    expect(result.text).toContain('Alignment Cost: 1');
  });
});

