import { validateTrajectory } from '../intelligence/trajectories';

describe('Transition Family Gating Subsystem', () => {
  describe('OrderFlow Validation', () => {
    it('admits fully conforming OrderFlow trajectories', () => {
      const trajectory = ['idle', 'cart_updated', 'address_added', 'processing', 'paid'];
      const res = validateTrajectory('OrderFlow', trajectory);
      expect(res.success).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('refuses OrderFlow trajectories starting at the wrong state', () => {
      const trajectory = ['cart_updated', 'address_added'];
      const res = validateTrajectory('OrderFlow', trajectory);
      expect(res.success).toBe(false);
      expect(res.error).toContain('TransitionFamilyRefused');
      expect(res.error).toContain("must start at initial state 'idle'");
    });

    it('refuses OrderFlow trajectories with skipped states (TransitionFamilyRefused)', () => {
      const trajectory = ['idle', 'processing', 'paid'];
      const res = validateTrajectory('OrderFlow', trajectory);
      expect(res.success).toBe(false);
      expect(res.error).toContain('TransitionFamilyRefused');
      expect(res.error).toContain("Missing required intermediate states: cart_updated, address_added");
    });
  });

  describe('SermonFlow Validation', () => {
    it('admits conforming SermonFlow state changes', () => {
      const trajectory = ['idle', 'drafted', 'reviewed', 'published'];
      const res = validateTrajectory('SermonFlow', trajectory);
      expect(res.success).toBe(true);
    });

    it('refuses SermonFlow trajectories with skipped reviewed state', () => {
      const trajectory = ['idle', 'drafted', 'published'];
      const res = validateTrajectory('SermonFlow', trajectory);
      expect(res.success).toBe(false);
      expect(res.error).toContain('TransitionFamilyRefused');
      expect(res.error).toContain("Missing required intermediate states: reviewed");
    });
  });

  describe('VolunteerFlow Validation', () => {
    it('admits conforming VolunteerFlow state changes', () => {
      const trajectory = ['idle', 'applied', 'interview_scheduled', 'approved', 'assigned'];
      const res = validateTrajectory('VolunteerFlow', trajectory);
      expect(res.success).toBe(true);
    });

    it('refuses VolunteerFlow with illegal reverse transition', () => {
      const trajectory = ['idle', 'applied', 'idle'];
      const res = validateTrajectory('VolunteerFlow', trajectory);
      expect(res.success).toBe(false);
      expect(res.error).toContain('TransitionFamilyRefused');
      expect(res.error).toContain("Illegal transition from 'applied' to 'idle'");
    });
  });
});
