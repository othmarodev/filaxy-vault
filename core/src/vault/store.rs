use std::path::Path;
use crate::crypto::kdf::KdfParams;
use crate::error::Result;
use crate::vault::{format, Vault};

pub fn save(
    path: &Path,
    vault: &Vault,
    password: &[u8],
    keyfile: Option<&[u8]>,
    params: KdfParams,
) -> Result<()> {
    let blob = format::seal(vault, password, keyfile, params)?;
    // ensure the parent directory exists (e.g. the OS app-data dir on first run)
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    // write to a temp file then rename for atomicity
    let tmp = path.with_extension("fvault.tmp");
    std::fs::write(&tmp, &blob)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

pub fn create(path: &Path, password: &[u8], keyfile: Option<&[u8]>) -> Result<()> {
    save(path, &Vault::default(), password, keyfile, KdfParams::default())
}

pub fn load(path: &Path, password: &[u8], keyfile: Option<&[u8]>) -> Result<Vault> {
    let bytes = std::fs::read(path)?;
    format::open(&bytes, password, keyfile)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::kdf::KdfParams;
    use crate::vault::model::Entry;

    fn fast() -> KdfParams { KdfParams { mem_kib: 8 * 1024, time_cost: 1, parallelism: 1 } }

    #[test]
    fn save_and_load_round_trip() {
        let dir = std::env::temp_dir().join(format!("fv-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("v.fvault");

        let mut v = Vault::default();
        let mut e = Entry::new("Bank");
        e.set_password("s3cret", 1);
        v.add(e);

        save(&path, &v, b"pw", None, fast()).unwrap();
        let loaded = load(&path, b"pw", None).unwrap();
        assert_eq!(loaded, v);

        std::fs::remove_dir_all(&dir).ok();
    }
}
