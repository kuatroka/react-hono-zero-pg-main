import {
  type GetPageQueryOptions,
  type GetSingleQueryOptions,
  type QueryResult,
  useHistoryScrollState,
  useZeroVirtualizer,
} from '@rocicorp/zero-virtual/react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Key, type ReactNode } from 'react';
import { LatencyBadge } from '@/components/LatencyBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLatencyMs } from '@/lib/latency';
import { cn } from '@/lib/utils';

type SortDirection = 'asc' | 'desc';

const DEFAULT_VISIBLE_ROW_COUNT = 10;
const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_MIN_SEARCH_LENGTH = 2;

export interface ColumnDef<T> {
  key: Extract<keyof T, string>;
  header: string;
  sortable?: boolean;
  searchable?: boolean;
  clickable?: boolean;
  render?: (value: T[keyof T], row: T, isFocused?: boolean) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export type ZeroVirtualListContext<TSortColumn extends string> = Readonly<{
  search: string;
  sortColumn: TSortColumn;
  sortDirection: SortDirection;
}>;

export type ZeroVirtualTableKeyboardNavigation = Readonly<{
  clearFocusedRow: () => void;
  focusFirstRow: () => void;
  focusNextRow: () => void;
  focusPreviousRow: () => void;
}>;

interface ZeroVirtualTableSearchInputProps {
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

export const ZeroVirtualTableSearchInput = memo(function ZeroVirtualTableSearchInput({
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
  containerClassName = 'w-full sm:w-96',
  inputClassName,
}: ZeroVirtualTableSearchInputProps) {
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
    if (event.key === 'ArrowDown' && onArrowDown) {
      event.preventDefault();
      onArrowDown();
      return;
    }

    if (event.key === 'ArrowUp' && onArrowUp) {
      event.preventDefault();
      onArrowUp();
      return;
    }

    if (event.key === 'Tab' && !event.shiftKey && onTabToResults) {
      event.preventDefault();
      onTabToResults();
      return;
    }

    if (event.key === 'Enter' && onEnter) {
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
        className={cn('w-full', inputClassName)}
      />
    </div>
  );
});

ZeroVirtualTableSearchInput.displayName = 'ZeroVirtualTableSearchInput';

interface ZeroVirtualTableToolbarProps {
  latencyMs: number | null;
  latencySource?: string;
}

const ZeroVirtualTableToolbar = memo(function ZeroVirtualTableToolbar({
  latencyMs,
  latencySource,
}: ZeroVirtualTableToolbarProps) {
  if (!latencySource) {
    return null;
  }

  return (
    <div className="flex items-center justify-end">
      <LatencyBadge ms={latencyMs} source={latencySource} />
    </div>
  );
});

ZeroVirtualTableToolbar.displayName = 'ZeroVirtualTableToolbar';

interface ZeroVirtualTableHeaderSearchProps {
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

const ZeroVirtualTableHeaderSearch = memo(function ZeroVirtualTableHeaderSearch({
  placeholder,
  searchValue,
  tableContainerRef,
  onArrowDown,
  onArrowUp,
  onEnter,
  onSearchFocus,
  onSearchValueChange,
  onTabToResults,
}: ZeroVirtualTableHeaderSearchProps) {
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

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isExpanded, searchValue, tableContainerRef]);

  const handleToggle = useCallback(() => {
    if (isExpanded && searchValue.trim()) {
      onSearchValueChange('');
      return;
    }

    setIsExpanded((current) => !current);
  }, [isExpanded, onSearchValueChange, searchValue]);

