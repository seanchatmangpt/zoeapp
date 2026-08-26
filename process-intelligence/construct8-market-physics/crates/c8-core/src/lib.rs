//! # C8 Core
//!
//! Foundational type laws for Construct8 market physics.
//!
//! This crate defines the core identifiers, length constraints, and path verdicts
//! that govern the market physics engine.

use serde::{Serialize, Deserialize};
use thiserror::Error;

/// Core Identifier for all Construct8 entities.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct C8Id(pub u64);

macro_rules! define_id {
    ($name:ident) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
        pub struct $name(pub C8Id);
        impl From<u64> for $name {
            fn from(v: u64) -> Self {
                Self(C8Id(v))
            }
        }
        impl From<C8Id> for $name {
            fn from(v: C8Id) -> Self {
                Self(v)
            }
        }
    };
}

define_id!(NodeId);
define_id!(RelationId);
define_id!(VenueId);
define_id!(InstrumentId);
define_id!(ActorClassId);

/// Represents a slot in the graph.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct GraphSlot(pub u8);

/// Length constraint for Construct8. Must be <= 8.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct Construct8Len(u8);

impl Construct8Len {
    pub const MAX: u8 = 8;

    /// Create a new Construct8Len. Returns Need9 if len > 8.
    /// 
    /// # Examples
    /// 
    /// ```
    /// use c8_core::{Construct8Len, Need9};
    /// let len = Construct8Len::new(8).unwrap();
    /// assert_eq!(len.get(), 8);
    /// assert!(Construct8Len::new(9).is_err());
    /// ```
    pub fn new(len: u8) -> Result<Self, Need9> {
        if len <= Self::MAX {
            Ok(Self(len))
        } else {
            Err(Need9)
        }
    }

    pub fn get(&self) -> u8 {
        self.0
    }
}

/// Bitmask for Construct8 elements (up to 8).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Construct8Mask(pub u8);

/// A typed refusal for when a length of 9 or more is requested.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
#[error("Construct8 refusal: length 9 or greater is prohibited by type law")]
pub struct Need9;

/// Standard Error type for Construct8.
#[derive(Debug, Error)]
pub enum C8Error {
    #[error("Type Law Violation: {0}")]
    TypeLawViolation(String),
    #[error("Internal Refusal: {0}")]
    Refusal(#[from] Need9),
}

/// Standard Result type for Construct8.
pub type C8Result<T> = Result<T, C8Error>;

/// Verdict for the hot path. No open strings allowed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HotPathVerdict {
    Allow,
    Deny,
    Redirect,
    Retry,
}

/// Explanation for the cold path. Strings allowed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ColdPathExplanation(pub String);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_construct8_len_invariant() {
        assert!(Construct8Len::new(0).is_ok());
        assert!(Construct8Len::new(8).is_ok());
        assert_eq!(Construct8Len::new(9), Err(Need9));
    }

    #[test]
    fn test_hot_path_verdict_is_copy() {
        // Ensuring HotPathVerdict is Copy ensures it does not contain heap-allocated strings
        // or other non-POD types that would violate the "no open strings" requirement in hot paths.
        let v = HotPathVerdict::Allow;
        let v2 = v;
        assert_eq!(v, v2);
    }

    #[test]
    fn test_ids() {
        let id = C8Id(42);
        let node_id = NodeId::from(id);
        assert_eq!(node_id.0, id);
        
        let venue_id = VenueId::from(100);
        assert_eq!(venue_id.0 .0, 100);
    }
}
