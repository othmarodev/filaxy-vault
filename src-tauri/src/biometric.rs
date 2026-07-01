//! Touch ID (biometric) gate for the "remember on this device" unlock.
//! macOS-only via LocalAuthentication; other platforms get no-op stubs.

#[cfg(target_os = "macos")]
mod imp {
    use block2::RcBlock;
    use objc2::runtime::Bool;
    use objc2_foundation::{NSError, NSString};
    use objc2_local_authentication::{LAContext, LAPolicy};
    use std::sync::mpsc;

    /// True if the Mac can authenticate with biometrics (Touch ID present + enrolled).
    pub fn is_available() -> bool {
        let ctx = unsafe { LAContext::new() };
        unsafe {
            ctx.canEvaluatePolicy_error(LAPolicy::DeviceOwnerAuthenticationWithBiometrics)
                .is_ok()
        }
    }

    /// Prompt Touch ID. Ok(()) on success. If biometrics aren't available at all,
    /// returns Ok(()) so callers can fall back to their existing behavior.
    pub fn authenticate(reason: &str) -> Result<(), String> {
        let ctx = unsafe { LAContext::new() };
        if unsafe {
            ctx.canEvaluatePolicy_error(LAPolicy::DeviceOwnerAuthenticationWithBiometrics)
                .is_err()
        } {
            return Ok(());
        }

        let reason_ns = NSString::from_str(reason);
        let (tx, rx) = mpsc::channel::<Result<(), String>>();
        let block = RcBlock::new(move |success: Bool, error: *mut NSError| {
            if success.as_bool() {
                let _ = tx.send(Ok(()));
            } else {
                let msg = if error.is_null() {
                    "Touch ID authentication failed".to_string()
                } else {
                    unsafe { (*error).localizedDescription() }.to_string()
                };
                let _ = tx.send(Err(msg));
            }
        });

        unsafe {
            ctx.evaluatePolicy_localizedReason_reply(
                LAPolicy::DeviceOwnerAuthenticationWithBiometrics,
                &reason_ns,
                &block,
            );
        }

        rx.recv()
            .map_err(|_| "Touch ID cancelled".to_string())?
    }
}

#[cfg(not(target_os = "macos"))]
mod imp {
    pub fn is_available() -> bool {
        false
    }
    pub fn authenticate(_reason: &str) -> Result<(), String> {
        Ok(())
    }
}

pub use imp::{authenticate, is_available};
