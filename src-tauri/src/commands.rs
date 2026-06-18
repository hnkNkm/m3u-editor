use crate::m3u::{self, Playlist, Track};
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn open_playlist(path: String) -> Result<Playlist, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut playlist = m3u::parse(&content);
    let base_dir = Path::new(&path).parent();
    if let Some(base) = base_dir {
        for track in &mut playlist.tracks {
            let track_path = Path::new(&track.path);
            if track_path.is_relative() {
                if let Ok(abs) = fs::canonicalize(base.join(track_path)) {
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
