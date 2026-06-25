use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
pub struct EntryVersion {
    pub password: String,
    pub edited_at: i64,
}

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
pub struct Entry {
    pub id: Uuid,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: String,
    pub notes: String,
    pub tags: Vec<String>,
    pub totp_secret: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub history: Vec<EntryVersion>,
}

impl Entry {
    pub fn new(title: impl Into<String>) -> Self {
        Entry {
            id: Uuid::new_v4(),
            title: title.into(),
            username: String::new(),
            password: String::new(),
            url: String::new(),
            notes: String::new(),
            tags: Vec::new(),
            totp_secret: None,
            created_at: 0,
            updated_at: 0,
            history: Vec::new(),
        }
    }

    /// Replace the password, archiving the previous non-empty one in history.
    pub fn set_password(&mut self, new_pw: impl Into<String>, now: i64) {
        if !self.password.is_empty() {
            self.history.push(EntryVersion { password: self.password.clone(), edited_at: now });
        }
        self.password = new_pw.into();
        self.updated_at = now;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_entry_has_unique_id_and_empty_history() {
        let a = Entry::new("Gmail");
        let b = Entry::new("Gmail");
        assert_ne!(a.id, b.id);
        assert!(a.history.is_empty());
    }

    #[test]
    fn first_password_set_does_not_create_history() {
        let mut e = Entry::new("Gmail");
        e.set_password("hunter2", 100);
        assert_eq!(e.password, "hunter2");
        assert!(e.history.is_empty());
        assert_eq!(e.updated_at, 100);
    }

    #[test]
    fn changing_password_archives_previous() {
        let mut e = Entry::new("Gmail");
        e.set_password("old", 100);
        e.set_password("new", 200);
        assert_eq!(e.password, "new");
        assert_eq!(e.history.len(), 1);
        assert_eq!(e.history[0].password, "old");
        assert_eq!(e.history[0].edited_at, 200);
    }
}
