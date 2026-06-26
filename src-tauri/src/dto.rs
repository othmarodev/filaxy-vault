use filaxy_vault_core::vault::model::{Entry, EntryKind};
use serde::Serialize;

#[derive(Serialize)]
pub struct EntrySummary {
    pub id: String,
    pub title: String,
    pub username: String,
    pub url: String,
    pub tags: Vec<String>,
    pub has_totp: bool,
    /// "login" or "seed" — lets the UI route to the right detail/editor view.
    pub kind: String,
    /// For seed entries: number of words (so the list can show a hint). 0 otherwise.
    pub word_count: usize,
}

pub fn from_entry(e: &Entry) -> EntrySummary {
    EntrySummary {
        id: e.id.to_string(),
        title: e.title.clone(),
        username: e.username.clone(),
        url: e.url.clone(),
        tags: e.tags.clone(),
        has_totp: e.totp_secret.is_some(),
        kind: match e.kind { EntryKind::Login => "login".into(), EntryKind::Seed => "seed".into() },
        word_count: e.seed.as_ref().map(|s| s.words.len()).unwrap_or(0),
    }
}

#[derive(Serialize)]
pub struct EntrySecret {
    pub password: String,
    pub notes: String,
    pub totp_code: Option<String>,
}

/// Sensitive payload for a seed-phrase entry. Returned only on explicit request.
#[derive(Serialize)]
pub struct SeedSecret {
    pub words: Vec<String>,
    pub network: String,
    pub derivation_path: String,
    pub passphrase: String,
    pub notes: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn summary_excludes_secrets() {
        let mut e = Entry::new("Gmail");
        e.username = "me".into();
        e.set_password("topsecret", 1);
        let s = from_entry(&e);
        assert_eq!(s.title, "Gmail");
        assert_eq!(s.username, "me");
        // EntrySummary has no password field at all — compile-time guarantee.
        let json = serde_json::to_string(&s).unwrap();
        assert!(!json.contains("topsecret"));
    }
}
