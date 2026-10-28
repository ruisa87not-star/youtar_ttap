use serde::Serialize;

#[derive(Default)]
pub struct CloseState {
    pub dirty: bool,
    pub allowed: bool,
    pub sequence: u64,
    pub request: u64,
    pub acknowledged: u64,
    pub fallback_pending: bool,
}
impl CloseState {
    pub fn set_dirty(&mut self, dirty: bool, sequence: u64) {
        if sequence > self.sequence {
            self.sequence = sequence;
            self.dirty = dirty;
        }
    }
    pub fn request_close(&mut self) -> Option<u64> {
        if self.allowed || !self.dirty {
            None
        } else {
            self.request += 1;
            Some(self.request)
        }
    }
    pub fn acknowledge(&mut self, request: u64) {
        if request == self.request {
            self.acknowledged = request;
        }
    }
    pub fn needs_fallback(&self, request: u64) -> bool {
        self.dirty
            && !self.allowed
            && !self.fallback_pending
            && self.request == request
            && self.acknowledged < request
    }
}
#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub loading: bool,
    pub error: String,
    pub login_error: String,
}
#[derive(Default)]
pub struct RegistrationState {
    pub status: Status,
    pub generation: u64,
    pub url: String,
    pub navigation: Option<u64>,
    pub creating: bool,
    pub private: bool,
    pub fatal_error: String,
    pub blocked_error: String,
    pub polling: bool,
    pub bounds_sequence: u64,
}
impl RegistrationState {
    pub fn navigate(&mut self, url: String) {
        self.generation += 1;
        self.url = url;
        self.status.loading = true;
        self.status.error.clear();
        self.blocked_error.clear();
        self.status.login_error.clear();
    }
    pub fn start_native(&mut self, id: u64) {
        self.generation += 1;
        self.navigation = Some(id);
        self.status.loading = true;
        self.status.error.clear();
        self.status.login_error.clear();
    }
    pub fn complete(&mut self, id: u64, success: bool, http: i32, error: i32) {
        if self.navigation.is_some_and(|current| current != id) {
            return;
        }
        self.navigation = Some(id);
        self.status.loading = false;
        if http >= 400 {
            self.status.error = format!("UTAR returned HTTP {http}. Choose Reload to try again.");
        } else if !success {
            self.status.error=format!("UTAR could not be loaded (WebView2 error {error}). Check your connection and choose Reload.");
        }
    }
    pub fn accepts_read(&self, generation: u64, url: &str) -> bool {
        self.generation == generation
            && self.url == url
            && !self.status.loading
            && self.status.error.is_empty()
            && self.blocked_error.is_empty()
            && self.fatal_error.is_empty()
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn close_ignores_stale_dirty_and_acknowledgements() {
        let mut s = CloseState::default();
        assert_eq!(s.request_close(), None);
        s.set_dirty(true, 2);
        s.set_dirty(false, 1);
        assert!(s.dirty);
        let first = s.request_close().unwrap();
        assert!(s.needs_fallback(first));
        s.acknowledge(first);
        assert!(!s.needs_fallback(first));
        let second = s.request_close().unwrap();
        s.acknowledge(first);
        assert!(s.needs_fallback(second));
        s.allowed = true;
        assert_eq!(s.request_close(), None);
    }
    #[test]
    fn native_navigation_completion_and_reads_reject_stale_generations() {
        let mut s = RegistrationState::default();
        s.navigate("https://unitreg.utar.edu.my/a".into());
        s.start_native(1);
        let generation = s.generation;
        s.navigate("https://unitreg.utar.edu.my/b".into());
        s.start_native(2);
        s.complete(1, false, 500, 7);
        assert!(s.status.loading);
        assert!(s.status.error.is_empty());
        s.complete(2, true, 200, 0);
        assert!(!s.accepts_read(generation, "https://unitreg.utar.edu.my/a"));
        assert!(s.accepts_read(s.generation, "https://unitreg.utar.edu.my/b"));
    }
    #[test]
    fn native_connection_and_http_errors_remain_visible() {
        let mut s = RegistrationState::default();
        s.start_native(1);
        s.complete(1, true, 503, 0);
        assert!(s.status.error.contains("503"));
        s.start_native(2);
        s.complete(2, false, 0, 7);
        assert!(s.status.error.contains('7'));
        assert!(!s.status.loading);
        s.start_native(3);
        s.complete(3, false, 503, 0);
        assert!(s.status.error.contains("503"));
    }
}
