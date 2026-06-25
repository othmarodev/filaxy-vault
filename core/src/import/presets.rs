use crate::import::ColumnMapping;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Preset {
    Chrome,
    LastPass,
    Bitwarden,
    OnePassword,
    Keepass,
}

fn has_all(headers: &[String], names: &[&str]) -> bool {
    names.iter().all(|n| headers.iter().any(|h| h.eq_ignore_ascii_case(n)))
}

pub fn detect(headers: &[String]) -> Option<Preset> {
    // Chrome: name,url,username,password
    if has_all(headers, &["name", "url", "username", "password"]) {
        return Some(Preset::Chrome);
    }
    // LastPass: url,username,password,extra,name,grouping,fav
    if has_all(headers, &["url", "username", "password", "extra", "name"]) {
        return Some(Preset::LastPass);
    }
    // Bitwarden: name,login_uri,login_username,login_password,notes
    if has_all(headers, &["name", "login_uri", "login_username", "login_password"]) {
        return Some(Preset::Bitwarden);
    }
    // 1Password: Title,Url,Username,Password,Notes
    if has_all(headers, &["title", "url", "username", "password"]) {
        return Some(Preset::OnePassword);
    }
    // KeePass: "Account","Login Name","Password","Web Site","Comments"
    if has_all(headers, &["account", "login name", "password", "web site"]) {
        return Some(Preset::Keepass);
    }
    None
}

pub fn mapping_for(p: Preset) -> ColumnMapping {
    match p {
        Preset::Chrome => ColumnMapping {
            title: Some("name".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: None,
        },
        Preset::LastPass => ColumnMapping {
            title: Some("name".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: Some("extra".into()),
        },
        Preset::Bitwarden => ColumnMapping {
            title: Some("name".into()), username: Some("login_username".into()),
            password: Some("login_password".into()), url: Some("login_uri".into()), notes: Some("notes".into()),
        },
        Preset::OnePassword => ColumnMapping {
            title: Some("title".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: Some("notes".into()),
        },
        Preset::Keepass => ColumnMapping {
            title: Some("account".into()), username: Some("login name".into()),
            password: Some("password".into()), url: Some("web site".into()), notes: Some("comments".into()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_bitwarden() {
        let h: Vec<String> = ["name","login_uri","login_username","login_password","notes"]
            .iter().map(|s| s.to_string()).collect();
        assert_eq!(detect(&h), Some(Preset::Bitwarden));
        let m = mapping_for(Preset::Bitwarden);
        assert_eq!(m.password, Some("login_password".into()));
    }

    #[test]
    fn unknown_headers_return_none() {
        let h: Vec<String> = ["foo","bar"].iter().map(|s| s.to_string()).collect();
        assert_eq!(detect(&h), None);
    }
}
