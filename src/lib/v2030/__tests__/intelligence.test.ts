import {
  TruexReceiptVerifier,
  JtbdConformanceAuditor,
  ConceptDriftDetector,
  RlOrchestratorMonitor,
  ComplianceSafetyGuard,
  HabitPromptGenerator,
  VolunteerFitSuggester,
  SpiritualRhythmTracker,
  OnCampusNavigator,
  CareRiskEscalator,
  EngagementFatigueController
} from '../intelligence/registry';
import { IntelligenceRunner } from '../intelligence/runner';
import {
  truexVerificationFixture,
  jtbdConformanceFixture,
  conceptDriftFixture,
  rlOrchestratorFixture,
  complianceGuardFixture
} from '../intelligence/examples';

// Mock Drizzle db for runner receipts logging
jest.mock('../../db/db', () => {
  return {
    db: {
      insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([]) })
    }
  };
});

describe('Vision 2030 Process Intelligence Substrate', () => {
  
  describe('1. Truex Receipt Verifier', () => {
    it('successfully verifies canonical OCEL 2.0 signatures in truexVerificationFixture', async () => {
      const res = await TruexReceiptVerifier.run(truexVerificationFixture);
      expect(res.success).toBe(true);
      expect(res.result.batchValid).toBe(true);
      expect(res.result.receiptValid).toBe(true);
      expect(res.result.verified).toBe(true);
    });

    it('fails verification if ocel2 batch hash does not match expected_path_hash', async () => {
      const corrupted = { ...truexVerificationFixture, ocel2_batch_hash: 'corrupted-hash' };
      const res = await TruexReceiptVerifier.run(corrupted);
      expect(res.success).toBe(true);
      expect(res.result.verified).toBe(false);
    });
  });

  describe('2. JTBD Conformance Auditor', () => {
    it('returns perfect fitness for conforming traces (TRUTHFUL)', async () => {
      const res = await JtbdConformanceAuditor.run({
        declaredWorkflow: jtbdConformanceFixture.declaredWorkflow,
        actualEvents: jtbdConformanceFixture.truthfulTrace
      });
      expect(res.success).toBe(true);
      expect(res.result.fitness).toBe(1.0);
      expect(res.result.verdict).toBe('TRUTHFUL');
    });

    it('returns lower fitness and VARIANCE verdict for deviant traces', async () => {
      const res = await JtbdConformanceAuditor.run({
        declaredWorkflow: jtbdConformanceFixture.declaredWorkflow,
        actualEvents: jtbdConformanceFixture.deviantTrace
      });
      expect(res.success).toBe(true);
      expect(res.result.fitness).toBeLessThan(1.0);
      expect(res.result.verdict).toBe('VARIANCE');
    });
  });

  describe('3. Concept Drift Detector', () => {
    it('detects no drift for stable activity streams', async () => {
      const res = await ConceptDriftDetector.run({
        activities: conceptDriftFixture.stableActivities,
        windowSize: 3,
        threshold: 0.2
      });
      expect(res.success).toBe(true);
      expect(res.result.alertsCount).toBe(0);
      expect(res.result.stable).toBe(true);
    });

    it('raises drift alerts when activity sets drift over windows', async () => {
      const res = await ConceptDriftDetector.run({
        activities: conceptDriftFixture.driftingActivities,
        windowSize: 3,
        threshold: 0.2
      });
      expect(res.success).toBe(true);
      expect(res.result.alertsCount).toBeGreaterThan(0);
      expect(res.result.stable).toBe(false);
    });
  });

  describe('4. RL Orchestrator Monitor', () => {
    it('simulates cycle execution rewards and calculates policy convergence trends', async () => {
      const res = await RlOrchestratorMonitor.run(rlOrchestratorFixture);
      expect(res.success).toBe(true);
      expect(res.result.initialReward).toBeDefined();
      expect(res.result.finalReward).toBeDefined();
      expect(res.result.policyImproving).toBeDefined();
    });
  });

  describe('5. Compliance Safety Guard', () => {
    it('admits compliant temporal traces', async () => {
      const res = await ComplianceSafetyGuard.run({
        traceCommands: complianceGuardFixture.compliantTrace
      });
      expect(res.success).toBe(true);
      expect(res.result.compliant).toBe(true);
      expect(res.result.violations.length).toBe(0);
    });

    it('refuses traces violating the OCPQ temporal order guard rule', async () => {
      const res = await ComplianceSafetyGuard.run({
        traceCommands: complianceGuardFixture.nonCompliantTrace
      });
      expect(res.success).toBe(true);
      expect(res.result.compliant).toBe(false);
      expect(res.result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('6. Habit Prompt Generator', () => {
    it('generates a PROMPT intervention when streaks are missed', async () => {
      const res = await HabitPromptGenerator.run({ userId: 'u1', missedStreaks: 3 });
      expect(res.success).toBe(true);
      expect(res.result.interventions.length).toBe(1);
      expect(res.result.interventions[0].verb).toBe('PROMPT');
      expect(res.result.interventions[0].rdfQuads).toBeDefined();
    });

    it('does not generate a prompt when streak is within limits', async () => {
      const res = await HabitPromptGenerator.run({ userId: 'u1', missedStreaks: 1 });
      expect(res.success).toBe(true);
      expect(res.result.interventions.length).toBe(0);
    });
  });

  describe('7. Volunteer Fit Suggester', () => {
    it('suggests a RECOMMEND intervention when user has Hospitality gift and has attended events', async () => {
      const res = await VolunteerFitSuggester.run({ userId: 'u1', giftTags: ['Hospitality', 'Teaching'], eventAttendedCount: 3 });
      expect(res.success).toBe(true);
      expect(res.result.interventions.length).toBe(1);
      expect(res.result.interventions[0].verb).toBe('RECOMMEND');
    });
  });

  describe('8. Spiritual Rhythm Tracker', () => {
    it('emits a REMIND intervention when no next action is scheduled', async () => {
      const res = await SpiritualRhythmTracker.run({ userId: 'u1', sermonId: 's1', hasNextAction: false });
      expect(res.success).toBe(true);
      expect(res.result.interventions.length).toBe(1);
      expect(res.result.interventions[0].verb).toBe('REMIND');
    });
  });

  describe('9. On Campus Navigator', () => {
    it('emits a REORDER intervention when user is checked in', async () => {
      const res = await OnCampusNavigator.run({ userId: 'u1', campusId: 'c1', checkedIn: true });
      expect(res.success).toBe(true);
      expect(res.result.interventions.length).toBe(1);
      expect(res.result.interventions[0].verb).toBe('REORDER');
    });
  });

  describe('10. Care Risk Escalator', () => {
    it('emits an ESCALATE intervention when missed groups count is exceeded', async () => {
      const res = await CareRiskEscalator.run({ userId: 'u1', missedGroupsCount: 3 });
      expect(res.success).toBe(true);
      expect(res.result.interventions.length).toBe(1);
      expect(res.result.interventions[0].verb).toBe('ESCALATE');
    });
  });

  describe('11. Engagement Fatigue Controller', () => {
    it('emits a SUPPRESS intervention when not opened streak is high', async () => {
      const res = await EngagementFatigueController.run({ userId: 'u1', notOpenedStreak: 6 });
      expect(res.success).toBe(true);
      expect(res.result.interventions.length).toBe(1);
      expect(res.result.interventions[0].verb).toBe('SUPPRESS');
    });
  });

  describe('12. Intelligence Runner End-to-End Orchestrator', () => {
    it('runs capability run cycle, validates inputs, and records intelligence receipt', async () => {
      const receipt = await IntelligenceRunner.run('truex-receipt-verifier', truexVerificationFixture);
      expect(receipt.id).toContain('rec_intel_');
      expect(receipt.capabilityId).toBe('truex-receipt-verifier');
      expect(receipt.success).toBe(true);
      expect(receipt.deltaHash).toBeDefined();
      expect(receipt.logs.length).toBeGreaterThan(0);
      
      const artifact = IntelligenceRunner.getReplayArtifact(receipt.id);
      expect(artifact).not.toBeNull();
      expect(artifact?.capabilityId).toBe('truex-receipt-verifier');
      expect(artifact?.output.verified).toBe(true);
    });
  });

});
