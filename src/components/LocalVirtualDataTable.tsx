import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type Key, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";

const DEFAULT_VISIBLE_ROW_COUNT = 10;
const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_MIN_SEARCH_LENGTH = 2;
const DEFAULT_OVERSCAN = 4;

export interface LocalVirtualColumnDef<T> {
  key: Extract<keyof T, string>;
  header: string;
  sortable?: boolean;
  searchable?: boolean;
  clickable?: boolean;
  render?: (value: T[keyof T], row: T, isFocused?: boolean) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface LocalVirtualTableSearchInputProps {
  placeholder: string;
  value: string;
  onBlur?: () => void;
  onEnter?: () => void;
  onFocus?: () => void;
  onArrowDown?: () => void;
  onArrowUp?: () => void;
  onTabToResults?: () => void;
  onValueChange: (value: string) => void;
  autoFocus?: boolean;
  containerClassName?: string;
  inputClassName?: string;
}

const LocalVirtualTableSearchInput = memo(function LocalVirtualTableSearchInput({
  placeholder,
  value,
  onBlur,
  onEnter,
  onFocus,
  onArrowDown,
  onArrowUp,
  onTabToResults,
  onValueChange,
  autoFocus = false,
  containerClassName = "w-full sm:w-96",
  inputClassName,
}: LocalVirtualTableSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frameId);
  }, [autoFocus]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && onArrowDown) {
      event.preventDefault();
      onArrowDown();
      return;
    }

    if (event.key === "ArrowUp" && onArrowUp) {
      event.preventDefault();
      onArrowUp();
      return;
    }

    if (event.key === "Tab" && !event.shiftKey && onTabToResults) {
      event.preventDefault();
      onTabToResults();
      return;
    }

    if (event.key === "Enter" && onEnter) {
      event.preventDefault();
      onEnter();
    }
  }, [onArrowDown, onArrowUp, onEnter, onTabToResults]);

  return (
    <div className={containerClassName}>
      <Input
        ref={inputRef}
        autoFocus={autoFocus}
        type="search"
        placeholder={placeholder}
        value={value}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn("w-full", inputClassName)}
      />
    </div>
  );
});

interface LocalVirtualTableHeaderSearchProps {
  placeholder: string;
  searchValue: string;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  onArrowDown: () => void;
  onArrowUp: () => void;
  onEnter: () => void;
  onSearchFocus: () => void;
  onSearchValueChange: (value: string) => void;
  onTabToResults: () => void;
}