  return (
    <div className="flex items-center justify-end border-b border-border bg-background px-4 py-2">
      <div className="flex items-center gap-2">
        {isExpanded ? (
          <ZeroVirtualTableSearchInput
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
          aria-label={isExpanded ? 'Collapse search' : 'Expand search'}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

ZeroVirtualTableHeaderSearch.displayName = 'ZeroVirtualTableHeaderSearch';

interface ZeroVirtualTableHeaderProps<
  TRow extends { id: number | string },
  TSortColumn extends Extract<keyof TRow, string>,
> {
  columns: ColumnDef<TRow>[];
  gridTemplateColumns: string;
  onSort: (column: TSortColumn) => void;
  sortColumn: TSortColumn;
  sortDirection: SortDirection;
}

function ZeroVirtualTableHeaderInner<
  TRow extends { id: number | string },
  TSortColumn extends Extract<keyof TRow, string>,
>({
  columns,
  gridTemplateColumns,
  onSort,
  sortColumn,
  sortDirection,
}: ZeroVirtualTableHeaderProps<TRow, TSortColumn>) {
  return (
    <div
      className="grid items-center border-b border-border bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground"
      style={{ gridTemplateColumns }}
    >
      {columns.map((column) => {
        const isSorted = sortColumn === column.key;

        if (!column.sortable) {
          return (
            <div key={String(column.key)} className={cn('truncate', column.headerClassName)}>
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
              'flex min-w-0 items-center gap-2 truncate text-left transition-colors hover:text-foreground',
              column.headerClassName,
            )}
          >
            <span className="truncate">{column.header}</span>
            {isSorted ? (
              sortDirection === 'asc' ? (
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

const ZeroVirtualTableHeader = memo(ZeroVirtualTableHeaderInner) as <
  TRow extends { id: number | string },
  TSortColumn extends Extract<keyof TRow, string>,
>(
  props: ZeroVirtualTableHeaderProps<TRow, TSortColumn>,
) => ReactNode;

interface ZeroVirtualTableViewportProps<
  TRow extends { id: number | string },
  TStartRow,
  TSortColumn extends Extract<keyof TRow, string>,
> {
  columns: ColumnDef<TRow>[];
  emptyStateLabel: string;
  focusedRowIndex: number;
  getPageQuery: (
    options: GetPageQueryOptions<TStartRow>,
    listContextParams: ZeroVirtualListContext<TSortColumn>,
  ) => QueryResult<TRow>;
  getSingleQuery: (options: GetSingleQueryOptions) => QueryResult<TRow | undefined>;
  getRowKey: (row: TRow) => Key;
  gridTemplateColumns: string;
  historyKey: string;
  listContextParams: ZeroVirtualListContext<TSortColumn>;
  onReadyChange: (isReady: boolean) => void;
  onRowFocus: (index: number) => void;
  rowHeight: number;
  toStartRow: (row: TRow) => TStartRow;
  visibleRowCount: number;
}

function ZeroVirtualTableViewportInner<
  TRow extends { id: number | string },
  TStartRow,
  TSortColumn extends Extract<keyof TRow, string>,
>({
  columns,
  emptyStateLabel,
  focusedRowIndex,
  getPageQuery,
  getSingleQuery,
  getRowKey,
  gridTemplateColumns,
  historyKey,
  listContextParams,
  onReadyChange,
  onRowFocus,
  rowHeight,
  toStartRow,
  visibleRowCount,
}: ZeroVirtualTableViewportProps<TRow, TStartRow, TSortColumn>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const focusedRowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [scrollState, setScrollState] = useHistoryScrollState<TStartRow>(historyKey);

  const getScrollElement = useCallback(() => viewportRef.current, []);
  const estimateSize = useCallback(() => rowHeight, [rowHeight]);
  const resolvePageQuery = useCallback(
    (options: GetPageQueryOptions<TStartRow>) => getPageQuery(options, listContextParams),
    [getPageQuery, listContextParams],
  );

  const { complete, rowAt, rowsEmpty, settled, virtualizer } = useZeroVirtualizer<
    HTMLDivElement,
    HTMLDivElement,
    ZeroVirtualListContext<TSortColumn>,
    TRow,
    TStartRow
  >({
    estimateSize,
    getPageQuery: resolvePageQuery,
    getRowKey,
    getScrollElement,
    getSingleQuery,
    listContextParams,
    onScrollStateChange: setScrollState,
    scrollState,
    toStartRow,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const isReady = rowsEmpty || complete || rowAt(0) !== undefined;

  useEffect(() => {
    onReadyChange(isReady);
  }, [isReady, onReadyChange]);

  useEffect(() => {
    if (focusedRowIndex < 0) {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement) {
      return;
    }

    focusedRowRefs.current[focusedRowIndex]?.focus();
  }, [focusedRowIndex, virtualItems]);

  return (
    <div
      ref={viewportRef}
      className="overflow-y-auto"
      style={{ height: rowHeight * visibleRowCount }}
    >
      {rowsEmpty && complete ? (
        <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
          {emptyStateLabel}
        </div>
      ) : (
        <div
          className="relative"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualItems.map((virtualRow) => {
            const row = rowAt(virtualRow.index);

            return (
              <div
                key={virtualRow.key}
                ref={(element) => {
                  focusedRowRefs.current[virtualRow.index] = element;
                }}
                data-row-index={virtualRow.index}
                tabIndex={0}
                onFocus={() => onRowFocus(virtualRow.index)}
                className={cn(
                  'absolute left-0 right-0 border-b border-border bg-background px-4 outline-none',
                  focusedRowIndex === virtualRow.index ? 'bg-muted/50' : undefined,
                )}
                style={{
                  height: rowHeight,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className="grid h-full items-center gap-4 hover:bg-muted/20"
                  style={{ gridTemplateColumns }}
                >
                  {columns.map((column, columnIndex) => (
                    <div
                      key={String(column.key)}
                      className={cn('min-w-0 truncate text-sm', column.className)}
                    >
                      {row
                        ? column.render
                          ? column.render(row[column.key], row, focusedRowIndex === virtualRow.index)
                          : String(row[column.key] ?? '')
                        : columnIndex === 0
                          ? (
                            <span className="text-muted-foreground">
                              {settled ? 'Loading…' : 'Loading...'}
                            </span>
                          )
                          : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ZeroVirtualTableViewport = memo(ZeroVirtualTableViewportInner) as <
  TRow extends { id: number | string },
  TStartRow,
  TSortColumn extends Extract<keyof TRow, string>,
>(
  props: ZeroVirtualTableViewportProps<TRow, TStartRow, TSortColumn>,
) => ReactNode;

interface ZeroVirtualDataTableProps<
  TRow extends { id: number | string },
  TStartRow,
  TSortColumn extends Extract<keyof TRow, string>,
> {
  columns: ColumnDef<TRow>[];
  defaultSortColumn: TSortColumn;
  defaultSortDirection?: SortDirection;
  emptyStateLabel?: string;
  getPageQuery: (
    options: GetPageQueryOptions<TStartRow>,
    listContextParams: ZeroVirtualListContext<TSortColumn>,
  ) => QueryResult<TRow>;
  getSingleQuery: (options: GetSingleQueryOptions) => QueryResult<TRow | undefined>;
  getRowKey: (row: TRow) => Key;
  gridTemplateColumns: string;
  historyKey: string;
  latencySource?: string | ((listContextParams: ZeroVirtualListContext<TSortColumn>) => string);
  minSearchLength?: number;
  onKeyboardNavigationReady?: (navigation: ZeroVirtualTableKeyboardNavigation) => void;
  onReady?: () => void;
  onSearchValueChange?: (value: string) => void;
  rowHeight?: number;
  searchDebounceMs?: number;
  searchPlaceholder?: string;
  searchValue?: string;
  toStartRow: (row: TRow) => TStartRow;
  visibleRowCount?: number;
}

function ZeroVirtualDataTableInner<
  TRow extends { id: number | string },
  TStartRow,
  TSortColumn extends Extract<keyof TRow, string>,
>({
  columns,
  defaultSortColumn,
  defaultSortDirection = 'asc',
  emptyStateLabel = 'No results found',
  getPageQuery,
  getSingleQuery,
  getRowKey,
  gridTemplateColumns,
  historyKey,
  latencySource,
  minSearchLength = DEFAULT_MIN_SEARCH_LENGTH,
  onKeyboardNavigationReady,
  onReady,
  onSearchValueChange,
  rowHeight = DEFAULT_ROW_HEIGHT,
  searchDebounceMs = 150,
  searchPlaceholder = 'Search...',
  searchValue,
  toStartRow,
  visibleRowCount = DEFAULT_VISIBLE_ROW_COUNT,
}: ZeroVirtualDataTableProps<TRow, TStartRow, TSortColumn>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [internalSearchValue, setInternalSearchValue] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<TSortColumn>(defaultSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const initializedHistoryRef = useRef(false);
  const [isQueryReady, setIsQueryReady] = useState(false);
  const readyCalledRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const isSearchControlled = searchValue !== undefined;
  const resolvedSearchValue = isSearchControlled ? searchValue : internalSearchValue;
  const clearFocusedRow = useCallback(() => {
    setFocusedRowIndex(-1);
  }, []);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const normalizedValue = resolvedSearchValue.trim();
    const nextCommittedSearch = normalizedValue.length === 0
      ? ''
      : normalizedValue.length >= minSearchLength ? normalizedValue : '';

    if (searchDebounceMs <= 0) {
      setCommittedSearch(nextCommittedSearch);
      return;
    }

    const timeoutId = setTimeout(() => {
      setCommittedSearch(nextCommittedSearch);
    }, searchDebounceMs);

    return () => clearTimeout(timeoutId);
  }, [minSearchLength, resolvedSearchValue, searchDebounceMs]);

  useEffect(() => {
    clearFocusedRow();
  }, [clearFocusedRow, committedSearch, sortColumn, sortDirection]);

  const listContextParams = useMemo<ZeroVirtualListContext<TSortColumn>>(
    () => ({
      search: committedSearch,
      sortColumn,
      sortDirection,
    }),
    [committedSearch, sortColumn, sortDirection],
  );

  const latencyResetKey = `${listContextParams.search}:${listContextParams.sortColumn}:${listContextParams.sortDirection}`;
  const resolvedLatencySource =
    typeof latencySource === 'function' ? latencySource(listContextParams) : latencySource;
  const activeLatencyMs = useLatencyMs({
    isReady: isQueryReady,
    resetKey: latencyResetKey,
  });

  useLayoutEffect(() => {
    if (initializedHistoryRef.current) {
      return;
    }

    initializedHistoryRef.current = true;
    if (window.history.state?.[historyKey]) {
      window.history.replaceState({ ...window.history.state, [historyKey]: null }, '');
    }
  }, [historyKey]);

  useEffect(() => {
    setIsQueryReady(false);
  }, [latencyResetKey]);

  useEffect(() => {
    if (!isQueryReady || readyCalledRef.current) {
      return;
    }

    readyCalledRef.current = true;
    onReadyRef.current?.();
  }, [isQueryReady]);

  const handleSearchValueChange = useCallback((value: string) => {
    if (!isSearchControlled) {
      setInternalSearchValue(value);
    }

    onSearchValueChange?.(value);
  }, [isSearchControlled, onSearchValueChange]);

  const handleSort = useCallback((column: TSortColumn) => {
    if (column === sortColumn) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  }, [sortColumn]);

  const handleReadyChange = useCallback((ready: boolean) => {
    setIsQueryReady(ready);
  }, []);

  const focusFirstRow = useCallback(() => {
    setFocusedRowIndex(0);
  }, []);

  const focusRowElement = useCallback((index: number) => {
    requestAnimationFrame(() => {
      const rowElement = tableContainerRef.current?.querySelector(`[data-row-index="${index}"]`);
      if (rowElement instanceof HTMLDivElement) {
        rowElement.focus();
      }
    });
  }, []);

  const activateRowElement = useCallback((index: number) => {
    requestAnimationFrame(() => {
      const rowElement = tableContainerRef.current?.querySelector(`[data-row-index="${index}"]`);
      const link = rowElement?.querySelector?.('a') ?? rowElement?.closest?.('a');
      if (link instanceof HTMLAnchorElement) {
        link.click();
      }
    });
  }, []);

  const focusNextRow = useCallback(() => {
    setFocusedRowIndex((current) => current < 0 ? 0 : current + 1);
  }, []);

  const focusPreviousRow = useCallback(() => {
    setFocusedRowIndex((current) => current <= 0 ? 0 : current - 1);
  }, []);

  const activateFocusedRow = useCallback(() => {
    const focusedElement = document.activeElement;
    const link = focusedElement?.querySelector?.('a') ?? focusedElement?.closest?.('a');
    if (link instanceof HTMLAnchorElement) {
      link.click();
    }
  }, []);

  useEffect(() => {
    onKeyboardNavigationReady?.({
      clearFocusedRow,
      focusFirstRow,
      focusNextRow,
      focusPreviousRow,
    });
  }, [clearFocusedRow, focusFirstRow, focusNextRow, focusPreviousRow, onKeyboardNavigationReady]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusNextRow();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusPreviousRow();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      activateFocusedRow();
    }
  }, [activateFocusedRow, focusNextRow, focusPreviousRow]);

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      <ZeroVirtualTableToolbar
        latencyMs={activeLatencyMs}
        latencySource={resolvedLatencySource}
      />

      <div ref={tableContainerRef} className="overflow-hidden rounded-lg border border-border bg-background">
        <ZeroVirtualTableHeaderSearch
          placeholder={searchPlaceholder}
          searchValue={resolvedSearchValue}
          tableContainerRef={tableContainerRef}
          onArrowDown={focusNextRow}
          onArrowUp={focusPreviousRow}
          onEnter={() => {
            focusFirstRow();
            focusRowElement(0);
            activateRowElement(0);
          }}
          onSearchFocus={clearFocusedRow}
          onSearchValueChange={handleSearchValueChange}
          onTabToResults={focusFirstRow}
        />
        <ZeroVirtualTableHeader
          columns={columns}
          gridTemplateColumns={gridTemplateColumns}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
        />
        <ZeroVirtualTableViewport
          columns={columns}
          emptyStateLabel={emptyStateLabel}
          focusedRowIndex={focusedRowIndex}
          getPageQuery={getPageQuery}
          getSingleQuery={getSingleQuery}
          getRowKey={getRowKey}
          gridTemplateColumns={gridTemplateColumns}
          historyKey={historyKey}
          listContextParams={listContextParams}
          onReadyChange={handleReadyChange}
          onRowFocus={setFocusedRowIndex}
          rowHeight={rowHeight}
          toStartRow={toStartRow}
          visibleRowCount={visibleRowCount}
        />
      </div>
    </div>
  );
}

const MemoizedZeroVirtualDataTable = memo(ZeroVirtualDataTableInner);
MemoizedZeroVirtualDataTable.displayName = 'ZeroVirtualDataTable';

export const ZeroVirtualDataTable = MemoizedZeroVirtualDataTable as typeof ZeroVirtualDataTableInner;
