use std::path::PathBuf;
use crate::session::Session;

#[derive(Default)]
pub struct AppState {
    pub session: Session,
    pub vault_path: Option<PathBuf>,
}
