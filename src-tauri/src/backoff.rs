#[derive(Default, Debug, Clone)]
pub struct Backoff {
    pub failures: u32,
}

impl Backoff {
    pub fn record_failure(&mut self) {
        self.failures = self.failures.saturating_add(1);
    }

    pub fn reset(&mut self) {
        self.failures = 0;
    }

    /// First 3 attempts are free. After that, 500ms doubling, capped at 30s.
    pub fn delay_ms(&self) -> u64 {
        if self.failures <= 3 {
            return 0;
        }
        let steps = self.failures - 3;
        let raw = 500u64.saturating_mul(1u64 << steps.min(20));
        raw.min(30_000)
    }

    pub fn is_blocked(&self) -> bool {
        self.delay_ms() > 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_three_failures_are_free() {
        let mut b = Backoff::default();
        for _ in 0..3 { b.record_failure(); }
        assert_eq!(b.delay_ms(), 0);
        assert!(!b.is_blocked());
    }

    #[test]
    fn delay_grows_then_caps() {
        let mut b = Backoff::default();
        for _ in 0..4 { b.record_failure(); }
        assert_eq!(b.delay_ms(), 1000); // 500 * 2^1
        for _ in 0..20 { b.record_failure(); }
        assert_eq!(b.delay_ms(), 30_000); // capped
        assert!(b.is_blocked());
    }

    #[test]
    fn reset_clears() {
        let mut b = Backoff::default();
        for _ in 0..10 { b.record_failure(); }
        b.reset();
        assert_eq!(b.failures, 0);
        assert_eq!(b.delay_ms(), 0);
    }
}
