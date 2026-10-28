use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
pub const MAX_BYTES: usize = 10 * 1024 * 1024;
#[derive(Debug, Serialize)]
pub struct HtmlSource {
    pub name: String,
    pub text: String,
}
fn read_bounded(path: &Path, limit: usize) -> Result<(String, usize), String> {
    let file = std::fs::File::open(path).map_err(|_| "The selected file could not be opened.")?;
    let stat = file
        .metadata()
        .map_err(|_| "The selected file could not be inspected.")?;
    if !stat.is_file() {
        return Err("Choose a regular file.".into());
    }
    if stat.len() > limit as u64 {
        return Err("Files must total no more than 10 MiB.".into());
    }
    let mut data = Vec::new();
    file.take((limit + 1) as u64)
        .read_to_end(&mut data)
        .map_err(|_| "The selected file could not be read.")?;
    let bytes = data.len();
    if bytes > limit {
        return Err("Files must total no more than 10 MiB.".into());
    }
    String::from_utf8(data)
        .map(|text| (text, bytes))
        .map_err(|_| "Choose UTF-8 text files.".into())
}
pub fn read_html_paths(paths: &[PathBuf]) -> Result<Vec<HtmlSource>, String> {
    let mut remaining = MAX_BYTES;
    let mut sources = Vec::new();
    for path in paths {
        let extension = path.extension().and_then(|v| v.to_str()).unwrap_or("");
        if !["html", "htm"]
            .iter()
            .any(|v| extension.eq_ignore_ascii_case(v))
        {
            return Err("Choose HTML or HTM files.".into());
        }
        let (text, bytes) = read_bounded(path, remaining)?;
        remaining -= bytes;
        sources.push(HtmlSource {
            name: path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned(),
            text,
        });
    }
    Ok(sources)
}
pub fn read_text(path: &Path) -> Result<String, String> {
    read_bounded(path, MAX_BYTES).map(|(text, _)| text)
}
pub fn decode_png(data: &str) -> Result<Vec<u8>, String> {
    if data.len() > 14_000_000 {
        return Err("PNG is too large.".into());
    }
    let encoded = data
        .strip_prefix("data:image/png;base64,")
        .ok_or("Choose a PNG image.")?;
    let bytes = STANDARD
        .decode(encoded)
        .map_err(|_| "Invalid PNG encoding.")?;
    let signature = b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR";
    if bytes.len() < 45 || bytes.len() > MAX_BYTES || !bytes.starts_with(signature) {
        return Err("Invalid PNG image or size.".into());
    }
    let width = u32::from_be_bytes(bytes[16..20].try_into().unwrap());
    let height = u32::from_be_bytes(bytes[20..24].try_into().unwrap());
    if width == 0
        || height == 0
        || width > 16384
        || height > 16384
        || u64::from(width) * u64::from(height) > 24_000_000
    {
        return Err("PNG dimensions are too large.".into());
    }
    Ok(bytes)
}
pub fn write_atomically(path: &Path, data: &[u8]) -> Result<(), String> {
    if data.len() > MAX_BYTES {
        return Err("The output exceeds 10 MiB.".into());
    }
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let mut temporary = tempfile::Builder::new()
        .prefix(".ttap-")
        .suffix(".tmp")
        .tempfile_in(parent)
        .map_err(|_| "The destination folder could not be opened.")?;
    temporary
        .write_all(data)
        .map_err(|_| "The output could not be written.")?;
    temporary
        .as_file()
        .sync_all()
        .map_err(|_| "The output could not be synchronized.")?;
    temporary
        .persist(path)
        .map_err(|_| "The destination could not be replaced; the original was kept.")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    const PNG:&str="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
    #[test]
    fn html_reads_are_regular_utf8_and_combined_bounded() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("a.html");
        let b = dir.path().join("b.htm");
        std::fs::write(&a, "<p>合成</p>").unwrap();
        let sources = read_html_paths(std::slice::from_ref(&a)).unwrap();
        assert_eq!(sources[0].name, "a.html");
        assert_eq!(sources[0].text, "<p>合成</p>");
        std::fs::write(&a, vec![b' '; MAX_BYTES]).unwrap();
        std::fs::write(&b, "x").unwrap();
        assert!(read_html_paths(std::slice::from_ref(&a)).is_ok());
        assert!(read_html_paths(&[a.clone(), b.clone()]).is_err());
        std::fs::write(&a, [255]).unwrap();
        assert!(read_html_paths(&[a]).is_err());
        assert!(read_html_paths(&[dir.path().to_path_buf()]).is_err());
        let exe = dir.path().join("wrong.exe");
        std::fs::write(&exe, "text").unwrap();
        assert!(read_html_paths(&[exe]).is_err());
    }
    #[test]
    fn png_rejects_invalid_encoding_size_and_dimensions() {
        use base64::{engine::general_purpose::STANDARD, Engine};
        let mut bytes = decode_png(PNG).unwrap();
        assert_eq!(&bytes[..8], b"\x89PNG\r\n\x1a\n");
        for value in [
            "broken",
            "data:text/plain;base64,AAAA",
            "data:image/png;base64,%%%",
        ] {
            assert!(decode_png(value).is_err());
        }
        bytes[16..20].copy_from_slice(&16385u32.to_be_bytes());
        assert!(decode_png(&format!(
            "data:image/png;base64,{}",
            STANDARD.encode(&bytes)
        ))
        .is_err());
        bytes[16..20].copy_from_slice(&6000u32.to_be_bytes());
        bytes[20..24].copy_from_slice(&6000u32.to_be_bytes());
        assert!(decode_png(&format!(
            "data:image/png;base64,{}",
            STANDARD.encode(&bytes)
        ))
        .is_err());
        assert!(decode_png(&format!("data:image/png;base64,{}", "A".repeat(14_000_001))).is_err());
    }
    #[test]
    fn atomic_write_replaces_file_and_failure_preserves_destination() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("plan.png");
        std::fs::write(&file, "original").unwrap();
        write_atomically(&file, b"replacement").unwrap();
        assert_eq!(std::fs::read(&file).unwrap(), b"replacement");
        let destination = dir.path().join("directory.png");
        std::fs::create_dir(&destination).unwrap();
        let marker = destination.join("keep.txt");
        std::fs::write(&marker, "keep").unwrap();
        assert!(write_atomically(&destination, b"bad").is_err());
        assert_eq!(std::fs::read(marker).unwrap(), b"keep");
        assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 2);
    }
}
