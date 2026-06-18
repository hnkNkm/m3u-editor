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

const MAX_HISTORY = 100;

interface PlaylistState {
  tracks: Track[];
  filePath: string | null;
  isDirty: boolean;

  _past: Track[][];
  _future: Track[][];

  setPlaylist: (filePath: string, playlist: Playlist) => void;
  clear: () => void;
  updateTrack: (index: number, track: Track) => void;
  addTrack: (track: Track) => void;
  addTracks: (tracks: Track[]) => void;
  removeTrack: (index: number) => void;
  removeTracks: (indices: number[]) => void;
  moveTrack: (from: number, to: number) => void;
  markClean: () => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function pushHistory(past: Track[][], current: Track[]): Track[][] {
  const next = [...past, current];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  tracks: [],
  filePath: null,
  isDirty: false,
  _past: [],
  _future: [],

  setPlaylist: (filePath, playlist) =>
    set({
      tracks: playlist.tracks,
      filePath,
      isDirty: false,
      _past: [],
      _future: [],
    }),

  clear: () =>
    set({
      tracks: [],
      filePath: null,
      isDirty: false,
      _past: [],
      _future: [],
    }),

  updateTrack: (index, track) =>
    set((s) => {
      const tracks = [...s.tracks];
      tracks[index] = track;
      return {
        tracks,
        isDirty: true,
        _past: pushHistory(s._past, s.tracks),
        _future: [],
      };
    }),

  addTrack: (track) =>
    set((s) => ({
      tracks: [...s.tracks, track],
      isDirty: true,
      _past: pushHistory(s._past, s.tracks),
      _future: [],
    })),

  addTracks: (newTracks) =>
    set((s) => ({
      tracks: [...s.tracks, ...newTracks],
      isDirty: true,
      _past: pushHistory(s._past, s.tracks),
      _future: [],
    })),

  removeTrack: (index) =>
    set((s) => ({
      tracks: s.tracks.filter((_, i) => i !== index),
      isDirty: true,
      _past: pushHistory(s._past, s.tracks),
      _future: [],
    })),

  removeTracks: (indices) =>
    set((s) => {
      const toRemove = new Set(indices);
      return {
        tracks: s.tracks.filter((_, i) => !toRemove.has(i)),
        isDirty: true,
        _past: pushHistory(s._past, s.tracks),
        _future: [],
      };
    }),

  moveTrack: (from, to) =>
    set((s) => {
      const tracks = [...s.tracks];
      const [moved] = tracks.splice(from, 1);
      tracks.splice(to, 0, moved);
      return {
        tracks,
        isDirty: true,
        _past: pushHistory(s._past, s.tracks),
        _future: [],
      };
    }),

  markClean: () => set({ isDirty: false }),

  undo: () =>
    set((s) => {
      if (s._past.length === 0) return s;
      const past = [...s._past];
      const previous = past.pop()!;
      return {
        tracks: previous,
        isDirty: true,
        _past: past,
        _future: [s.tracks, ...s._future],
      };
    }),

  redo: () =>
    set((s) => {
      if (s._future.length === 0) return s;
      const future = [...s._future];
      const next = future.shift()!;
      return {
        tracks: next,
        isDirty: true,
        _past: [...s._past, s.tracks],
        _future: future,
      };
    }),

  canUndo: () => get()._past.length > 0,
  canRedo: () => get()._future.length > 0,
}));
