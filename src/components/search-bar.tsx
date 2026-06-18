import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex items-center px-3 py-2 border-b">
      <Search className="absolute left-5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search tracks..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 h-8"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-5"
          onClick={() => onChange("")}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
