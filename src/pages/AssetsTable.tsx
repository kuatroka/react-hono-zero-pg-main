import { useEffect, useRef, useState } from 'react';
import { useQuery, useZero } from '@rocicorp/zero/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, ColumnDef } from '@/components/DataTable';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LatencyBadge } from '@/components/LatencyBadge';
import { Asset, Schema, Search } from '@/schema';
import { useLatencyMs } from '@/lib/latency';
import { queries } from '@/zero/queries';
import { preload, PRELOAD_TTL, PRELOAD_LIMITS } from '@/zero-preload';

const ASSETS_TOTAL_ROWS = 32000;

export function AssetsTablePage({ onReady }: { onReady: () => void }) {
  const z = useZero<Schema>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tablePageSize = 10;
  const DEFAULT_WINDOW_LIMIT = PRELOAD_LIMITS.assetsTable;
  const MAX_WINDOW_LIMIT = 50000; // Allow syncing up to 50k rows as user pages
  const MARGIN_PAGES = 5; // Preload 5 pages ahead

  const rawPage = searchParams.get('page');
  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const searchParam = searchParams.get('search') ?? '';
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const isTypingRef = useRef(false);
  const rowSelectedRef = useRef(false);

  // Sync searchTerm with URL only on external navigation (not while typing)
  useEffect(() => {
    if (!isTypingRef.current) {
      setSearchTerm(searchParam);
    }
    isTypingRef.current = false;
  }, [searchParam]);

  // Clear search term on mount if no row was selected (page refresh scenario)
  useEffect(() => {
    if (searchParam && !rowSelectedRef.current) {
      // Clear the search param on refresh if no row was selected
      const params = new URLSearchParams(searchParams);
      params.delete('search');
      params.set('page', '1');
      setSearchParams(params, { replace: true });
      setSearchTerm('');
    }
  }, []); // Run only on mount

  const trimmedSearch = searchTerm.trim();

  // Sync URL with searchTerm state changes
  useEffect(() => {
    if (!isTypingRef.current) return; // Only update URL when user is typing

    const params = new URLSearchParams();
    params.set('page', '1');
    if (searchTerm.trim()) {
      params.set('search', searchTerm);
    }
    setSearchParams(params);
    isTypingRef.current = false;
  }, [searchTerm, setSearchParams]);

  const [windowLimit, setWindowLimit] = useState(() => {
    const required = currentPage * tablePageSize;
    const base = Math.max(DEFAULT_WINDOW_LIMIT, required + tablePageSize * MARGIN_PAGES);
    return Math.min(base, MAX_WINDOW_LIMIT);
  });

  const [assetsPageRows, assetsResult] = useQuery(
    queries.assetsPage(windowLimit, 0),
    { ttl: PRELOAD_TTL, enabled: !trimmedSearch }
  );

  const SEARCH_LIMIT = 200;

  const [assetSearchRows, searchResult] = useQuery(
    trimmedSearch
      ? queries.searchesByCategory('assets', trimmedSearch, SEARCH_LIMIT)
      : queries.searchesByCategory('assets', '', 0),
    { ttl: PRELOAD_TTL }
  );

  const browseReady = Boolean((assetsPageRows && assetsPageRows.length > 0) || assetsResult.type === 'complete');
  const searchReady = Boolean((assetSearchRows && assetSearchRows.length > 0) || searchResult.type === 'complete');
  const activeLatencyMs = useLatencyMs({
    isReady: trimmedSearch ? searchReady : browseReady,
    resetKey: trimmedSearch ? `search:${trimmedSearch}` : `browse:${windowLimit}`,
  });
  const latencySource = trimmedSearch ? 'Zero: searches.byCategory (assets)' : 'Zero: assets.page';

  // Signal ready when data is available (from cache or server)
  const readyCalledRef = useRef(false);
  useEffect(() => {
    if (readyCalledRef.current) return; // Only call onReady once

    if (trimmedSearch) {
      // In search mode: ready when search results arrive (has data or query complete)
      if ((assetSearchRows && assetSearchRows.length > 0) || searchResult.type === 'complete') {
        readyCalledRef.current = true;
        onReady();
      }
    } else {
      // In browse mode: ready when page results arrive
      if ((assetsPageRows && assetsPageRows.length > 0) || assetsResult.type === 'complete') {
        readyCalledRef.current = true;
        onReady();
      }
    }
  }, [trimmedSearch, assetsPageRows, assetsResult.type, assetSearchRows, searchResult.type, onReady]);

  // Map search results to Asset-like objects, preserving cusip
  const searchAssets: (Asset & { cusip?: string })[] | undefined = trimmedSearch
    ? assetSearchRows?.map((row: Search) => ({
      id: row.id,
      asset: row.code,
      assetName: row.name,
      cusip: row.cusip,
    }))
    : undefined;

  const assets = trimmedSearch ? searchAssets || [] : assetsPageRows || [];

  useEffect(() => {
    if (trimmedSearch) return; // search mode ignores windowLimit
    const required = currentPage * tablePageSize;
    if (required > windowLimit) {
      setWindowLimit(prev => {
        const base = Math.max(prev, required + tablePageSize * MARGIN_PAGES);
        return Math.min(base, MAX_WINDOW_LIMIT);
      });
    }
  }, [currentPage, windowLimit, trimmedSearch]);

  useEffect(() => {
    preload(z);
  }, [z]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    if (trimmedSearch) {
      params.set('search', trimmedSearch);
    }
    setSearchParams(params);

    if (trimmedSearch) {
      return; // pagination over search results is handled client-side only
    }

    const required = newPage * tablePageSize;
    if (required > windowLimit) {
      setWindowLimit(prev => {
        const base = Math.max(prev, required + tablePageSize * MARGIN_PAGES);
        return Math.min(base, MAX_WINDOW_LIMIT);
      });
    }
  };

  const handleSearchChange = (value: string) => {
    isTypingRef.current = true;
    setSearchTerm(value);
  };

  // Helper to build asset detail URL with cusip
  const getAssetUrl = (row: Asset & { cusip?: string }) => {
    const cusip = row.cusip || '_';
    return `/assets/${encodeURIComponent(row.asset)}/${encodeURIComponent(cusip)}`;
  };

  const columns: ColumnDef<Asset>[] = [
    {
      key: 'asset',
      header: 'Asset',
      sortable: true,
      searchable: true,
      clickable: true,
      render: (value, row, isFocused) => {
        const url = getAssetUrl(row);
        return (
          <a
            href={url}
            onMouseEnter={() => {
              if (row.cusip) {
                z.preload(queries.assetBySymbolAndCusip(row.asset, row.cusip), { ttl: PRELOAD_TTL });
              } else {
                z.preload(queries.assetBySymbol(row.asset), { ttl: PRELOAD_TTL });
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              rowSelectedRef.current = true;
              if (row.cusip) {
                z.preload(queries.assetBySymbolAndCusip(row.asset, row.cusip), { ttl: PRELOAD_TTL });
              } else {
                z.preload(queries.assetBySymbol(row.asset), { ttl: PRELOAD_TTL });
              }
              navigate(url);
            }}
            className={`hover:underline underline-offset-4 cursor-pointer text-foreground outline-none ${isFocused ? 'underline' : ''}`}
          >
            {String(value)}
          </a>
        );
      },
    },
    {
      key: 'assetName',
      header: 'Asset Name',
      sortable: true,
      searchable: true,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Assets</CardTitle>
          <CardDescription>Browse and search all assets</CardDescription>
          <CardAction>
            <LatencyBadge ms={activeLatencyMs} source={latencySource} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {(
            (!trimmedSearch && !assetsPageRows) ||
            (trimmedSearch && !assetSearchRows)
          ) ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <DataTable
              data={assets || []}
              columns={columns}
              searchPlaceholder="Search assets..."
              defaultPageSize={tablePageSize}
              defaultSortColumn="assetName"
              defaultSortDirection="asc"
              initialPage={currentPage}
              onPageChange={handlePageChange}
              onSearchChange={handleSearchChange}
              searchValue={searchTerm}
              searchDisabled={!!trimmedSearch}
              totalCount={trimmedSearch ? assets.length : ASSETS_TOTAL_ROWS}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
