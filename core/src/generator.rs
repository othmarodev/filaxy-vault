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
}
