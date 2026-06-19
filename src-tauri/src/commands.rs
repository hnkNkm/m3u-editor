use crate::m3u::{self, Playlist, Track};
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::tag::Accessor;
use std::fs;
use std::path::{Path, PathBuf};

fn clean_canonicalize(path: &Path) -> Option<PathBuf> {
    let abs = fs::canonicalize(path).ok()?;
    let s = abs.to_string_lossy();
    if s.starts_with(r"\\?\") {
        Some(PathBuf::from(&s[4..]))
    } else {
        Some(abs)
    }
}

#[tauri::command]
pub fn open_playlist(path: String) -> Result<Playlist, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut playlist = m3u::parse(&content);
    let base_dir = Path::new(&path).parent();
    if let Some(base) = base_dir {
        for track in &mut playlist.tracks {
            let track_path = Path::new(&track.path);
            if track_path.is_relative() {
                if let Some(abs) = clean_canonicalize(&base.join(track_path)) {
                    track.path = abs.to_string_lossy().to_string();
                }
            }
        }
    }
    Ok(playlist)
}

#[tauri::command]
pub fn save_playlist(
    path: String,
    playlist: Playlist,
    use_relative: bool,
) -> Result<(), String> {
    let save_playlist = if use_relative {
        let base_dir = Path::new(&path)
            .parent()
            .ok_or("Cannot determine parent directory")?;
        let tracks = playlist
            .tracks
            .iter()
            .map(|t| {
                let track_path = Path::new(&t.path);
                let rel = pathdiff::diff_paths(track_path, base_dir)
                    .unwrap_or_else(|| track_path.to_path_buf());
                Track {
                    path: rel.to_string_lossy().to_string(),
                    ..t.clone()
                }
            })
            .collect();
        Playlist { tracks }
    } else {
        playlist
    };
    let content = m3u::serialize(&save_playlist);
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_paths(paths: Vec<String>) -> Vec<bool> {
    paths.iter().map(|p| Path::new(p).exists()).collect()
}

const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "wav", "m4a", "aac", "ogg", "opus", "wma",
];

fn is_audio_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| AUDIO_EXTENSIONS.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn read_track(path: &Path) -> Option<Track> {
    let abs = clean_canonicalize(path)?;
    let abs_str = abs.to_string_lossy().to_string();

    let tagged = lofty::read_from_path(&abs).ok();
    let tag = tagged.as_ref().and_then(|f| f.primary_tag().or_else(|| f.first_tag()));

    let title = tag
        .and_then(|t| t.title().map(|s| s.to_string()))
        .or_else(|| {
            abs.file_stem()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
        });

    let artist = tag.and_then(|t| t.artist().map(|s| s.to_string()));

    let duration = tagged.as_ref().map(|f| {
        f.properties().duration().as_secs() as i64
    });

    Some(Track {
        path: abs_str,
        title,
        artist,
        duration,
    })
}

#[tauri::command]
pub fn scan_audio_files(paths: Vec<String>) -> Vec<Track> {
    let mut results = Vec::new();
    for p in &paths {
        let path = Path::new(p);
        if path.is_dir() {
            collect_audio_recursive(path, &mut results);
        } else if path.is_file() && is_audio_file(path) {
            if let Some(track) = read_track(path) {
                results.push(track);
            }
        }
    }
    results.sort_by(|a, b| a.path.cmp(&b.path));
    results
}

fn collect_audio_recursive(dir: &Path, results: &mut Vec<Track>) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_audio_recursive(&path, results);
        } else if is_audio_file(&path) {
            if let Some(track) = read_track(&path) {
                results.push(track);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    fn assert_track(ext: &str, expected_title: &str, expected_artist: &str) {
        let path = Path::new("tests/fixtures").join(format!("test.{ext}"));
        let track = read_track(&path).unwrap_or_else(|| panic!("should read {ext}"));
        assert_eq!(track.title.as_deref(), Some(expected_title), "{ext} title");
        assert_eq!(track.artist.as_deref(), Some(expected_artist), "{ext} artist");
        assert!(track.duration.unwrap_or(0) > 0, "{ext} duration should be > 0");
    }

    #[test]
    fn read_flac_tags() {
        assert_track("flac", "Test Track", "Test Artist");
    }

    #[test]
    fn read_mp3_tags() {
        assert_track("mp3", "Test Track MP3", "Test Artist MP3");
    }

    #[test]
    fn read_wav_tags() {
        assert_track("wav", "Test WAV", "Test Artist WAV");
    }

    #[test]
    fn read_m4a_tags() {
        assert_track("m4a", "Test M4A", "Test Artist M4A");
    }

    #[test]
    fn read_ogg_tags() {
        assert_track("ogg", "Test OGG", "Test Artist OGG");
    }

    #[test]
    fn read_opus_tags() {
        assert_track("opus", "Test OPUS", "Test Artist OPUS");
    }

    #[test]
    fn read_aac_no_tags() {
        // Raw ADTS AAC has no tag container — title falls back to filename
        let path = Path::new("tests/fixtures/test.aac");
        let track = read_track(&path).expect("should read AAC");
        assert_eq!(track.title.as_deref(), Some("test"));
        assert_eq!(track.artist, None);
    }

    #[test]
    fn read_wma_no_tags() {
        // lofty doesn't support ASF/WMA tags — title falls back to filename
        let path = Path::new("tests/fixtures/test.wma");
        let track = read_track(&path).expect("should read WMA");
        assert_eq!(track.title.as_deref(), Some("test"));
        assert_eq!(track.artist, None);
    }
}
