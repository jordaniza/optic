#![allow(dead_code, unused_imports, unused_variables)]

mod events;
mod interactions;
mod projections;
mod protos;
mod queries;
mod shapes;
mod state;
pub mod tracing;
pub mod streams;

pub use cqrs_core::Aggregate;
pub use events::{HttpInteraction, SpecEvent};
pub use interactions::diff as diff_interaction;
pub use interactions::result::InteractionDiffResult;
pub use projections::{EndpointProjection, ShapeProjection, SpecProjection};
pub use protos::shapehash;
pub use shapes::diff as diff_shape;

pub mod errors {
  pub use super::events::EventLoadingError;
}
