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
}

export const usePlaylistStore = create<PlaylistState>((set) => ({
  tracks: [],
  filePath: null,
  isDirty: false,
  setPlaylist: (filePath, playlist) =>
    set({ tracks: playlist.tracks, filePath, isDirty: false }),
  clear: () => set({ tracks: [], filePath: null, isDirty: false }),
}));
