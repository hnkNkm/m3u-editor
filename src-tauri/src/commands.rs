use crate::m3u::{self, Playlist};
use std::fs;

#[tauri::command]
pub fn open_playlist(path: String) -> Result<Playlist, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(m3u::parse(&content))
}

#[tauri::command]
pub fn save_playlist(path: String, playlist: Playlist) -> Result<(), String> {
    let content = m3u::serialize(&playlist);
    fs::write(&path, content).map_err(|e| e.to_string())
}
