import { create } from "zustand";

export interface Track {
  path: string;
  title: string | null;
  artist: string | null;
  duration: number | null;
}

export interface Playlist {
  tracks: Track[];
}

interface PlaylistState {
  tracks: Track[];
  filePath: string | null;
  isDirty: boolean;
  setPlaylist: (filePath: string, playlist: Playlist) => void;
  clear: () => void;
  updateTrack: (index: number, track: Track) => void;
  addTrack: (track: Track) => void;
  removeTrack: (index: number) => void;
  moveTrack: (from: number, to: number) => void;
  markClean: () => void;
}

export const usePlaylistStore = create<PlaylistState>((set) => ({
  tracks: [],
  filePath: null,
  isDirty: false,
  setPlaylist: (filePath, playlist) =>
    set({ tracks: playlist.tracks, filePath, isDirty: false }),
  clear: () => set({ tracks: [], filePath: null, isDirty: false }),
  updateTrack: (index, track) =>
    set((s) => {
      const tracks = [...s.tracks];
      tracks[index] = track;
      return { tracks, isDirty: true };
    }),
  addTrack: (track) =>
    set((s) => ({ tracks: [...s.tracks, track], isDirty: true })),
  removeTrack: (index) =>
    set((s) => ({
      tracks: s.tracks.filter((_, i) => i !== index),
      isDirty: true,
    })),
  moveTrack: (from, to) =>
    set((s) => {
      const tracks = [...s.tracks];
      const [moved] = tracks.splice(from, 1);
      tracks.splice(to, 0, moved);
      return { tracks, isDirty: true };
    }),
  markClean: () => set({ isDirty: false }),
}));
