fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "ttap_pick_html",
            "ttap_open_project",
            "ttap_export_project",
            "ttap_export_image",
            "ttap_open_registration",
            "ttap_registration_bounds",
            "ttap_registration_status",
            "ttap_reload_registration",
            "ttap_read_registration",
            "ttap_set_dirty",
            "ttap_acknowledge_close",
            "ttap_confirm_close",
        ]),
    ))
    .expect("Tauri build configuration is invalid");
}
