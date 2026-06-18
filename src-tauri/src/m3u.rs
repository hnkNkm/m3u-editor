use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub path: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub duration: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub tracks: Vec<Track>,
}

pub fn parse(content: &str) -> Playlist {
    let mut tracks = Vec::new();
    let mut current_duration: Option<i64> = None;
    let mut current_title: Option<String> = None;
    let mut current_artist: Option<String> = None;

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line == "#EXTM3U" {
            continue;
        }
        if let Some(extinf) = line.strip_prefix("#EXTINF:") {
            let (dur_str, display) = match extinf.split_once(',') {
                Some((d, t)) => (d.trim(), Some(t.trim())),
                None => (extinf.trim(), None),
            };
            current_duration = dur_str.parse::<i64>().ok();
            if let Some(display) = display {
                if let Some((a, t)) = display.split_once(" - ") {
                    current_artist = Some(a.to_string());
                    current_title = Some(t.to_string());
                } else {
                    current_title = Some(display.to_string());
                    current_artist = None;
                }
            }
            continue;
        }
        if line.starts_with('#') {
            continue;
        }
        tracks.push(Track {
            path: line.to_string(),
            title: current_title.take(),
            artist: current_artist.take(),
            duration: current_duration.take(),
        });
    }

    Playlist { tracks }
}

pub fn serialize(playlist: &Playlist) -> String {
    let mut out = String::from("#EXTM3U\n");
    for track in &playlist.tracks {
        let dur = track.duration.unwrap_or(-1);
        let display = match (&track.artist, &track.title) {
            (Some(artist), Some(title)) => format!("{} - {}", artist, title),
            (None, Some(title)) => title.clone(),
            (Some(artist), None) => artist.clone(),
            (None, None) => String::new(),
        };
        out.push_str(&format!("#EXTINF:{},{}\n", dur, display));
        out.push_str(&track.path);
        out.push('\n');
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_extended_m3u() {
        let input = "\
#EXTM3U
#EXTINF:200,Artist One - Song Title
/music/song1.mp3
#EXTINF:180,Song Only
/music/song2.mp3
";
        let playlist = parse(input);
        assert_eq!(playlist.tracks.len(), 2);

        assert_eq!(playlist.tracks[0].artist.as_deref(), Some("Artist One"));
        assert_eq!(playlist.tracks[0].title.as_deref(), Some("Song Title"));
        assert_eq!(playlist.tracks[0].duration, Some(200));
        assert_eq!(playlist.tracks[0].path, "/music/song1.mp3");

        assert_eq!(playlist.tracks[1].artist, None);
        assert_eq!(playlist.tracks[1].title.as_deref(), Some("Song Only"));
        assert_eq!(playlist.tracks[1].duration, Some(180));
    }

    #[test]
    fn parse_simple_m3u() {
        let input = "\
/music/a.mp3
/music/b.mp3
";
        let playlist = parse(input);
        assert_eq!(playlist.tracks.len(), 2);
        assert_eq!(playlist.tracks[0].path, "/music/a.mp3");
        assert!(playlist.tracks[0].title.is_none());
    }

    #[test]
    fn roundtrip() {
        let playlist = Playlist {
            tracks: vec![
                Track {
                    path: "/music/song.mp3".into(),
                    title: Some("Song".into()),
                    artist: Some("Artist".into()),
                    duration: Some(200),
                },
            ],
        };
        let serialized = serialize(&playlist);
        let parsed = parse(&serialized);
        assert_eq!(parsed.tracks.len(), 1);
        assert_eq!(parsed.tracks[0].artist.as_deref(), Some("Artist"));
        assert_eq!(parsed.tracks[0].title.as_deref(), Some("Song"));
    }
}
