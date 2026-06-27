//! Offline password-health analysis. Runs entirely on the decrypted vault in
//! memory — NO network, NO Have I Been Pwned. Only metadata (id/title) leaves
//! this module; passwords never do.

use std::collections::{HashMap, HashSet};
use crate::vault::model::Entry;

/// One flagged entry in a health category.
#[derive(Debug, Clone, PartialEq)]
pub struct HealthItem {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Default, Clone, PartialEq)]
pub struct HealthReport {
    pub weak: Vec<HealthItem>,
    pub reused: Vec<HealthItem>,
    pub old: Vec<HealthItem>,
    pub expired: Vec<HealthItem>,
    /// Entries that look like accidental duplicates of another entry
    /// (same title + username + url + password). Informational — clutter, not
    /// a security flaw, so it does NOT affect the score.
    pub duplicates: Vec<HealthItem>,
    /// Number of entries with a password that were considered.
    pub total: usize,
    /// 0–100 overall score (100 = no weak/reused/old password issues).
    pub score: u8,
}

const WEAK_BITS: f64 = 60.0;
const OLD_DAYS: i64 = 365;

/// Rough password entropy estimate: length × log2(charset size in use).
pub fn password_entropy_bits(pw: &str) -> f64 {
    if pw.is_empty() {
        return 0.0;
    }
    let mut charset = 0u32;
    if pw.chars().any(|c| c.is_ascii_lowercase()) { charset += 26; }
    if pw.chars().any(|c| c.is_ascii_uppercase()) { charset += 26; }
    if pw.chars().any(|c| c.is_ascii_digit()) { charset += 10; }
    if pw.chars().any(|c| !c.is_ascii_alphanumeric()) { charset += 33; }
    if charset == 0 { charset = 26; }
    pw.chars().count() as f64 * (charset as f64).log2()
}

pub fn analyze(entries: &[Entry], now: i64) -> HealthReport {
    let live: Vec<&Entry> = entries.iter().filter(|e| !e.trashed).collect();

    // count password occurrences to detect reuse
    let mut counts: HashMap<&str, u32> = HashMap::new();
    for e in &live {
        if !e.password.is_empty() {
            *counts.entry(e.password.as_str()).or_insert(0) += 1;
        }
    }

    // count identical (title|username|url|password) tuples to detect duplicate entries
    let dup_key = |e: &Entry| {
        format!(
            "{}\u{1}{}\u{1}{}\u{1}{}",
            e.title.trim().to_lowercase(),
            e.username.trim().to_lowercase(),
            e.url.trim().to_lowercase(),
            e.password
        )
    };
    let mut dup_counts: HashMap<String, u32> = HashMap::new();
    for e in &live {
        *dup_counts.entry(dup_key(e)).or_insert(0) += 1;
    }

    let mk = |e: &Entry| HealthItem { id: e.id.to_string(), title: e.title.clone() };
    let mut report = HealthReport::default();
    let mut pw_total = 0usize;
    let mut affected: HashSet<String> = HashSet::new();

    for e in &live {
        let has_pw = !e.password.is_empty();
        if has_pw {
            pw_total += 1;
            if password_entropy_bits(&e.password) < WEAK_BITS {
                report.weak.push(mk(e));
                affected.insert(e.id.to_string());
            }
            if counts.get(e.password.as_str()).copied().unwrap_or(0) > 1 {
                report.reused.push(mk(e));
                affected.insert(e.id.to_string());
            }
            if e.updated_at > 0 && now - e.updated_at > OLD_DAYS * 86_400 {
                report.old.push(mk(e));
                affected.insert(e.id.to_string());
            }
        }
        if let Some(exp) = e.expires_at {
            if exp < now {
                report.expired.push(mk(e)); // informational; not in score denominator
            }
        }
        if dup_counts.get(&dup_key(e)).copied().unwrap_or(0) > 1 {
            report.duplicates.push(mk(e)); // informational; not in score denominator
        }
    }

    report.total = pw_total;
    report.score = if pw_total == 0 {
        100
    } else {
        let healthy = pw_total.saturating_sub(affected.len());
        ((healthy as f64 / pw_total as f64) * 100.0).round() as u8
    };
    report
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::model::Entry;

    fn entry(title: &str, pw: &str, updated: i64) -> Entry {
        let mut e = Entry::new(title);
        e.password = pw.to_string();
        e.updated_at = updated;
        e
    }

    #[test]
    fn entropy_ranks_passwords() {
        assert!(password_entropy_bits("abc") < password_entropy_bits("Tr0ub4dour&3xtra!Long"));
        assert_eq!(password_entropy_bits(""), 0.0);
    }

    #[test]
    fn flags_weak_reused_old_and_scores() {
        let now = 1_000_000_000;
        let entries = vec![
            entry("A", "weak", now),                              // weak
            entry("B", "same-Pass-123!", now),                    // reused (with C)
            entry("C", "same-Pass-123!", now),                    // reused (with B)
            entry("D", "Str0ng&Uniqu3-Passphrase-9xQ", now),      // healthy
            entry("E", "Str0ng&Uniqu3-Other-7zP-Long", now - 400 * 86_400), // old
        ];
        let r = analyze(&entries, now);
        assert_eq!(r.total, 5);
        assert!(r.weak.iter().any(|i| i.title == "A"));
        assert_eq!(r.reused.len(), 2);
        assert!(r.old.iter().any(|i| i.title == "E"));
        // affected: A, B, C, E -> 4 of 5 -> healthy 1 -> score 20
        assert_eq!(r.score, 20);
    }

    #[test]
    fn empty_vault_is_perfect() {
        assert_eq!(analyze(&[], 0).score, 100);
    }

    #[test]
    fn ignores_trashed() {
        let now = 1_000_000_000;
        let mut t = entry("trashed", "weak", now);
        t.trashed = true;
        let r = analyze(&[t], now);
        assert_eq!(r.total, 0);
        assert!(r.weak.is_empty());
    }

    #[test]
    fn flags_duplicate_entries() {
        let now = 1_000_000_000;
        let mut a = entry("GitHub", "Str0ng&Uniqu3-Passphrase-9xQ", now);
        a.username = "me@x.com".into();
        let mut b = a.clone();
        b.id = uuid::Uuid::new_v4();
        // a unique, non-duplicate entry should NOT be flagged
        let c = entry("Other", "An0ther-Uniqu3-Passphrase-7zP-Long", now);
        let r = analyze(&[a, b, c], now);
        assert_eq!(r.duplicates.len(), 2);
        assert!(!r.duplicates.iter().any(|i| i.title == "Other"));
    }

    #[test]
    fn flags_expired() {
        let now = 1_000_000_000;
        let mut e = entry("X", "Str0ng&Uniqu3-Passphrase-9xQ", now);
        e.expires_at = Some(now - 10);
        let r = analyze(&[e], now);
        assert_eq!(r.expired.len(), 1);
    }
}
