pub mod csv;
pub mod xlsx;
pub mod presets;

use crate::vault::model::Entry;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct ColumnMapping {
    pub title: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes: Option<String>,
}

fn col<'a>(headers: &[String], row: &'a [String], name: &Option<String>) -> &'a str {
    match name {
        Some(n) => headers
            .iter()
            .position(|h| h.eq_ignore_ascii_case(n))
            .and_then(|i| row.get(i))
            .map(|s| s.as_str())
            .unwrap_or(""),
        None => "",
    }
}

pub fn rows_to_entries(
    headers: &[String],
    rows: &[Vec<String>],
    map: &ColumnMapping,
    now: i64,
) -> Vec<Entry> {
    rows.iter()
        .map(|row| {
            let title = col(headers, row, &map.title);
            let username = col(headers, row, &map.username);
            let password = col(headers, row, &map.password);
            let url = col(headers, row, &map.url);
            let notes = col(headers, row, &map.notes);

            let final_title = if !title.is_empty() {
                title.to_string()
            } else if !url.is_empty() {
                url.to_string()
            } else {
                username.to_string()
            };

            let mut e = Entry::new(final_title);
            e.username = username.to_string();
            e.url = url.to_string();
            e.notes = notes.to_string();
            e.created_at = now;
            if !password.is_empty() {
                e.set_password(password, now);
            } else {
                e.updated_at = now;
            }
            e
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_columns_into_entries() {
        let headers = vec!["name".to_string(), "login".into(), "secret".into(), "site".into()];
        let rows = vec![vec!["Gmail".into(), "me@x.com".into(), "pw1".into(), "gmail.com".into()]];
        let map = ColumnMapping {
            title: Some("name".into()),
            username: Some("login".into()),
            password: Some("secret".into()),
            url: Some("site".into()),
            notes: None,
        };
        let entries = rows_to_entries(&headers, &rows, &map, 50);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].title, "Gmail");
        assert_eq!(entries[0].username, "me@x.com");
        assert_eq!(entries[0].password, "pw1");
        assert_eq!(entries[0].url, "gmail.com");
        assert_eq!(entries[0].created_at, 50);
    }

    #[test]
    fn missing_title_falls_back_to_url_then_username() {
        let headers = vec!["login".to_string(), "site".into()];
        let rows = vec![
            vec!["a@x.com".into(), "site.com".into()],
            vec!["b@x.com".into(), "".into()],
        ];
        let map = ColumnMapping { username: Some("login".into()), url: Some("site".into()), ..Default::default() };
        let entries = rows_to_entries(&headers, &rows, &map, 0);
        assert_eq!(entries[0].title, "site.com");
        assert_eq!(entries[1].title, "b@x.com");
    }
}
