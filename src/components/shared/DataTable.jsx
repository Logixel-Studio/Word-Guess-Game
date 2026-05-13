import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DataTable({ columns, data, isLoading, searchKey, onRowClick, expandedContent, pageSize = 10 }) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(0);

  const filtered = data?.filter(row => {
    if (!search || !searchKey) return true;
    const val = row[searchKey];
    return val && String(val).toLowerCase().includes(search.toLowerCase());
  }) || [];

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleRowClick = (row) => {
    if (expandedContent) setExpandedId(expandedId === row.id ? null : row.id);
    onRowClick?.(row);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4"><Skeleton className="h-9 w-48 sm:w-64" /></div>
        <div className="space-y-2 p-4">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
      {searchKey && (
        <div className="p-3 sm:p-4 border-b border-border">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
          </div>
        </div>
      )}
      <div className="overflow-x-auto w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {expandedContent && <TableHead className="w-8" />}
              {columns.map(col => (
                <TableHead key={col.key} className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (expandedContent ? 1 : 0)} className="text-center py-12 text-muted-foreground text-sm">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map(row => (
                <AnimatePresence key={row.id} mode="wait">
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(row)}
                  >
                    {expandedContent && (
                      <TableCell className="w-8 pr-0">
                        {expandedId === row.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </TableCell>
                    )}
                    {columns.map(col => (
                      <TableCell key={col.key} className="py-3">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedContent && expandedId === row.id && (
                    <TableRow key={`${row.id}-expanded`}>
                      <TableCell colSpan={columns.length + 1} className="bg-muted/20 p-4">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          {expandedContent(row)}
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 sm:p-4 border-t border-border">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}