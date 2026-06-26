pub mod model;
pub mod format;
pub mod store;
pub mod health;

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use model::Entry;

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug, Default)]
pub struct Vault {
    pub entries: Vec<Entry>,
}

impl Vault {
    pub fn add(&mut self, e: Entry) {
        self.entries.push(e);
    }

    pub fn remove(&mut self, id: Uuid) -> bool {
        let before = self.entries.len();
        self.entries.retain(|e| e.id != id);
        self.entries.len() != before
    }

    pub fn get(&self, id: Uuid) -> Option<&Entry> {
        self.entries.iter().find(|e| e.id == id)
    }

    pub fn get_mut(&mut self, id: Uuid) -> Option<&mut Entry> {
        self.entries.iter_mut().find(|e| e.id == id)
    }

    pub fn search(&self, q: &str) -> Vec<&Entry> {
        let q = q.to_lowercase();
        if q.is_empty() {
            return self.entries.iter().collect();
        }
        self.entries
            .iter()
            .filter(|e| {
                e.title.to_lowercase().contains(&q)
                    || e.username.to_lowercase().contains(&q)
                    || e.url.to_lowercase().contains(&q)
                    || e.tags.iter().any(|t| t.to_lowercase().contains(&q))
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_get_remove() {
        let mut v = Vault::default();
        let e = Entry::new("Gmail");
        let id = e.id;
        v.add(e);
        assert!(v.get(id).is_some());
        assert!(v.remove(id));
        assert!(v.get(id).is_none());
        assert!(!v.remove(id));
    }

    #[test]
    fn search_is_case_insensitive_over_fields() {
        let mut v = Vault::default();
        let mut e = Entry::new("GitHub");
        e.username = "othmaro".into();
        e.url = "https://github.com".into();
        e.tags = vec!["dev".into()];
        v.add(e);
        assert_eq!(v.search("github").len(), 1);
        assert_eq!(v.search("OTHMARO").len(), 1);
        assert_eq!(v.search("dev").len(), 1);
        assert_eq!(v.search("nope").len(), 0);
        assert_eq!(v.search("").len(), 1);
    }
}
