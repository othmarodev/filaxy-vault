use crate::import::ColumnMapping;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Preset {
    ApplePasswords,
    Dashlane,
    ProtonPass,
    NordPass,
    Google,
    Chrome,
    LastPass,
    Bitwarden,
    OnePassword,
    Keepass,
}

fn has_all(headers: &[String], names: &[&str]) -> bool {
    names.iter().all(|n| headers.iter().any(|h| h.eq_ignore_ascii_case(n)))
}

/// Detect the source from the CSV headers. Ordered most-specific → most-generic
/// so overlapping schemas (e.g. Apple vs 1Password, Google vs Chrome) resolve to
/// the right one: the distinctive column is checked before the generic fallback.
pub fn detect(headers: &[String]) -> Option<Preset> {
    // Apple Passwords: Title,URL,Username,Password,Notes,OTPAuth (otpauth is the tell)
    if has_all(headers, &["title", "url", "username", "password", "otpauth"]) {
        return Some(Preset::ApplePasswords);
    }
    // Dashlane: username,title,password,note,url,category,otpSecret
    if has_all(headers, &["title", "password", "url", "note", "category"]) {
        return Some(Preset::Dashlane);
    }
    // Proton Pass: type,name,url,email,username,password,note,totp,vault
    if has_all(headers, &["type", "name", "url", "password", "note"]) {
        return Some(Preset::ProtonPass);
    }
    // NordPass: name,url,username,password,note,cardholdername,cardnumber,folder
    if has_all(headers, &["name", "username", "password", "note", "cardholdername"]) {
        return Some(Preset::NordPass);
    }
    // Google Password Manager: name,url,username,password,note
    if has_all(headers, &["name", "url", "username", "password", "note"]) {
        return Some(Preset::Google);
    }
    // Chrome (older): name,url,username,password
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
        Preset::ApplePasswords => ColumnMapping {
            title: Some("title".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: Some("notes".into()),
        },
        Preset::Dashlane => ColumnMapping {
            title: Some("title".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: Some("note".into()),
        },
        Preset::ProtonPass => ColumnMapping {
            title: Some("name".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: Some("note".into()),
        },
        Preset::NordPass => ColumnMapping {
            title: Some("name".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: Some("note".into()),
        },
        Preset::Google => ColumnMapping {
            title: Some("name".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: Some("note".into()),
        },
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

/// Human-friendly source name for the UI (the importer shows what it recognized).
pub fn display_name(p: Preset) -> &'static str {
    match p {
        Preset::ApplePasswords => "Apple Passwords",
        Preset::Dashlane => "Dashlane",
        Preset::ProtonPass => "Proton Pass",
        Preset::NordPass => "NordPass",
        Preset::Google => "Google Passwords",
        Preset::Chrome => "Chrome",
        Preset::LastPass => "LastPass",
        Preset::Bitwarden => "Bitwarden",
        Preset::OnePassword => "1Password",
        Preset::Keepass => "KeePass",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn h(cols: &[&str]) -> Vec<String> { cols.iter().map(|s| s.to_string()).collect() }

    #[test]
    fn detects_bitwarden() {
        let cols = h(&["name", "login_uri", "login_username", "login_password", "notes"]);
        assert_eq!(detect(&cols), Some(Preset::Bitwarden));
        assert_eq!(mapping_for(Preset::Bitwarden).password, Some("login_password".into()));
    }

    #[test]
    fn google_beats_chrome_when_note_present() {
        let cols = h(&["name", "url", "username", "password", "note"]);
        assert_eq!(detect(&cols), Some(Preset::Google));
        let cols = h(&["name", "url", "username", "password"]);
        assert_eq!(detect(&cols), Some(Preset::Chrome));
    }

    #[test]
    fn apple_beats_1password_when_otpauth_present() {
        let cols = h(&["title", "url", "username", "password", "notes", "otpauth"]);
        assert_eq!(detect(&cols), Some(Preset::ApplePasswords));
        let cols = h(&["title", "url", "username", "password", "notes"]);
        assert_eq!(detect(&cols), Some(Preset::OnePassword));
    }

    #[test]
    fn detects_dashlane_proton_nordpass() {
        assert_eq!(detect(&h(&["username", "title", "password", "note", "url", "category"])), Some(Preset::Dashlane));
        assert_eq!(detect(&h(&["type", "name", "url", "email", "username", "password", "note"])), Some(Preset::ProtonPass));
        assert_eq!(detect(&h(&["name", "url", "username", "password", "note", "cardholdername"])), Some(Preset::NordPass));
    }

    #[test]
    fn unknown_headers_return_none() {
        assert_eq!(detect(&h(&["foo", "bar"])), None);
    }
}
