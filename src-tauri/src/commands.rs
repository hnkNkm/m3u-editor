use crate::m3u::{self, Playlist, Track};
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

#[tauri::command]
pub fn scan_audio_files(paths: Vec<String>) -> Vec<String> {
    let mut results = Vec::new();
    for p in &paths {
        let path = Path::new(p);
        if path.is_dir() {
            collect_audio_recursive(path, &mut results);
        } else if path.is_file() && is_audio_file(path) {
            if let Some(abs) = clean_canonicalize(path) {
                results.push(abs.to_string_lossy().to_string());
            }
        }
    }
    results.sort();
    results
}

fn collect_audio_recursive(dir: &Path, results: &mut Vec<String>) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_audio_recursive(&path, results);
        } else if is_audio_file(&path) {
            if let Some(abs) = clean_canonicalize(&path) {
                results.push(abs.to_string_lossy().to_string());
            }
        }
    }
}
