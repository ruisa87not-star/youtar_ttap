use serde::{Deserialize, Serialize};
use url::Url;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
pub struct Bounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}
pub fn is_trusted_caller(label: &str, url: &Url) -> bool {
    if label != "planner"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || !["/", "/index.html"].contains(&url.path())
    {
        return false;
    }
    (url.scheme() == "http"
        && url.host_str() == Some("tauri.localhost")
        && url.port_or_known_default() == Some(80))
        || (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        || (cfg!(debug_assertions)
            && url.scheme() == "http"
            && url.host_str() == Some("127.0.0.1")
            && url.port() == Some(1420))
}
pub fn is_registration_url(url: &Url) -> bool {
    url.scheme() == "https"
        && url.host_str() == Some("unitreg.utar.edu.my")
        && url.port_or_known_default() == Some(443)
        && url.username().is_empty()
        && url.password().is_none()
}
pub fn is_schedule_url(url: &Url) -> bool {
    is_registration_url(url)
        && [
            "/portal/courseRegStu/schedule/masterSchedule.jsp",
            "/portal/courseRegStu/schedule/masterScheduleSurvey.jsp",
        ]
        .contains(&url.path())
}
pub fn upgrade_registration_url(url: &Url) -> Option<Url> {
    if url.scheme() != "http"
        || url.host_str() != Some("unitreg.utar.edu.my")
        || url.port_or_known_default() != Some(80)
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return None;
    }
    let mut secure = url.clone();
    secure.set_scheme("https").ok()?;
    secure.set_port(None).ok()?;
    Some(secure)
}
pub fn validate_bounds(b: Bounds, width: f64, height: f64) -> Option<Bounds> {
    if ![b.x, b.y, b.width, b.height, width, height]
        .iter()
        .all(|v| v.is_finite())
        || b.x < 0.
        || b.y < 48.
        || b.width < 1.
        || b.height < 1.
        || b.x + b.width > width + 1.
        || b.y + b.height > height + 1.
    {
        return None;
    }
    let x = b.x.ceil();
    let y = b.y.ceil();
    if x >= width || y >= height {
        return None;
    }
    Some(Bounds {
        x,
        y,
        width: b.width.min(width - x).floor().max(1.),
        height: b.height.min(height - y).floor().max(1.),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn upgrades_only_the_exact_legacy_http_origin_without_losing_the_destination() {
        let url=Url::parse("http://unitreg.utar.edu.my:80/portal/courseRegStu/indexSurvey.jsp?passid=synthetic%2Fonly&next=a%2Bb#section").unwrap();
        assert_eq!(upgrade_registration_url(&url).unwrap().as_str(), "https://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic%2Fonly&next=a%2Bb#section");
        for value in [
            "https://unitreg.utar.edu.my/",
            "http://unitreg.utar.edu.my:81/",
            "http://user:pass@unitreg.utar.edu.my/",
            "http://unitreg.utar.edu.my.attacker.test/",
            "file:///private.html",
        ] {
            assert!(upgrade_registration_url(&Url::parse(value).unwrap()).is_none());
        }
    }
    #[test]
    fn only_the_local_planner_can_call_native_commands() {
        assert!(is_trusted_caller(
            "planner",
            &Url::parse("http://tauri.localhost/index.html").unwrap()
        ));
        for (label, url) in [
            ("registration", "http://tauri.localhost/index.html"),
            ("planner", "https://unitreg.utar.edu.my/"),
            ("planner", "http://tauri.localhost.evil.example/index.html"),
            ("planner", "http://tauri.localhost/assets/private.js"),
            ("planner", "http://user:password@tauri.localhost/index.html"),
        ] {
            assert!(!is_trusted_caller(label, &Url::parse(url).unwrap()));
        }
    }
    #[test]
    fn registration_origin_is_exact_https_without_credentials() {
        assert!(is_registration_url(
            &Url::parse("https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp").unwrap()
        ));
        for value in [
            "http://unitreg.utar.edu.my/",
            "https://unitreg.utar.edu.my.evil.example/",
            "https://user:pass@unitreg.utar.edu.my/",
            "https://unitreg.utar.edu.my:444/",
            "file:///private.html",
        ] {
            assert!(!is_registration_url(&Url::parse(value).unwrap()), "{value}");
        }
    }
    #[test]
    fn schedule_requires_the_official_preview_path() {
        assert!(is_schedule_url(
            &Url::parse(
                "https://unitreg.utar.edu.my/portal/courseRegStu/schedule/masterScheduleSurvey.jsp"
            )
            .unwrap()
        ));
        assert!(!is_schedule_url(&Url::parse("https://unitreg.utar.edu.my/portal/courseRegStu/schedule/masterScheduleSurvey.jsp/other").unwrap()));
        assert!(is_schedule_url(
            &Url::parse(
                "https://unitreg.utar.edu.my/portal/courseRegStu/schedule/masterSchedule.jsp"
            )
            .unwrap()
        ));
        assert!(!is_schedule_url(
            &Url::parse("https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp").unwrap()
        ));
    }
    #[test]
    fn child_bounds_reject_invalid_and_outside_main_window_values() {
        let b = Bounds {
            x: 12.2,
            y: 100.1,
            width: 500.5,
            height: 300.9,
        };
        let actual = validate_bounds(b, 1024., 720.).unwrap();
        assert!(
            actual.x >= b.x
                && actual.y >= b.y
                && actual.x + actual.width <= 1024.
                && actual.y + actual.height <= 720.
        );
        for bad in [
            Bounds { x: -1., ..b },
            Bounds { y: 47., ..b },
            Bounds { width: 0., ..b },
            Bounds { x: f64::NAN, ..b },
            Bounds {
                height: f64::INFINITY,
                ..b
            },
            Bounds { x: 900., ..b },
        ] {
            assert!(validate_bounds(bad, 1024., 720.).is_none());
        }
    }
}
