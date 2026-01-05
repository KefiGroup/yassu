import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronDown, ChevronRight, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryOptions {
  [category: string]: string[];
}

interface GroupedMultiSelectProps {
  label: string;
  categories: CategoryOptions;
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export function GroupedMultiSelect({
  label,
  categories,
  selected,
  onChange,
  placeholder = 'Select options...',
  allowCustom = true,
  badgeVariant = 'secondary',
}: GroupedMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Dropdown opens in place without auto-scrolling

  const allOptions = Object.values(categories).flat();

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSelect = (option: string) => {
    if (!selected.includes(option)) {
      onChange([...selected, option]);
    }
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

  // Filter categories and options based on search
  const getFilteredCategories = () => {
    if (!searchTerm.trim()) return categories;

    const filtered: CategoryOptions = {};
    const search = searchTerm.toLowerCase();

    Object.entries(categories).forEach(([category, options]) => {
      const matchingOptions = options.filter(
        (opt) => opt.toLowerCase().includes(search) && !selected.includes(opt)
      );
      if (matchingOptions.length > 0 || category.toLowerCase().includes(search)) {
        filtered[category] = matchingOptions.length > 0 ? matchingOptions : options.filter(opt => !selected.includes(opt));
      }
    });

    return filtered;
  };

  const filteredCategories = getFilteredCategories();
  const hasResults = Object.keys(filteredCategories).length > 0;

  const showAddCustom =
    allowCustom &&
    searchTerm.trim() &&
    !allOptions.some((o) => o.toLowerCase() === searchTerm.toLowerCase()) &&
    !selected.includes(searchTerm.trim());

  // Get category counts
  const getCategorySelectedCount = (category: string) => {
    return categories[category].filter((opt) => selected.includes(opt)).length;
  };

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

      {/* Dropdown trigger */}
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
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden max-h-[400px] flex flex-col">
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
                    }
                  }
                }}
                className="h-8"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-1">
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

                {hasResults ? (
                  Object.entries(filteredCategories).map(([category, options]) => {
                    const isExpanded = expandedCategories.has(category) || searchTerm.trim().length > 0;
                    const selectedCount = getCategorySelectedCount(category);
                    const availableOptions = options.filter((opt) => !selected.includes(opt));

                    if (availableOptions.length === 0) return null;

                    return (
                      <div key={category} className="mb-1">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium rounded hover:bg-accent"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span>{category}</span>
                          </div>
                          {selectedCount > 0 && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                              {selectedCount}
                            </Badge>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="ml-6 border-l pl-2">
                            {availableOptions.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleSelect(option)}
                                className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                              >
                                {option}
                                {selected.includes(option) && (
                                  <Check className="w-4 h-4 text-primary" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  !showAddCustom && (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      {searchTerm ? 'No matches found' : 'All options selected'}
                    </div>
                  )
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
