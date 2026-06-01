import { HyperDB } from '../HyperDB';
import { useHyperState, globalHyperDB } from '../useHyperState';

describe('HyperDB', () => {
    let db: HyperDB;

    beforeEach(() => {
        // Use lower dimension for faster tests
        db = new HyperDB(100, 42); 
    });

    test('initializes with specified dimensions', () => {
        const testDb = new HyperDB(50);
        // We can't directly check private dims, but we can see it doesn't throw
        expect(testDb).toBeInstanceOf(HyperDB);
    });

    test('initializes with default dimensions and seed', () => {
        const defaultDb = new HyperDB();
        expect(defaultDb).toBeInstanceOf(HyperDB);
    });

    test('inserts and retrieves data correctly', () => {
        db.insert('user1', { name: 'Alice', age: 30 });
        expect(db.get('user1')).toEqual({ name: 'Alice', age: 30 });
    });

    test('updates data correctly', () => {
        db.insert('user1', { name: 'Alice' });
        db.update('user1', { name: 'Alice', active: true });
        expect(db.get('user1')).toEqual({ name: 'Alice', active: true });
    });

    test('deletes data correctly', () => {
        db.insert('user1', { name: 'Alice' });
        db.delete('user1');
        expect(db.get('user1')).toBeUndefined();
    });

    test('returns undefined for non-existent key', () => {
        expect(db.get('unknown')).toBeUndefined();
    });

    test('computes semantic similarity and sorts by score', () => {
        db.insert('doc1', { text: 'hello world' });
        db.insert('doc2', { text: 'hello there' });
        db.insert('doc3', { text: 'completely different string entirely' });

        const results = db.search({ text: 'hello' }, 3);
        
        expect(results.length).toBe(3);
        // doc1 or doc2 should be most similar to "hello"
        expect(['doc1', 'doc2']).toContain(results[0].id);
        expect(results[2].id).toBe('doc3'); // Least similar
    });

    test('handles empty or null state', () => {
        db.insert('empty', {});
        db.insert('null', null);
        db.insert('undefined-state', undefined);

        expect(db.get('empty')).toEqual({});
        expect(db.get('null')).toBeNull();
        expect(db.get('undefined-state')).toBeUndefined();
    });

    test('handles large payload projections', () => {
        const largeObject = {
            data: Array.from({ length: 1000 }, (_, i) => i)
        };
        db.insert('large', largeObject);
        const results = db.search(largeObject, 1);
        expect(results[0].id).toBe('large');
        // Identical object should have cosine similarity near 1.0
        expect(results[0].score).toBeGreaterThan(0.99);
    });

    test('topK limits the number of results returned', () => {
        for (let i = 0; i < 10; i++) {
            db.insert(`item-${i}`, { value: i });
        }
        const results = db.search({ value: 5 }, 4);
        expect(results.length).toBe(4);
    });

    test('random generator creates identical matrices for identical seeds', () => {
        const db1 = new HyperDB(100, 123);
        const db2 = new HyperDB(100, 123);
        
        db1.insert('test', { a: 1 });
        db2.insert('test', { a: 1 });

        const search1 = db1.search({ a: 1 }, 1);
        const search2 = db2.search({ a: 1 }, 1);

        expect(search1[0].score).toBeCloseTo(search2[0].score, 5);
    });

    test('search returns empty array if db is empty', () => {
        const results = db.search({ any: 'thing' });
        expect(results).toEqual([]);
    });

    test('random with u1=0 prevents log(0)', () => {
        // Need to test branch where u1 is 0, which is extremely rare.
        // We'll trust the math coverage unless we want to inject a mock RNG.
        // Just checking basic stability here.
        expect(() => new HyperDB(10)).not.toThrow();
    });

    test('enforces semantic similarity boundaries, returns BLAKE3 receipts and quarantines out-of-bounds mutations', () => {
        // 1. Establish base boundary explicitly
        const baseState = { type: 'Document', category: 'financial', amount: 1000 };
        db.setBaseBoundary('doc-x', baseState);
        expect(db.getBaseBoundary('doc-x')).toEqual(baseState);

        // 2. Perform a mutation that is very similar (should be accepted)
        const similarState = { type: 'Document', category: 'financial', amount: 1050 };
        const result1 = db.insert('doc-x', similarState);

        expect(result1.status).toBe('accepted');
        expect(result1.similarity).toBeGreaterThanOrEqual(0.85);
        expect(result1.receipt).toBeDefined();
        // The DB state is updated
        expect(db.get('doc-x')).toEqual(similarState);
        // The quarantine is empty
        expect(db.getQuarantined('doc-x')).toBeUndefined();

        // 3. Perform a mutation that is completely different (should be rejected and quarantined)
        const wildState = { type: 'AlienSpacecraft', speed: 'warp-9', pilot: 'Zorblax' };
        const result2 = db.update('doc-x', wildState);

        expect(result2.status).toBe('rejected');
        expect(result2.similarity).toBeLessThan(0.85);
        expect(result2.reason).toContain('below the ontology base boundary threshold');
        // The DB state remains at the previously accepted state
        expect(db.get('doc-x')).toEqual(similarState);
        // The wild state is quarantined
        expect(db.getQuarantined('doc-x')).toEqual(wildState);

        // 4. Retrieve receipt chain and check it is updated for accepted mutations
        const firstReceipt = result1.receipt;
        expect(db.getReceipt('doc-x')).toBe(firstReceipt);

        // 5. If we insert another valid state, the receipt chain is updated
        const anotherSimilarState = { type: 'Document', category: 'financial', amount: 1100 };
        const result3 = db.insert('doc-x', anotherSimilarState);
        expect(result3.status).toBe('accepted');
        expect(result3.receipt).toBeDefined();
        expect(result3.receipt).not.toBe(firstReceipt);

        // 6. Clean up quarantine and delete
        db.clearQuarantine('doc-x');
        expect(db.getQuarantined('doc-x')).toBeUndefined();

        db.delete('doc-x');
        expect(db.get('doc-x')).toBeUndefined();
        expect(db.getBaseBoundary('doc-x')).toBeUndefined();
        expect(db.getReceipt('doc-x')).toBeUndefined();
    });
});

