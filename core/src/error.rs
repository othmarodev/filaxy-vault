use thiserror::Error;

#[derive(Debug, Error)]
pub enum VaultError {
    /// Generic open failure — used for wrong password, wrong key file, AND
    /// tampered/corrupt file so the caller cannot tell which factor failed.
    #[error("cannot open vault")]
    CannotOpen,
    #[error("key derivation failed")]
    Kdf,
    #[error("serialization error")]
    Serialization,
    #[error("invalid vault file")]
    BadFormat,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("import error: {0}")]
    Import(String),
}

pub type Result<T> = std::result::Result<T, VaultError>;
