use std::collections::HashMap;

/// The Lattice trait defines the bounded join-semilattice algebraic structure
/// for integrating cumulative process execution evidence.
pub trait Lattice: Sized + PartialEq + Eq {
    /// The bottom element (no evidence).
    fn bottom() -> Self;
    
    /// The top element (contradiction / conflicting evidence).
    fn top() -> Self;
    
    /// Checks if this element is the bottom element.
    fn is_bottom(&self) -> bool {
        self == &Self::bottom()
    }
    
    /// Checks if this element is the top element (contradiction).
    fn is_top(&self) -> bool {
        self == &Self::top()
    }
    
    /// Computes the join (least upper bound) of two elements.
    fn join(&self, other: &Self) -> Self;
    
    /// Checks the partial order relation (self <= other).
    fn sqsubseteq(&self, other: &Self) -> bool {
        &self.join(other) == other
    }
}

/// 1. Replay Witness State (for Petri Nets, BPMN, POWL, Process Trees)
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WitnessState {
    Bottom,                              // No evidence
    PartialReplay {
        trace_indices: Vec<usize>,       // Indices of replayed events
        marking: Vec<String>,            // Active place labels
        cost: u32,                       // Total alignment cost
    },
    Top,                                 // Contradiction detected
}

impl Lattice for WitnessState {
    fn bottom() -> Self {
        Self::Bottom
    }
    
    fn top() -> Self {
        Self::Top
    }
    
    fn join(&self, other: &Self) -> Self {
        match (self, other) {
            (Self::Top, _) | (_, Self::Top) => Self::Top,
            (Self::Bottom, x) | (x, Self::Bottom) => x.clone(),
            (Self::PartialReplay { trace_indices: t1, marking: m1, cost: c1 }, 
             Self::PartialReplay { trace_indices: t2, marking: m2, cost: c2 }) => {
                // If they are exactly the same, idempotent
                if t1 == t2 && m1 == m2 && c1 == c2 {
                    return self.clone();
                }
                
                // For a proper join, we would union the trace indices, merge markings, and sum costs.
                // However, if they represent divergent unmergeable paths, it might result in Top.
                // For this compat definition, we'll merge them conservatively.
                let mut merged_traces = t1.clone();
                for t in t2 {
                    if !merged_traces.contains(t) {
                        merged_traces.push(*t);
                    }
                }
                merged_traces.sort_unstable();
                
                let mut merged_marking = m1.clone();
                for m in m2 {
                    if !merged_marking.contains(m) {
                        merged_marking.push(m.clone());
                    }
                }
                merged_marking.sort();
                
                // Cost could be sum or max depending on semantics. We'll use sum.
                Self::PartialReplay {
                    trace_indices: merged_traces,
                    marking: merged_marking,
                    cost: c1.max(c2),
                }
            }
        }
    }
}

/// 2. Declare Constraint Valuation Value (for LTLf satisfaction checking)
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConstraintValue {
    Bottom,                              // Not yet evaluated
    PossiblySatisfied,                   // Satisfied under current prefix but could be violated
    Satisfied,                           // Permanently satisfied
    Violated,                            // Permanently violated
    Top,                                 // Contradiction detected
}

impl Lattice for ConstraintValue {
    fn bottom() -> Self {
        Self::Bottom
    }
    
    fn top() -> Self {
        Self::Top
    }
    
    fn join(&self, other: &Self) -> Self {
        use ConstraintValue::*;
        if self == other {
            return self.clone();
        }
        match (self, other) {
            (Top, _) | (_, Top) => Top,
            (Bottom, x) | (x, Bottom) => x.clone(),
            (Satisfied, Violated) | (Violated, Satisfied) => Top,
            (PossiblySatisfied, Satisfied) | (Satisfied, PossiblySatisfied) => Satisfied,
            (PossiblySatisfied, Violated) | (Violated, PossiblySatisfied) => Violated,
            _ => Top, // Fallback contradiction
        }
    }
}

/// 3. Declare Constraints Witness State
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DeclareWitnessState {
    Bottom,
    Evaluated(HashMap<String, ConstraintValue>),
    Top,
}

impl Lattice for DeclareWitnessState {
    fn bottom() -> Self {
        Self::Bottom
    }
    
    fn top() -> Self {
        Self::Top
    }
    
    fn join(&self, other: &Self) -> Self {
        match (self, other) {
            (Self::Top, _) | (_, Self::Top) => Self::Top,
            (Self::Bottom, x) | (x, Self::Bottom) => x.clone(),
            (Self::Evaluated(map1), Self::Evaluated(map2)) => {
                let mut merged = map1.clone();
                for (k, v2) in map2 {
                    if let Some(v1) = merged.get(k) {
                        let joined = v1.join(v2);
                        if joined.is_top() {
                            return Self::Top;
                        }
                        merged.insert(k.clone(), joined);
                    } else {
                        merged.insert(k.clone(), v2.clone());
                    }
                }
                Self::Evaluated(merged)
            }
        }
    }
}

/// 4. Unified Witness State
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UnifiedWitnessState {
    Bottom,
    Active {
        replay: WitnessState,
        declare: DeclareWitnessState,
    },
    Top,
}

impl Lattice for UnifiedWitnessState {
    fn bottom() -> Self {
        Self::Bottom
    }
    
    fn top() -> Self {
        Self::Top
    }
    
    fn join(&self, other: &Self) -> Self {
        match (self, other) {
            (Self::Top, _) | (_, Self::Top) => Self::Top,
            (Self::Bottom, x) | (x, Self::Bottom) => x.clone(),
            (Self::Active { replay: r1, declare: d1 }, Self::Active { replay: r2, declare: d2 }) => {
                let joined_replay = r1.join(r2);
                let joined_declare = d1.join(d2);
                if joined_replay.is_top() || joined_declare.is_top() {
                    Self::Top
                } else {
                    Self::Active {
                        replay: joined_replay,
                        declare: joined_declare,
                    }
                }
            }
        }
    }
}