const LocalVirtualTableHeaderSearch = memo(function LocalVirtualTableHeaderSearch({
  placeholder,
  searchValue,
  tableContainerRef,
  onArrowDown,
  onArrowUp,
  onEnter,
  onSearchFocus,
  onSearchValueChange,
  onTabToResults,
}: LocalVirtualTableHeaderSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (searchValue) {
      setIsExpanded(true);
    }
  }, [searchValue]);

  useEffect(() => {
    if (!isExpanded || searchValue.trim()) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (tableContainerRef.current?.contains(target)) {
        return;
      }

      setIsExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isExpanded, searchValue, tableContainerRef]);

  const handleToggle = useCallback(() => {
    if (isExpanded && searchValue.trim()) {
      onSearchValueChange("");
      return;
    }

    setIsExpanded((current) => !current);
  }, [isExpanded, onSearchValueChange, searchValue]);

  return (
    <div className="flex items-center justify-end border-b border-border bg-background px-4 py-2">
      <div className="flex items-center gap-2">
        {isExpanded ? (
          <LocalVirtualTableSearchInput
            autoFocus
            placeholder={placeholder}
            value={searchValue}
            onEnter={onEnter}
            onFocus={onSearchFocus}
            onArrowDown={onArrowDown}
            onArrowUp={onArrowUp}
            onTabToResults={onTabToResults}
            onValueChange={onSearchValueChange}
            containerClassName="w-52 sm:w-64"
            inputClassName="h-8"
          />
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={isExpanded ? "Collapse search" : "Expand search"}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

interface LocalVirtualTableHeaderProps<
  TRow extends { id: number | string },
  TSortColumn extends Extract<keyof TRow, string>,
> {
  columns: LocalVirtualColumnDef<TRow>[];
  gridTemplateColumns: string;
  onSort: (column: TSortColumn) => void;
  sortColumn: TSortColumn;
  sortDirection: SortDirection;
}

function LocalVirtualTableHeaderInner<
  TRow extends { id: number | string },
  TSortColumn extends Extract<keyof TRow, string>,
>({
  columns,
  gridTemplateColumns,
  onSort,
  sortColumn,
  sortDirection,
}: LocalVirtualTableHeaderProps<TRow, TSortColumn>) {
  return (
    <div
      className="grid items-center border-b border-border bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground"
      style={{ gridTemplateColumns }}
    >
      {columns.map((column) => {
        const isSorted = sortColumn === column.key;

        if (!column.sortable) {
          return (
            <div key={String(column.key)} className={cn("truncate", column.headerClassName)}>
              {column.header}
            </div>
          );
        }

        return (
          <button
            key={String(column.key)}
            type="button"
            onClick={() => onSort(column.key as TSortColumn)}
            className={cn(
              "flex min-w-0 items-center gap-2 truncate text-left transition-colors hover:text-foreground",
              column.headerClassName,
            )}
          >
            <span className="truncate">{column.header}</span>
            {isSorted ? (
              sortDirection === "asc" ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const LocalVirtualTableHeader = memo(LocalVirtualTableHeaderInner) as <
  TRow extends { id: number | string },
  TSortColumn extends Extract<keyof TRow, string>,
>(
  props: LocalVirtualTableHeaderProps<TRow, TSortColumn>,
) => ReactNode;

interface LocalVirtualDataTableProps<
  TRow extends { id: number | string },
  TSortColumn extends Extract<keyof TRow, string>,
> {
  className?: string;
  columns: LocalVirtualColumnDef<TRow>[];
  data: readonly TRow[];
  defaultSortColumn: TSortColumn;
  defaultSortDirection?: SortDirection;
  emptyStateLabel?: string;
  getRowKey: (row: TRow) => Key;
  gridTemplateColumns: string;
  historyKey: string;
  minSearchLength?: number;
  rowHeight?: number;
  searchDebounceMs?: number;
  searchPlaceholder?: string;
  visibleRowCount?: number;
}

export function LocalVirtualDataTable<
  TRow extends { id: number | string },
  TSortColumn extends Extract<keyof TRow, string>,
>({
  className,
  columns,
  data,
  defaultSortColumn,
  defaultSortDirection = "asc",
  emptyStateLabel = "No results found",
  getRowKey,
  gridTemplateColumns,
  historyKey,
  minSearchLength = DEFAULT_MIN_SEARCH_LENGTH,
  rowHeight = DEFAULT_ROW_HEIGHT,
  searchDebounceMs = 150,
  searchPlaceholder = "Search...",
  visibleRowCount = DEFAULT_VISIBLE_ROW_COUNT,
}: LocalVirtualDataTableProps<TRow, TSortColumn>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const focusedRowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [internalSearchValue, setInternalSearchValue] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<TSortColumn>(defaultSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const normalizedValue = internalSearchValue.trim();
    const nextCommittedSearch = normalizedValue.length === 0
      ? ""
      : normalizedValue.length >= minSearchLength ? normalizedValue : "";

    if (searchDebounceMs <= 0) {
      setCommittedSearch(nextCommittedSearch);
      return;
    }

    const timeoutId = setTimeout(() => {
      setCommittedSearch(nextCommittedSearch);
    }, searchDebounceMs);

    return () => clearTimeout(timeoutId);
  }, [internalSearchValue, minSearchLength, searchDebounceMs]);

  useEffect(() => {
    setFocusedRowIndex(-1);
    setScrollTop(0);
    viewportRef.current?.scrollTo({ top: 0 });
    if (window.history.state?.[historyKey]) {
      window.history.replaceState({ ...window.history.state, [historyKey]: null }, "");
    }
  }, [committedSearch, historyKey, sortColumn, sortDirection]);

  const searchableColumns = useMemo(
    () => columns.filter((column) => column.searchable),
    [columns],
  );

  const filteredRows = useMemo(() => {
    if (!committedSearch) {
      return data;
    }

    const search = committedSearch.toLowerCase();
    return data.filter((row) => searchableColumns.some((column) => {
      const value = row[column.key];
      if (value == null) {
        return false;
      }
      return String(value).toLowerCase().includes(search);
    }));
  }, [committedSearch, data, searchableColumns]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((left, right) => {
      const leftValue = left[sortColumn];
      const rightValue = right[sortColumn];

      if (leftValue == null) return 1;
      if (rightValue == null) return -1;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }

      return sortDirection === "asc"
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
    return sorted;
  }, [filteredRows, sortColumn, sortDirection]);

  const viewportHeight = rowHeight * visibleRowCount;
  const overscan = DEFAULT_OVERSCAN;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(sortedRows.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  const visibleRows = sortedRows.slice(startIndex, endIndex);

  const handleSort = useCallback((column: TSortColumn) => {
    if (column === sortColumn) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  }, [sortColumn]);

  const focusNextRow = useCallback(() => {
    setFocusedRowIndex((current) => {
      const next = current < 0 ? 0 : Math.min(current + 1, sortedRows.length - 1);
      return next;
    });
  }, [sortedRows.length]);

  const focusPreviousRow = useCallback(() => {
    setFocusedRowIndex((current) => {
      if (current <= 0) {
        return 0;
      }
      return current - 1;
    });
  }, []);

  const focusFirstRow = useCallback(() => {
    setFocusedRowIndex(0);
  }, []);

  const focusRowElement = useCallback((index: number) => {
    requestAnimationFrame(() => {
      focusedRowRefs.current[index]?.focus();
    });
  }, []);

  useEffect(() => {
    if (focusedRowIndex < 0) {
      return;
    }

    const rowTop = focusedRowIndex * rowHeight;
    const rowBottom = rowTop + rowHeight;
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    if (rowTop < viewport.scrollTop) {
      viewport.scrollTo({ top: rowTop });
    } else if (rowBottom > viewport.scrollTop + viewportHeight) {
      viewport.scrollTo({ top: rowBottom - viewportHeight });
    }

    focusRowElement(focusedRowIndex);
  }, [focusRowElement, focusedRowIndex, rowHeight, viewportHeight]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusNextRow();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusPreviousRow();
      return;
    }
  }, [focusNextRow, focusPreviousRow]);

  return (
    <div className={cn("space-y-4", className)} onKeyDown={handleKeyDown}>
      <div ref={tableContainerRef} className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background">
        <LocalVirtualTableHeaderSearch
          placeholder={searchPlaceholder}
          searchValue={internalSearchValue}
          tableContainerRef={tableContainerRef}
          onArrowDown={focusNextRow}
          onArrowUp={focusPreviousRow}
          onEnter={() => {
            focusFirstRow();
            focusRowElement(0);
          }}
          onSearchFocus={() => setFocusedRowIndex(-1)}
          onSearchValueChange={setInternalSearchValue}
          onTabToResults={focusFirstRow}
        />
        <LocalVirtualTableHeader
          columns={columns}
          gridTemplateColumns={gridTemplateColumns}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
        />
        <div
          ref={viewportRef}
          className="min-h-0 flex-1 overflow-y-auto"
          style={{ height: viewportHeight }}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          {sortedRows.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
              {emptyStateLabel}
            </div>
          ) : (
            <div className="relative" style={{ height: sortedRows.length * rowHeight }}>
              {visibleRows.map((row, visibleIndex) => {
                const rowIndex = startIndex + visibleIndex;
                return (
                  <div
                    key={String(getRowKey(row))}
                    ref={(element) => {
                      focusedRowRefs.current[rowIndex] = element;
                    }}
                    data-row-index={rowIndex}
                    tabIndex={0}
                    onFocus={() => setFocusedRowIndex(rowIndex)}
                    className={cn(
                      "absolute left-0 right-0 border-b border-border bg-background px-4 outline-none",
                      focusedRowIndex === rowIndex ? "bg-muted/50" : undefined,
                    )}
                    style={{
                      height: rowHeight,
                      transform: `translateY(${rowIndex * rowHeight}px)`,
                    }}
                  >
                    <div
                      className="grid h-full items-center gap-4 hover:bg-muted/20"
                      style={{ gridTemplateColumns }}
                    >
                      {columns.map((column) => (
                        <div
                          key={String(column.key)}
                          className={cn("min-w-0 truncate text-sm", column.className)}
                        >
                          {column.render
                            ? column.render(row[column.key], row, focusedRowIndex === rowIndex)
                            : String(row[column.key] ?? "")}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
