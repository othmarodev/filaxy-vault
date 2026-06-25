use filaxy_vault_core::crypto::kdf::KdfParams;
use filaxy_vault_core::vault::Vault;
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;
use crate::backoff::Backoff;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Settings {
    pub autolock_secs: u64,
    pub clipboard_clear_secs: u64,
}

impl Default for Settings {
    fn default() -> Self {
        Self { autolock_secs: 300, clipboard_clear_secs: 20 }
    }
}

pub struct Unlocked {
    pub vault: Vault,
    pub password: Zeroizing<Vec<u8>>,
    pub keyfile: Option<Zeroizing<Vec<u8>>>,
    pub params: KdfParams,
    pub settings: Settings,
}

#[derive(Default)]
pub struct Session {
    pub unlocked: Option<Unlocked>,
    pub last_activity_secs: u64,
    pub backoff: Backoff,
}

impl Session {
    pub fn is_locked(&self) -> bool {
        self.unlocked.is_none()
    }

    pub fn set_unlocked(&mut self, u: Unlocked, now: u64) {
        self.unlocked = Some(u);
        self.last_activity_secs = now;
        self.backoff.reset();
    }

    pub fn lock(&mut self) {
        // Dropping Unlocked zeroizes password/keyfile (Zeroizing) and frees the vault.
        self.unlocked = None;
    }

    pub fn touch(&mut self, now: u64) {
        self.last_activity_secs = now;
    }

    pub fn is_expired(&self, now: u64) -> bool {
        match &self.unlocked {
            None => false,
            Some(u) => now.saturating_sub(self.last_activity_secs) >= u.settings.autolock_secs,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unlocked(autolock: u64) -> Unlocked {
        Unlocked {
            vault: Vault::default(),
            password: Zeroizing::new(b"pw".to_vec()),
            keyfile: None,
            params: KdfParams::default(),
            settings: Settings { autolock_secs: autolock, clipboard_clear_secs: 20 },
        }
    }

    #[test]
    fn starts_locked() {
        let s = Session::default();
        assert!(s.is_locked());
        assert!(!s.is_expired(0));
    }

    #[test]
    fn unlock_then_lock() {
        let mut s = Session::default();
        s.set_unlocked(unlocked(300), 100);
        assert!(!s.is_locked());
        s.lock();
        assert!(s.is_locked());
    }

    #[test]
    fn expires_after_idle_window() {
        let mut s = Session::default();
        s.set_unlocked(unlocked(300), 1000);
        assert!(!s.is_expired(1299));
        assert!(s.is_expired(1300));
        s.touch(1300);
        assert!(!s.is_expired(1599));
    }
}
