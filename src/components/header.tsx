import { FolderOpen, Save, SaveAll, Plus, FilePlus, Undo2, Redo2, Music, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePlaylistStore } from "@/stores/playlist";
import { useActions } from "@/hooks/use-actions";
import { useRecentFiles } from "@/hooks/use-recent-files";

export function Header() {
  const { filePath, tracks, isDirty } = usePlaylistStore();
  const canUndo = usePlaylistStore((s) => s.canUndo());
  const canRedo = usePlaylistStore((s) => s.canRedo());
  const { recentFiles, addRecentFile, clearRecentFiles } = useRecentFiles();
  const {
    handleOpen,
    handleOpenRecent,
    handleSave,
    handleSaveAs,
    handleAddEmptyTrack,
    handleAddFiles,
    handleNew,
    undo,
    redo,
  } = useActions({ onFileOpened: addRecentFile });

  return (
    <header className="flex h-12 items-center gap-1 border-b px-3">
      <Button variant="ghost" size="sm" onClick={handleNew}>
        <FilePlus className="mr-1.5 h-4 w-4" />
        New
      </Button>
      <Button variant="ghost" size="sm" onClick={handleOpen}>
        <FolderOpen className="mr-1.5 h-4 w-4" />
        Open
      </Button>
      {recentFiles.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <Clock className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {recentFiles.map((file) => (
              <DropdownMenuItem
                key={file}
                onClick={() => handleOpenRecent(file)}
              >
                <span className="truncate max-w-[300px] text-xs">{file}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clearRecentFiles}>
              <Trash2 className="mr-1.5 h-3 w-3" />
              Clear Recent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={tracks.length === 0}
      >
        <Save className="mr-1.5 h-4 w-4" />
        Save
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSaveAs}
        disabled={tracks.length === 0}
      >
        <SaveAll className="mr-1.5 h-4 w-4" />
        Save As
      </Button>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button variant="ghost" size="icon-sm" onClick={undo} disabled={!canUndo}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={redo} disabled={!canRedo}>
        <Redo2 className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button variant="ghost" size="sm" onClick={handleAddFiles}>
        <Music className="mr-1.5 h-4 w-4" />
        Add Files
      </Button>
      <Button variant="ghost" size="sm" onClick={handleAddEmptyTrack}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add Track
      </Button>
      <div className="flex-1" />
      {filePath && (
        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
          {isDirty ? "● " : ""}
          {filePath}
        </span>
      )}
      <ThemeToggle />
    </header>
  );
}
