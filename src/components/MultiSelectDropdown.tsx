import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronDown, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  allowCustom = true,
  badgeVariant = 'secondary',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll into view when dropdown opens
  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isOpen]);

  const filteredOptions = options.filter(
    (option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selected.includes(option)
  );

  const handleSelect = (option: string) => {
    if (!selected.includes(option)) {
      onChange([...selected, option]);
    }
    setSearchTerm('');
  };

  const handleRemove = (option: string) => {
    onChange(selected.filter((s) => s !== option));
  };

  const handleAddCustom = () => {
    const trimmed = searchTerm.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setSearchTerm('');
    }
  };

  const showAddCustom =
    allowCustom &&
    searchTerm.trim() &&
    !options.some((o) => o.toLowerCase() === searchTerm.toLowerCase()) &&
    !selected.includes(searchTerm.trim());

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label>{label}</Label>

      {/* Selected items */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((item) => (
            <Badge key={item} variant={badgeVariant} className="gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="ml-1 hover:bg-background/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown trigger and content */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 text-sm',
            'border rounded-md bg-background',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            isOpen && 'ring-2 ring-ring ring-offset-2'
          )}
        >
          <span className="text-muted-foreground">{placeholder}</span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
            <div className="p-2 border-b">
              <Input
                placeholder="Search or type to add..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (showAddCustom) {
                      handleAddCustom();
                    } else if (filteredOptions.length > 0) {
                      handleSelect(filteredOptions[0]);
                    }
                  }
                }}
                className="h-8"
                autoFocus
              />
            </div>

            <ScrollArea className="max-h-60">
              <div className="p-1">
                {showAddCustom && (
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-primary"
                  >
                    <Plus className="w-4 h-4" />
                    Add "{searchTerm.trim()}"
                  </button>
                )}

                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                    >
                      {option}
                      {selected.includes(option) && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))
                ) : (
                  !showAddCustom && (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      {searchTerm ? 'No matches found' : 'All options selected'}
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