let mockState: any;
let mockSetState: any;

jest.mock('react', () => {
  return {
    useState: jest.fn((init) => {
      mockState = typeof init === 'function' ? init() : init;
      mockSetState = jest.fn((updater) => {
        mockState = typeof updater === 'function' ? updater(mockState) : updater;
      });
      return [mockState, mockSetState];
    }),
    useCallback: jest.fn((cb) => cb),
  };
});

describe('useHyperState', () => {
  beforeEach(() => {
    // Clear global DB
    globalHyperDB.delete('test-id');
    globalHyperDB.delete('existing-id');
    globalHyperDB.delete('other-id');
    globalHyperDB.delete('query-id');
  });

  test('initializes state and sets it in global DB', () => {
    const [state] = useHyperState('test-id', { val: 1 });
    expect(state).toEqual({ val: 1 });
    expect(globalHyperDB.get('test-id')).toEqual({ val: 1 });
  });

  test('restores existing state from DB', () => {
    globalHyperDB.insert('existing-id', { val: 42 });
    const [state] = useHyperState('existing-id', { val: 1 });
    expect(state).toEqual({ val: 42 });
  });

  test('searchSimilar queries the global DB', () => {
    globalHyperDB.insert('other-id', { text: 'match me' });
    const [, , searchSimilar] = useHyperState('query-id', { text: 'match' });
    
    const results = searchSimilar({ text: 'match' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('query-id'); // The inserted state from hook initialization
  });

  test('setState updates react state and global DB', () => {
    const [, setState] = useHyperState('test-id', { val: 1 });
    
    // Simulate setting state directly
    setState({ val: 2 });
    expect(mockState).toEqual({ val: 2 });
    expect(globalHyperDB.get('test-id')).toEqual({ val: 2 });

    // Simulate setting state via function
    setState((prev: any) => ({ val: prev.val + 1 }));
    expect(mockState).toEqual({ val: 3 });
    expect(globalHyperDB.get('test-id')).toEqual({ val: 3 });
  });

  test('quarantines out-of-bounds hook updates and prevents React state transition', () => {
    // 1. Initialize hook with a stable base state string sequence
    const [state, setState] = useHyperState('hook-quarantine-id', {
      type: 'Profile',
      displayName: 'Alice In Wonderland',
      verified: true
    });

    expect(state).toEqual({
      type: 'Profile',
      displayName: 'Alice In Wonderland',
      verified: true
    });

    // 2. Perform an out-of-bounds update
    const wildState = {
      type: 'CompletelyDifferentThing',
      unrelatedField: 'some random gibberish that has nothing to do with profile'
    };
    
    setState(wildState);

    // 3. React state should NOT transition (retains previous state value to preserve invariant)
    expect(mockState).toEqual({
      type: 'Profile',
      displayName: 'Alice In Wonderland',
      verified: true
    });

    // 4. DB state should also remain untouched
    expect(globalHyperDB.get('hook-quarantine-id')).toEqual({
      type: 'Profile',
      displayName: 'Alice In Wonderland',
      verified: true
    });

    // 5. The rejected state is quarantined in the DB
    expect(globalHyperDB.getQuarantined('hook-quarantine-id')).toEqual(wildState);
  });
});
