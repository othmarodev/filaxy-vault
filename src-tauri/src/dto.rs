use filaxy_vault_core::vault::model::Entry;
use serde::Serialize;

#[derive(Serialize)]
pub struct EntrySummary {
    pub id: String,
    pub title: String,
    pub username: String,
    pub url: String,
    pub tags: Vec<String>,
    pub has_totp: bool,
}

pub fn from_entry(e: &Entry) -> EntrySummary {
    EntrySummary {
        id: e.id.to_string(),
        title: e.title.clone(),
        username: e.username.clone(),
        url: e.url.clone(),
        tags: e.tags.clone(),
        has_totp: e.totp_secret.is_some(),
    }
}

#[derive(Serialize)]
pub struct EntrySecret {
    pub password: String,
    pub notes: String,
    pub totp_code: Option<String>,
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
