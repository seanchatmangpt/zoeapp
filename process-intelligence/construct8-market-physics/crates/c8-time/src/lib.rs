use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct ActorClockId(pub u8);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct VectorClock8 {
    pub lanes: [u64; 8],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VectorClockCompare {
    Before,
    After,
    Concurrent,
    Equal,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct MonotonicStamp(pub u64);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketTimeFrame {
    pub start: MonotonicStamp,
    pub end: Option<MonotonicStamp>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CausalObservation {
    pub actor_id: ActorClockId,
    pub clock: VectorClock8,
    pub stamp: MonotonicStamp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CausalAlignmentResult {
    pub merged_clock: VectorClock8,
    pub drift: i64,
}

impl VectorClock8 {
    pub fn zero() -> Self {
        Self { lanes: [0; 8] }
    }

    pub fn tick_lane(&mut self, lane: ActorClockId) {
        if lane.0 < 8 {
            self.lanes[lane.0 as usize] += 1;
        }
    }

    pub fn merge(&mut self, other: &VectorClock8) {
        for i in 0..8 {
            self.lanes[i] = self.lanes[i].max(other.lanes[i]);
        }
    }

    pub fn compare(&self, other: &VectorClock8) -> VectorClockCompare {
        let mut greater = false;
        let mut less = false;

        for i in 0..8 {
            if self.lanes[i] > other.lanes[i] {
                greater = true;
            } else if self.lanes[i] < other.lanes[i] {
                less = true;
            }
        }

        match (greater, less) {
            (true, true) => VectorClockCompare::Concurrent,
            (true, false) => VectorClockCompare::After,
            (false, true) => VectorClockCompare::Before,
            (false, false) => VectorClockCompare::Equal,
        }
    }
}

impl MonotonicStamp {
    pub fn now() -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_nanos() as u64;
        Self(now)
    }

    pub fn assert_not_before(&self, other: MonotonicStamp) {
        if self.0 < other.0 {
            panic!("Monotonic clock regression detected: {:?} < {:?}", self, other);
        }
    }
}

pub fn zero() -> VectorClock8 {
    VectorClock8::zero()
}

pub fn tick_lane(clock: &mut VectorClock8, lane: ActorClockId) {
    clock.tick_lane(lane);
}

pub fn merge(a: &mut VectorClock8, b: &VectorClock8) {
    a.merge(b);
}

pub fn compare(a: &VectorClock8, b: &VectorClock8) -> VectorClockCompare {
    a.compare(b)
}

pub fn now() -> MonotonicStamp {
    MonotonicStamp::now()
}

pub fn assert_not_before(current: MonotonicStamp, reference: MonotonicStamp) {
    current.assert_not_before(reference);
}

pub fn align(observation: &CausalObservation, local_clock: &mut VectorClock8, local_stamp: &mut MonotonicStamp) -> CausalAlignmentResult {
    // Check monotonicity
    local_stamp.assert_not_before(observation.stamp);
    
    // Merge vector clocks
    local_clock.merge(&observation.clock);
    
    // Calculate drift (difference in nanoseconds if applicable, but here just a conceptual drift)
    let drift = (local_stamp.0 as i64) - (observation.stamp.0 as i64);

    CausalAlignmentResult {
        merged_clock: *local_clock,
        drift,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vector_clock_basic() {
        let mut v1 = VectorClock8::zero();
        let mut v2 = VectorClock8::zero();

        v1.tick_lane(ActorClockId(0));
        v1.tick_lane(ActorClockId(0));
        v2.tick_lane(ActorClockId(0));
        v2.tick_lane(ActorClockId(1));

        assert_eq!(v1.compare(&v2), VectorClockCompare::Concurrent);
        
        v1.merge(&v2);
        assert_eq!(v1.lanes[0], 2);
        assert_eq!(v1.lanes[1], 1);
        
        assert_eq!(v1.compare(&v2), VectorClockCompare::After);
        assert_eq!(v2.compare(&v1), VectorClockCompare::Before);
        assert_eq!(v1.compare(&v1), VectorClockCompare::Equal);
    }

    #[test]
    fn test_monotonic_stamp() {
        let t1 = MonotonicStamp::now();
        // Wait a tiny bit
        std::thread::sleep(std::time::Duration::from_millis(1));
        let t2 = MonotonicStamp::now();
        
        assert!(t2.0 > t1.0);
        t2.assert_not_before(t1);
    }

    #[test]
    #[should_panic(expected = "Monotonic clock regression detected")]
    fn test_monotonic_regression() {
        let t1 = MonotonicStamp(100);
        let t2 = MonotonicStamp(50);
        t2.assert_not_before(t1);
    }

    #[test]
    fn test_align() {
        let mut local_clock = VectorClock8::zero();
        let mut local_stamp = MonotonicStamp(200);
        
        let observation = CausalObservation {
            actor_id: ActorClockId(1),
            clock: {
                let mut c = VectorClock8::zero();
                c.tick_lane(ActorClockId(1));
                c
            },
            stamp: MonotonicStamp(150),
        };
        
        let result = align(&observation, &mut local_clock, &mut local_stamp);
        
        assert_eq!(local_clock.lanes[1], 1);
        assert_eq!(result.drift, 50);
    }
}
