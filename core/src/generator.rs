use crate::crypto::random;
use crate::error::{Result, VaultError};

const LOWER: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
const UPPER: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS: &[u8] = b"0123456789";
const SYMBOLS: &[u8] = b"!@#$%^&*()-_=+[]{};:,.?";
const AMBIGUOUS: &[u8] = b"O0oIl1|S5B8";

#[derive(Clone, Debug)]
pub struct GenOptions {
    pub length: usize,
    pub lower: bool,
    pub upper: bool,
    pub digits: bool,
    pub symbols: bool,
    pub exclude_ambiguous: bool,
}

impl Default for GenOptions {
    fn default() -> Self {
        Self { length: 20, lower: true, upper: true, digits: true, symbols: true, exclude_ambiguous: true }
    }
}

fn charset(opts: &GenOptions) -> Vec<u8> {
    let mut set: Vec<u8> = Vec::new();
    if opts.lower { set.extend_from_slice(LOWER); }
    if opts.upper { set.extend_from_slice(UPPER); }
    if opts.digits { set.extend_from_slice(DIGITS); }
    if opts.symbols { set.extend_from_slice(SYMBOLS); }
    if opts.exclude_ambiguous { set.retain(|c| !AMBIGUOUS.contains(c)); }
    set
}

pub fn generate(opts: &GenOptions) -> Result<String> {
    let set = charset(opts);
    if set.is_empty() || opts.length == 0 {
        return Err(VaultError::Import("invalid generator options".into()));
    }
    let n = set.len() as u8;
    // largest multiple of n that fits in a u8, for unbiased rejection sampling
    let limit = (256u16 - (256u16 % set.len() as u16)) as u16;
    let mut out = String::with_capacity(opts.length);
    let mut buf = [0u8; 1];
    while out.len() < opts.length {
        random::fill(&mut buf)?;
        if (buf[0] as u16) < limit {
            out.push(set[(buf[0] % n) as usize] as char);
        }
    }
    Ok(out)
}

pub fn entropy_bits(opts: &GenOptions) -> f64 {
    let size = charset(opts).len();
    if size <= 1 || opts.length == 0 {
        return 0.0;
    }
    opts.length as f64 * (size as f64).log2()
}

// ── Passphrase (diceware) generator ──────────────────────────────────────────
// EFF large wordlist (7776 words), the standard diceware list. One word per line.
const EFF_WORDLIST: &str = include_str!("wordlist_eff.txt");

fn words() -> Vec<&'static str> {
    EFF_WORDLIST.lines().filter(|l| !l.is_empty()).collect()
}

#[derive(Clone, Debug)]
pub struct PassphraseOptions {
    pub words: usize,
    /// Separator between words (e.g. "-", " ", ".").
    pub separator: String,
    /// Capitalize the first letter of each word.
    pub capitalize: bool,
    /// Append a random digit to one word, for sites that demand a number.
    pub include_number: bool,
}

impl Default for PassphraseOptions {
    fn default() -> Self {
        Self { words: 5, separator: "-".into(), capitalize: false, include_number: false }
    }
}

/// Unbiased index in `0..n` via rejection sampling over two random bytes.
fn random_index(n: usize) -> Result<usize> {
    debug_assert!(n > 0 && n <= u16::MAX as usize);
    let limit = (u16::MAX as usize + 1) - ((u16::MAX as usize + 1) % n);
    let mut buf = [0u8; 2];
    loop {
        random::fill(&mut buf)?;
        let v = u16::from_le_bytes(buf) as usize;
        if v < limit {
            return Ok(v % n);
        }
    }
}

pub fn generate_passphrase(opts: &PassphraseOptions) -> Result<String> {
    let list = words();
    if opts.words == 0 || list.is_empty() {
        return Err(VaultError::Import("invalid passphrase options".into()));
    }
    let mut parts: Vec<String> = Vec::with_capacity(opts.words);
    for _ in 0..opts.words {
        let w = list[random_index(list.len())?];
        let w = if opts.capitalize {
            let mut c = w.chars();
            match c.next() {
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                None => String::new(),
            }
        } else {
            w.to_string()
        };
        parts.push(w);
    }
    if opts.include_number {
        let i = random_index(parts.len())?;
        let d = random_index(10)?;
        parts[i].push_str(&d.to_string());
    }
    Ok(parts.join(&opts.separator))
}

/// Entropy from the word choices alone (the standard diceware estimate):
/// `words * log2(7776)`. The optional appended digit adds a little more.
pub fn passphrase_entropy_bits(opts: &PassphraseOptions) -> f64 {
    let list_len = words().len();
    if opts.words == 0 || list_len <= 1 {
        return 0.0;
    }
    let mut bits = opts.words as f64 * (list_len as f64).log2();
    if opts.include_number {
        bits += (10f64).log2();
    }
    bits
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_requested_length() {
        let pw = generate(&GenOptions::default()).unwrap();
        assert_eq!(pw.chars().count(), 20);
    }

    #[test]
    fn respects_charset_digits_only() {
        let opts = GenOptions { length: 40, lower: false, upper: false, digits: true, symbols: false, exclude_ambiguous: false };
        let pw = generate(&opts).unwrap();
        assert!(pw.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn excludes_ambiguous_chars() {
        let opts = GenOptions { length: 200, exclude_ambiguous: true, ..GenOptions::default() };
        let pw = generate(&opts).unwrap();
        assert!(pw.bytes().all(|b| !AMBIGUOUS.contains(&b)));
    }

    #[test]
    fn empty_charset_errors() {
        let opts = GenOptions { length: 10, lower: false, upper: false, digits: false, symbols: false, exclude_ambiguous: false };
        assert!(generate(&opts).is_err());
    }

    #[test]
    fn entropy_increases_with_length() {
        let short = GenOptions { length: 8, ..GenOptions::default() };
        let long = GenOptions { length: 32, ..GenOptions::default() };
        assert!(entropy_bits(&long) > entropy_bits(&short));
    }

    #[test]
    fn wordlist_has_7776_words() {
        assert_eq!(words().len(), 7776);
    }

    #[test]
    fn passphrase_has_requested_word_count() {
        let opts = PassphraseOptions { words: 6, separator: "-".into(), capitalize: false, include_number: false };
        let p = generate_passphrase(&opts).unwrap();
        assert_eq!(p.split('-').count(), 6);
    }

    #[test]
    fn passphrase_capitalizes_when_asked() {
        let opts = PassphraseOptions { words: 4, separator: " ".into(), capitalize: true, include_number: false };
        let p = generate_passphrase(&opts).unwrap();
        assert!(p.split(' ').all(|w| w.chars().next().unwrap().is_uppercase()));
    }

    #[test]
    fn passphrase_entropy_grows_with_words() {
        let a = PassphraseOptions { words: 4, ..Default::default() };
        let b = PassphraseOptions { words: 8, ..Default::default() };
        assert!(passphrase_entropy_bits(&b) > passphrase_entropy_bits(&a));
    }
}
