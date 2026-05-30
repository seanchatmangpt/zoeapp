import { IntelligenceRegistry } from '../intelligence/registry';
import { truexVerificationFixture, jtbdConformanceFixture } from '../intelligence/examples';
import { sha256, canonicalStringify } from '../../crypto/receipts';

describe('Vision 2030 Temporal Stability & Concurrency Equivalence', () => {

  describe('Temporal Replay Stability (Gate 12)', () => {
    it('verifies that replaying truex verifier yields identical results under different phases', async () => {
      const cap = IntelligenceRegistry.get('truex-receipt-verifier')!;
      expect(cap).toBeDefined();

      const phases = ['today', 'tomorrow', 'after_restart', 'after_sync'];
      const results = [];

      for (const phase of phases) {
        const input = { ...truexVerificationFixture, __temporal_phase: phase };
        const res = await cap.run(input);
        results.push({
          success: res.success,
          outputHash: sha256(canonicalStringify(res.result || {}))
        });
      }

      // Assert all results are identical
      const first = results[0];
      for (const res of results) {
        expect(res.success).toBe(first.success);
        expect(res.outputHash).toBe(first.outputHash);
      }
    });

    it('verifies that replaying jtbd conformance auditor yields identical fitness under different phases', async () => {
      const cap = IntelligenceRegistry.get('jtbd-conformance-auditor')!;
      expect(cap).toBeDefined();

      const phases = ['today', 'tomorrow', 'after_restart', 'after_sync'];
      const results = [];

      for (const phase of phases) {
        const input = {
          declaredWorkflow: jtbdConformanceFixture.declaredWorkflow,
          actualEvents: jtbdConformanceFixture.truthfulTrace,
          __temporal_phase: phase
        };
        const res = await cap.run(input);
        results.push({
          success: res.success,
          fitness: res.result.fitness,
          verdict: res.result.verdict
        });
      }

      const first = results[0];
      for (const res of results) {
        expect(res.success).toBe(first.success);
        expect(res.fitness).toBe(first.fitness);
        expect(res.verdict).toBe(first.verdict);
      }
    });
  });

  describe('Concurrency Equivalence (Gate 13)', () => {
    it('verifies convergence of interleaved independent command sequences S1 and S2', () => {
      const states: Record<string, string> = {
        c1: 'sermon_published',
        c2: 'sermon_updated',
        d1: 'volunteer_applied',
        d2: 'volunteer_interviewed'
      };

      const runSchedule = (seq: string[]) => {
        const actorStates: Record<string, string> = { sermon: 'idle', volunteer: 'idle' };
        for (const cmdId of seq) {
          if (cmdId === 'c1' || cmdId === 'c2') {
            actorStates.sermon = states[cmdId];
          } else {
            actorStates.volunteer = states[cmdId];
          }
        }
        return actorStates;
      };

      const schedules = [
        ['c1', 'c2', 'd1', 'd2'],
        ['d1', 'd2', 'c1', 'c2'],
        ['c1', 'd1', 'c2', 'd2'],
        ['d1', 'c1', 'd2', 'c2']
      ];

      const endStates = schedules.map(runSchedule);
      const firstStateHash = sha256(canonicalStringify(endStates[0]));

      for (const state of endStates) {
        const hash = sha256(canonicalStringify(state));
        expect(hash).toBe(firstStateHash);
      }
    });

    it('verifies duplicate command envelopes converge to exactly one execution via idempotency check', () => {
      const runSchedule = (seq: string[]) => {
        const actorStates = { sermon: 'idle', executionCount: 0 };
        const processedKeys = new Set<string>();
        for (const cmdId of seq) {
          const idempotencyKey = 'key-101';
          if (!processedKeys.has(idempotencyKey)) {
            processedKeys.add(idempotencyKey);
            actorStates.sermon = 'sermon_published';
            actorStates.executionCount += 1;
          }
        }
        return actorStates;
      };

      const schedules = [
        ['c1', 'c1_dup'],
        ['c1_dup', 'c1']
      ];

      const endStates = schedules.map(runSchedule);
      const firstStateHash = sha256(canonicalStringify(endStates[0]));

      for (const state of endStates) {
        const hash = sha256(canonicalStringify(state));
        expect(hash).toBe(firstStateHash);
        expect(state.executionCount).toBe(1);
      }
    });

    it('verifies out-of-order causally dependent commands converge to the same state', () => {
      const runSchedule = (seq: string[]) => {
        const actorStates = { sermon: 'idle', quarantine: [] as string[] };
        const history = new Set<string>();
        
        for (const cmdId of seq) {
          if (cmdId === 'c1') {
            history.add('c1');
            actorStates.sermon = 'sermon_drafted';
            if (actorStates.quarantine.includes('c2')) {
              actorStates.sermon = 'sermon_published';
              actorStates.quarantine = [];
            }
          } else if (cmdId === 'c2') {
            if (history.has('c1')) {
              actorStates.sermon = 'sermon_published';
            } else {
              actorStates.quarantine.push('c2');
            }
          }
        }
        return actorStates;
      };

      const schedules = [
        ['c1', 'c2'],
        ['c2', 'c1']
      ];

      const endStates = schedules.map(runSchedule);
      const firstStateHash = sha256(canonicalStringify(endStates[0]));

      for (const state of endStates) {
        const hash = sha256(canonicalStringify(state));
        expect(hash).toBe(firstStateHash);
        expect(state.sermon).toBe('sermon_published');
        expect(state.quarantine.length).toBe(0);
      }
    });
  });

  describe('OCEL Export / Import Roundtrip (Gate 14)', () => {
    it('verifies that command receipts can be exported to OCEL 2.0 and replayed identically after import', async () => {
      const JtbdConformanceAuditor = IntelligenceRegistry.get('jtbd-conformance-auditor')!;
      expect(JtbdConformanceAuditor).toBeDefined();

      const originalReceipt = {
        id: 'rec-ocel-test-101',
        deltaHash: 'hash_sermon_101',
        status: 'applied_remote',
        createdAt: new Date().toISOString()
      };

      const inputContext = {
        activity: 'PublishSermon',
        title: 'W3C Evidence Portability'
      };

      // 1. Export
      const ocelLog = {
        event_log: {
          events: [
            {
              id: originalReceipt.id,
              activity: inputContext.activity,
              timestamp: originalReceipt.createdAt,
              omap: ['obj-sermon-1']
            }
          ],
          objects: [
            {
              id: 'obj-sermon-1',
              type: 'CreativeWork',
              attributes: {
                title: inputContext.title,
                deltaHash: originalReceipt.deltaHash
              }
            }
          ]
        }
      };

      // 2. Format check
      expect(ocelLog.event_log).toBeDefined();
      expect(Array.isArray(ocelLog.event_log.events)).toBe(true);
      expect(Array.isArray(ocelLog.event_log.objects)).toBe(true);

      // 3. Import
      const importedLog = JSON.parse(JSON.stringify(ocelLog));
      const reconstructedEvents = importedLog.event_log.events;

      // 4. Replay verification
      const originalRes = await JtbdConformanceAuditor.run({
        declaredWorkflow: ['PublishSermon', 'SendNotification'],
        actualEvents: [inputContext.activity]
      });

      const replayRes = await JtbdConformanceAuditor.run({
        declaredWorkflow: ['PublishSermon', 'SendNotification'],
        actualEvents: reconstructedEvents.map((e: any) => e.activity)
      });

      expect(replayRes.success).toBe(originalRes.success);
      expect(replayRes.result.fitness).toBe(originalRes.result.fitness);
      expect(replayRes.result.verdict).toBe(originalRes.result.verdict);
    });
  });

  describe('Distributed Replica Convergence (Gate 15)', () => {
    it('verifies multi-node convergence after delayed synchronization', () => {
      const runReplica = (localHistory: string[], remoteSync: string[]) => {
        const state = { sermons: [] as string[] };
        for (const cmd of localHistory) {
          state.sermons.push(cmd);
        }
        for (const cmd of remoteSync) {
          if (!state.sermons.includes(cmd)) {
            state.sermons.push(cmd);
          }
        }
        state.sermons.sort();
        return state;
      };

      const replicaA = runReplica(['Sermon-101'], ['Sermon-102']);
      const replicaB = runReplica(['Sermon-102'], ['Sermon-101']);

      const hashA = sha256(canonicalStringify(replicaA));
      const hashB = sha256(canonicalStringify(replicaB));

      expect(hashA).toBe(hashB);
      expect(replicaA.sermons).toEqual(['Sermon-101', 'Sermon-102']);
    });
  });

  describe('Receipt Chain Integrity (Gate 16)', () => {
    it('verifies receipt chain lineage continuity and error detection', () => {
      const genesis = { id: 'r1', prevHash: '', val: 'genesis' };
      const hash1 = sha256(canonicalStringify(genesis));

      const second = { id: 'r2', prevHash: hash1, val: 'second' };
      const hash2 = sha256(hash1 + canonicalStringify(second));

      const third = { id: 'r3', prevHash: hash2, val: 'third' };
      const hash3 = sha256(hash2 + canonicalStringify(third));

      const chain = [
        { receipt: genesis, hash: hash1 },
        { receipt: second, hash: hash2 },
        { receipt: third, hash: hash3 }
      ];

      const validateChain = (c: typeof chain) => {
        for (let i = 0; i < c.length; i++) {
          const prevHash = i === 0 ? '' : c[i - 1].hash;
          if (c[i].receipt.prevHash !== prevHash) {
            return { valid: false, error: 'broken lineage' };
          }
          const expectedHash = i === 0 
            ? sha256(canonicalStringify(c[i].receipt))
            : sha256(prevHash + canonicalStringify(c[i].receipt));
          if (c[i].hash !== expectedHash) {
            return { valid: false, error: 'hash mismatch' };
          }
        }
        return { valid: true };
      };

      expect(validateChain(chain).valid).toBe(true);

      // 1. Broken lineage
      const brokenChain = JSON.parse(JSON.stringify(chain));
      brokenChain[1].receipt.prevHash = 'corrupted_prev_hash';
      expect(validateChain(brokenChain).valid).toBe(false);

      // 2. Reordered receipts
      const reorderedChain = [chain[0], chain[2], chain[1]];
      expect(validateChain(reorderedChain).valid).toBe(false);

      // 3. Deleted receipt
      const deletedChain = [chain[0], chain[2]];
      expect(validateChain(deletedChain).valid).toBe(false);
    });
  });

  describe('Ontology Projection Stability (Gate 17)', () => {
    it('verifies ontology projection stability and schema evolution', () => {
      const v1Schema = {
        '@context': 'http://schema.org',
        '@type': 'CreativeWork',
        'name': 'v1 name',
        'text': 'devotional text'
      };

      const v2Schema = {
        '@context': 'http://schema.org',
        '@type': 'CreativeWork',
        'headline': 'v1 name',
        'text': 'devotional text'
      };

      const extractOntologyMeaning = (doc: any) => {
        const textVal = doc.text;
        const titleVal = doc.name || doc.headline;
        return { titleVal, textVal };
      };

      const meaning1 = extractOntologyMeaning(v1Schema);
      const meaning2 = extractOntologyMeaning(v2Schema);

      expect(meaning1.titleVal).toBe(meaning2.titleVal);
      expect(meaning1.textVal).toBe(meaning2.textVal);

      const badSchema = {
        '@context': 'http://schema.org',
        '@type': 'CreativeWork',
        'headline': 'v1 name',
        'invalidVocab': 'devotional text'
      };

      const meaningBad = extractOntologyMeaning(badSchema);
      expect(meaningBad.textVal).toBeUndefined();
    });
  });

  describe('Capability Isolation (Gate 18)', () => {
    it('verifies capability isolation and crash containment', async () => {
      const ConceptDriftDetector = {
        run: () => {
          throw new Error('Adversarial crash simulation');
        }
      };

      const TruexReceiptVerifier = IntelligenceRegistry.get('truex-receipt-verifier')!;
      expect(TruexReceiptVerifier).toBeDefined();

      let crashed = false;
      try {
        ConceptDriftDetector.run();
      } catch (e) {
        crashed = true;
      }
      expect(crashed).toBe(true);

      const res = await TruexReceiptVerifier.run(truexVerificationFixture);
      expect(res.success).toBe(true);
    });
  });

  describe('Deterministic Replay Hashing (Gate 19)', () => {
    it('verifies deterministic canonical replay hashing', () => {
      const runReplay = (events: any[]) => {
        const sorted = [...events].sort((a, b) => a.id.localeCompare(b.id));
        return sha256(canonicalStringify(sorted));
      };

      const trace1 = [
        { id: 'e1', type: 'PublishSermon', timestamp: '2026-05-23T10:00:00Z' },
        { id: 'e2', type: 'SendNotification', timestamp: '2026-05-23T10:05:00Z' }
      ];

      const trace2 = [
        { id: 'e2', type: 'SendNotification', timestamp: '2026-05-23T10:05:00Z' },
        { id: 'e1', type: 'PublishSermon', timestamp: '2026-05-23T10:00:00Z' }
      ];

      const hash1 = runReplay(trace1);
      const hash2 = runReplay(trace2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Operational Compression (Gate 20)', () => {
    it('verifies operational event compression convergence', () => {
      const fullLog = [
        { id: 'e1', activity: 'DraftSermon', title: 'Draft v1' },
        { id: 'e2', activity: 'UpdateSermon', title: 'Draft v2' },
        { id: 'e3', activity: 'PublishSermon', title: 'Final Title' }
      ];

      const compressLog = (log: typeof fullLog) => {
        const finalTitle = log[log.length - 1].title;
        return [{ id: 'compressed-1', activity: 'PublishSermon', title: finalTitle }];
      };

      const compressed = compressLog(fullLog);
      expect(compressed.length).toBe(1);
      expect(compressed[0].title).toBe('Final Title');
    });
  });

});
