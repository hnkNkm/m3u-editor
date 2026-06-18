import { FolderOpen, Save, SaveAll, Plus, FilePlus, Undo2, Redo2, Music, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
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

function TipButton({
  tip,
  shortcut,
  children,
  ...props
}: {
  tip: string;
  shortcut?: string;
} & React.ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {tip}
        {shortcut && (
          <kbd data-slot="kbd" className="ml-1.5 inline-flex h-[18px] items-center rounded bg-background/20 px-1 font-mono text-[10px]">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

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
    <TooltipProvider delay={400}>
      <header className="flex h-12 items-center gap-1 border-b px-3">
        <TipButton tip="New" shortcut="Ctrl+N" variant="ghost" size="sm" onClick={handleNew}>
          <FilePlus className="mr-1.5 h-4 w-4" />
          New
        </TipButton>
        <TipButton tip="Open" shortcut="Ctrl+O" variant="ghost" size="sm" onClick={handleOpen}>
          <FolderOpen className="mr-1.5 h-4 w-4" />
          Open
        </TipButton>
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
        <TipButton
          tip="Save"
          shortcut="Ctrl+S"
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={tracks.length === 0}
        >
          <Save className="mr-1.5 h-4 w-4" />
          Save
        </TipButton>
        <TipButton tip="Save As" variant="ghost" size="sm" onClick={handleSaveAs} disabled={tracks.length === 0}>
          <SaveAll className="mr-1.5 h-4 w-4" />
          Save As
        </TipButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <TipButton tip="Undo" shortcut="Ctrl+Z" variant="ghost" size="icon-sm" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </TipButton>
        <TipButton tip="Redo" shortcut="Ctrl+Y" variant="ghost" size="icon-sm" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </TipButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <TipButton tip="Add audio files" variant="ghost" size="sm" onClick={handleAddFiles}>
          <Music className="mr-1.5 h-4 w-4" />
          Add Files
        </TipButton>
        <TipButton tip="Add empty track" variant="ghost" size="sm" onClick={handleAddEmptyTrack}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Track
        </TipButton>
        <div className="flex-1" />
        {filePath && (
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {isDirty ? "● " : ""}
            {filePath}
          </span>
        )}
        <ThemeToggle />
      </header>
    </TooltipProvider>
  );
}
