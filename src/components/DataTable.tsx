import { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

export interface ColumnDef<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  searchable?: boolean;
  clickable?: boolean;
  render?: (value: T[keyof T], row: T, isFocused?: boolean) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  defaultPageSize?: number;
  defaultSortColumn?: keyof T;
  defaultSortDirection?: 'asc' | 'desc';
  initialPage?: number;
  onPageChange?: (page: number) => void;
  totalCount?: number;
  onSearchChange?: (value: string) => void;
  searchDisabled?: boolean;
  searchValue?: string;
  searchDebounceMs?: number;
}

interface DataTableSearchInputProps {
  initialValue: string;
  placeholder: string;
  debounceMs: number;
  onQueryCommit: (value: string) => void;
}

const DataTableSearchInput = memo(function DataTableSearchInput({
  initialValue,
  placeholder,
  debounceMs,
  onQueryCommit,
}: DataTableSearchInputProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (debounceMs <= 0) {
      onQueryCommit(inputValue);
      return;
    }

    const timeoutId = setTimeout(() => {
      onQueryCommit(inputValue);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [debounceMs, inputValue, onQueryCommit]);

  return (
    <div className="w-full sm:w-96">
      <Input
        type="search"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="w-full"
      />
    </div>
  );
});

DataTableSearchInput.displayName = 'DataTableSearchInput';

function DataTableInner<T extends { id: number | string }>({
  data,
  columns,
  searchPlaceholder = 'Search...',
  defaultPageSize = 20,
  defaultSortColumn,
  defaultSortDirection = 'asc',
  initialPage,
  onPageChange,
  totalCount,
  onSearchChange,
  searchDisabled = false,
  searchValue,
  searchDebounceMs = 0,
}: DataTableProps<T>) {
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(searchValue ?? '');
  const [sortColumn, setSortColumn] = useState<keyof T | null>(defaultSortColumn ?? null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);
  const [currentPage, setCurrentPage] = useState(initialPage ?? 1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const currentPageRef = useRef(initialPage ?? 1);
  const onSearchChangeRef = useRef(onSearchChange);
  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    if (initialPage != null) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    if (searchValue !== undefined) {
      setAppliedSearchQuery(searchValue);
    }
  }, [searchValue]);

  const searchableColumns = useMemo(
    () => columns.filter(col => col.searchable),
    [columns]
  );

  const filteredData = useMemo(() => {
    if (searchDisabled || !appliedSearchQuery.trim()) return data;

    const query = appliedSearchQuery.toLowerCase();
    return data.filter(row =>
      searchableColumns.some(col => {
        const value = row[col.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      })
    );
  }, [appliedSearchQuery, data, searchDisabled, searchableColumns]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }, [filteredData, sortColumn, sortDirection]);

  const displayTotalCount = totalCount ?? sortedData.length;
  const totalPages = displayTotalCount === 0 ? 0 : Math.ceil(displayTotalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, displayTotalCount);
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSearchCommit = useCallback((value: string) => {
    setAppliedSearchQuery(value);
    onSearchChangeRef.current?.(value);

    if (currentPageRef.current !== 1) {
      currentPageRef.current = 1;
      setCurrentPage(1);
      onPageChangeRef.current?.(1);
    }
  }, []);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    const newPage = 1;
    setCurrentPage(newPage);
    onPageChangeRef.current?.(newPage);
  };

  const handleFirstPage = () => {
    const newPage = 1;
    setCurrentPage(newPage);
    onPageChangeRef.current?.(newPage);
  };
  const handlePreviousPage = () => {
    const newPage = Math.max(1, currentPage - 1);
    setCurrentPage(newPage);
    onPageChangeRef.current?.(newPage);
  };
  const handleNextPage = () => {
    const newPage = Math.min(totalPages, currentPage + 1);
    setCurrentPage(newPage);
    onPageChangeRef.current?.(newPage);
  };
  const handleLastPage = () => {
    const newPage = totalPages;
    setCurrentPage(newPage);
    onPageChangeRef.current?.(newPage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (paginatedData.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedRowIndex(prev => Math.min(prev + 1, paginatedData.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedRowIndex(prev => Math.max(0, prev - 1));
        break;
      case 'Enter':
        if (focusedRowIndex >= 0 && focusedRowIndex < paginatedData.length) {
          const clickableColumn = columns.find(col => col.clickable);
          if (clickableColumn && clickableColumn.render) {
            const cell = tableBodyRef.current?.querySelectorAll('tr')[focusedRowIndex]
              ?.querySelector(`[data-column="${String(clickableColumn.key)}"]`);
            if (cell) {
              const link = cell.querySelector('a');
              if (link) link.click();
            }
          }
        }
        break;
    }
  };

  useEffect(() => {
    if (focusedRowIndex >= 0 && tableBodyRef.current) {
      const rows = tableBodyRef.current.querySelectorAll('tr');
      const focusedRow = rows[focusedRowIndex] as HTMLElement;
      if (focusedRow) {
        focusedRow.focus();
      }
    }
  }, [focusedRowIndex]);

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      <DataTableSearchInput
        initialValue={searchValue ?? ''}
        placeholder={searchPlaceholder}
        debounceMs={searchDebounceMs}
        onQueryCommit={handleSearchCommit}
      />

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead key={String(column.key)}>
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-2 hover:text-foreground transition-colors"
                    >
                      {column.header}
                      {sortColumn === column.key && (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody ref={tableBodyRef}>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow 
                  key={row.id}
                  tabIndex={0}
                  className={`outline-none focus:outline-none focus-visible:outline-none ${focusedRowIndex === rowIndex ? 'bg-muted/50' : ''}`}
                  onFocus={() => setFocusedRowIndex(rowIndex)}
                >
                  {columns.map(column => (
                    <TableCell 
                      key={String(column.key)}
                      data-column={String(column.key)}
                    >
                      {column.render
                        ? column.render(row[column.key], row, focusedRowIndex === rowIndex)
                        : String(row[column.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <p className="text-muted-foreground">No results found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {displayTotalCount === 0 ? 0 : startIndex + 1}-{endIndex} of {displayTotalCount} row(s)
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFirstPage}
              disabled={currentPage === 1}
              title="Go to first page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              title="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              title="Go to next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLastPage}
              disabled={currentPage === totalPages}
              title="Go to last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
          </div>
        </div>
      </div>
    </div>
  );
}

const MemoizedDataTable = memo(DataTableInner);
MemoizedDataTable.displayName = 'DataTable';

export const DataTable = MemoizedDataTable as typeof DataTableInner;
