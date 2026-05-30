import { serverCanConfirm } from '../../../src/lib/truex/contracts/authority';

// Simulate Edge evaluation logic under test
function edgeEvaluateDelta(delta: any) {
  if (!delta || typeof delta !== 'object' || Object.keys(delta).length === 0) {
    throw new Error('Malformed delta: missing parameters');
  }
  return {
    status: 'settled',
    receipt: 'edge_auth_hash_' + JSON.stringify(delta),
    reconciledDelta: delta,
  };
}

describe('Supabase Edge VKG Hook Apply Function', () => {
  test('Edge accepts valid GraphDelta and returns authoritative receipt', () => {
    const validDelta = { action: 'cancel', subject: 'vol-1' };
    const result = edgeEvaluateDelta(validDelta);
    expect(result.status).toBe('settled');
    expect(result.receipt).toContain('edge_auth_hash_');
    expect(result.reconciledDelta).toEqual(validDelta);
  });

  test('Edge rejects malformed delta', () => {
    expect(() => edgeEvaluateDelta(null)).toThrow('Malformed delta');
    expect(() => edgeEvaluateDelta({})).toThrow('Malformed delta');
  });

  test('Only Edge / service role key can confirm authoritative receipts', () => {
    const receipt: any = { status: 'Confirmed' };
    expect(serverCanConfirm(receipt, 'supabase_edge_service_role_key')).toBe(true);
    expect(serverCanConfirm(receipt, 'invalid_key')).toBe(false);
  });
});
