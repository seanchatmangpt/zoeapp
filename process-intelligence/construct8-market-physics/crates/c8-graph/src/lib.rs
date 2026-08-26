//! # C8 Graph
//!
//! Graph-based delta engine for Construct8.

use c8_core::{NodeId, RelationId, Construct8Mask, Need9};
use serde::{Serialize, Deserialize};
use thiserror::Error;

/// A reference to a triple in the graph.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TripleRef {
    pub subject: NodeId,
    pub relation: RelationId,
    pub object: NodeId,
}

/// A triple used in Construct8 operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Construct8Triple {
    pub subject: NodeId,
    pub relation: RelationId,
    pub object: NodeId,
}

/// A delta containing exactly up to 8 triples.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Construct8Delta {
    triples: [Construct8Triple; 8],
    len: u8,
}

impl Construct8Delta {
    /// Create an empty delta.
    pub fn empty() -> Self {
        let empty_triple = Construct8Triple {
            subject: NodeId::from(0),
            relation: RelationId::from(0),
            object: NodeId::from(0),
        };
        Self {
            triples: [empty_triple; 8],
            len: 0,
        }
    }

    /// Return the number of triples in the delta.
    pub fn len(&self) -> u8 {
        self.len
    }

    /// Return a bitmask representing the active slots.
    pub fn mask(&self) -> Construct8Mask {
        Construct8Mask(((1u16 << self.len) - 1) as u8)
    }

    /// Return the fixed slots of the delta.
    pub fn as_fixed_slots(&self) -> &[Construct8Triple; 8] {
        &self.triples
    }

    /// Check if the delta contains a specific relation.
    pub fn contains_relation(&self, relation: RelationId) -> bool {
        for i in 0..self.len as usize {
            if self.triples[i].relation == relation {
                return true;
            }
        }
        false
    }

    /// Count occurrences of a specific relation in the delta.
    pub fn relation_count(&self, relation: RelationId) -> u8 {
        let mut count = 0;
        for i in 0..self.len as usize {
            if self.triples[i].relation == relation {
                count += 1;
            }
        }
        count
    }

    /// Calculate a simple state hash for the delta.
    pub fn state_hash(&self) -> u64 {
        let mut hash = 0u64;
        for i in 0..self.len as usize {
            let t = &self.triples[i];
            hash ^= t.subject.0 .0 ^ t.relation.0 .0 ^ t.object.0 .0;
        }
        hash
    }
}

/// Builder for Construct8Delta.
#[derive(Debug, Clone, Copy)]
pub struct Construct8DeltaBuilder {
    delta: Construct8Delta,
}

impl Construct8DeltaBuilder {
    pub fn new() -> Self {
        Self {
            delta: Construct8Delta::empty(),
        }
    }

    pub fn push_checked(&mut self, triple: Construct8Triple) -> Result<(), Need9> {
        if self.delta.len >= 8 {
            Err(Need9)
        } else {
            self.delta.triples[self.delta.len as usize] = triple;
            self.delta.len += 1;
            Ok(())
        }
    }

    pub fn build(self) -> Construct8Delta {
        self.delta
    }
}

impl Default for Construct8DeltaBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Refusal type for Construct8 operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Error, Serialize, Deserialize)]
pub enum Construct8Refusal {
    #[error("Construct8 capacity exceeded")]
    Need9,
}

impl From<Need9> for Construct8Refusal {
    fn from(_: Need9) -> Self {
        Self::Need9
    }
}

/// Statistics for branchless application.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct BranchlessApplyStats {
    pub applied_count: u8,
}

/// Result of a graph application.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct GraphApplyResult {
    pub stats: BranchlessApplyStats,
}

/// A field in the graph that can accept deltas.
#[derive(Debug, Default)]
pub struct GraphField {
    // Internal state could be added here.
}

impl GraphField {
    pub fn new() -> Self {
        Self::default()
    }

    /// Apply a delta to the graph field using mask-based iteration.
    pub fn apply_construct8(&mut self, delta: &Construct8Delta) -> GraphApplyResult {
        let mask = delta.mask().0;
        let triples = delta.as_fixed_slots();
        let mut applied_count = 0;

        for i in 0..8 {
            if (mask & (1 << i)) != 0 {
                // In a real implementation, we would apply triples[i] to the field's state.
                let _triple = &triples[i];
                applied_count += 1;
            }
        }

        GraphApplyResult {
            stats: BranchlessApplyStats {
                applied_count,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use c8_core::{NodeId, RelationId, Need9};

    #[test]
    fn test_delta_builder_limit() {
        let mut builder = Construct8DeltaBuilder::new();
        let triple = Construct8Triple {
            subject: NodeId::from(1),
            relation: RelationId::from(1),
            object: NodeId::from(2),
        };

        for _ in 0..8 {
            assert!(builder.push_checked(triple).is_ok());
        }
        assert_eq!(builder.push_checked(triple), Err(Need9));
    }

    #[test]
    fn test_delta_mask_and_len() {
        let mut builder = Construct8DeltaBuilder::new();
        let triple = Construct8Triple {
            subject: NodeId::from(1),
            relation: RelationId::from(1),
            object: NodeId::from(2),
        };

        let delta0 = builder.build();
        assert_eq!(delta0.len(), 0);
        assert_eq!(delta0.mask().0, 0);

        builder.push_checked(triple).unwrap();
        let delta1 = builder.build();
        assert_eq!(delta1.len(), 1);
        assert_eq!(delta1.mask().0, 0b00000001);

        for _ in 0..7 {
            builder.push_checked(triple).unwrap();
        }
        let delta8 = builder.build();
        assert_eq!(delta8.len(), 8);
        assert_eq!(delta8.mask().0, 0xFF);
    }

    #[test]
    fn test_graph_field_apply() {
        let mut field = GraphField::new();
        let mut builder = Construct8DeltaBuilder::new();
        let triple = Construct8Triple {
            subject: NodeId::from(1),
            relation: RelationId::from(1),
            object: NodeId::from(2),
        };

        builder.push_checked(triple).unwrap();
        builder.push_checked(triple).unwrap();
        let delta = builder.build();

        let result = field.apply_construct8(&delta);
        assert_eq!(result.stats.applied_count, 2);
    }

    #[test]
    fn test_relation_queries() {
        let mut builder = Construct8DeltaBuilder::new();
        let r1 = RelationId::from(1);
        let r2 = RelationId::from(2);
        
        builder.push_checked(Construct8Triple {
            subject: NodeId::from(1),
            relation: r1,
            object: NodeId::from(2),
        }).unwrap();
        
        builder.push_checked(Construct8Triple {
            subject: NodeId::from(1),
            relation: r1,
            object: NodeId::from(3),
        }).unwrap();

        let delta = builder.build();
        assert!(delta.contains_relation(r1));
        assert!(!delta.contains_relation(r2));
        assert_eq!(delta.relation_count(r1), 2);
        assert_eq!(delta.relation_count(r2), 0);
    }
}
