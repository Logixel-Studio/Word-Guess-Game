import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatNumber, formatDate } from '@/lib/formatters';
import { useCurrency } from '@/lib/CurrencyContext';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, DollarSign, AlertTriangle, XCircle, CheckCircle, ChevronDown, ChevronUp, Plus, Minus, Edit3, Search, BarChart3 } from 'lucide-react';
import { usePermissions } from '@/lib/PermissionsContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Stock() {
  const { formatCurrency } = useCurrency();
  const { canUpdate } = usePermissions();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list() });

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus || (filterStatus === 'low_stock' && (p.stock_qty || 0) <= 10 && (p.stock_qty || 0) > 0);
    return matchSearch && matchStatus;
  });

  const totalStock = products.reduce((a, p) => a + (p.stock_qty || 0), 0);
  const totalValue = products.reduce((a, p) => a + ((p.production_cost || 0) * (p.stock_qty || 0)), 0);
  const lowStock = products.filter(p => (p.stock_qty || 0) > 0 && (p.stock_qty || 0) <= 10).length;
  const outOfStock = products.filter(p => (p.stock_qty || 0) === 0).length;

  const getSoldQty = (productId) => sales.filter(s => s.product_id === productId).reduce((a, s) => a + (s.qty || 0), 0);

  const statusTabs = [
    { key: 'all', label: 'All Products' },
    { key: 'in_stock', label: 'In Stock' },
    { key: 'low_stock', label: 'Low Stock' },
    { key: 'out_of_stock', label: 'Out of Stock' },
  ];

  return (
    <div>
      <PageHeader title="Stock Management" description="Real-time inventory tracking and management" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <SummaryCard title="Total Products" value={formatNumber(products.length)} icon={Package} />
        <SummaryCard title="Total Stock" value={formatNumber(totalStock)} icon={BarChart3} delay={0.05} />
        <SummaryCard title="Inventory Value" value={formatCurrency(totalValue)} icon={DollarSign} delay={0.1} />
        <SummaryCard title="Low Stock" value={formatNumber(lowStock)} icon={AlertTriangle} delay={0.15} />
        <SummaryCard title="Out of Stock" value={formatNumber(outOfStock)} icon={XCircle} delay={0.2} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterStatus === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Cards */}
      {isLoading ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No products found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((product, idx) => {
            const isExpanded = expandedId === product.id;
            const soldQty = getSoldQty(product.id);
            const stockValue = (product.production_cost || 0) * (product.stock_qty || 0);
            const stockQty = product.stock_qty || 0;
            const isLow = stockQty > 0 && stockQty <= 10;
            const isOut = stockQty === 0;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : product.id)}
                >
                  {/* Stock qty indicator */}
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold',
                    isOut ? 'bg-red-100 text-red-600' : isLow ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                  )}>
                    {stockQty}
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 items-center">
                    <div className="sm:col-span-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{product.name}</span>
                        {(isLow || isOut) && (
                          <Badge variant="outline" className={isOut ? 'bg-red-50 text-red-600 border-red-200 text-xs' : 'bg-amber-50 text-amber-600 border-amber-200 text-xs'}>
                            {isOut ? 'Out of Stock' : 'Low Stock'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{product.description || 'No description'}</p>
                    </div>
                    <div className="text-sm hidden sm:block">
                      <p className="text-xs text-muted-foreground">Unit Cost</p>
                      <p className="font-medium">{formatCurrency(product.production_cost)}</p>
                    </div>
                    <div className="text-sm hidden lg:block">
                      <p className="text-xs text-muted-foreground">Stock Value</p>
                      <p className="font-medium">{formatCurrency(stockValue)}</p>
                    </div>
                    <div className="text-sm hidden lg:block">
                      <p className="text-xs text-muted-foreground">Total Sold</p>
                      <p className="font-medium">{formatNumber(soldQty)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canUpdate('stock') && <Button
                      variant="outline" size="sm" className="h-8 px-2 hidden sm:flex gap-1 text-xs"
                      onClick={e => { e.stopPropagation(); setAdjustProduct(product); }}
                    >
                      <Edit3 className="w-3 h-3" /> Adjust
                    </Button>}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/10">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                          <div><p className="text-xs text-muted-foreground mb-1">Product Name</p><p className="font-medium text-sm">{product.name}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Current Stock</p><p className="font-semibold text-lg text-foreground">{stockQty}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Total Sold</p><p className="font-medium text-sm">{formatNumber(soldQty)}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Unit Cost</p><p className="font-medium text-sm">{formatCurrency(product.production_cost)}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Inventory Value</p><p className="font-medium text-sm">{formatCurrency(stockValue)}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Status</p><StatusBadge status={product.status || 'out_of_stock'} /></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Last Updated</p><p className="font-medium text-sm">{formatDate(product.updated_date || product.created_date)}</p></div>
                        </div>

                        {/* Materials */}
                        {product.materials && product.materials.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Materials</p>
                            <div className="space-y-1">
                              {product.materials.map((m, i) => (
                                <div key={i} className="flex items-center justify-between text-xs bg-background rounded-lg px-3 py-2">
                                  <span className="font-medium">{m.name}</span>
                                  <span className="text-muted-foreground">{m.qty} × {formatCurrency(m.unit_price)}</span>
                                  <span className="font-medium">{formatCurrency(m.total)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {canUpdate('stock') && <div className="flex justify-end mt-3">
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAdjustProduct(product)}>
                            <Edit3 className="w-3 h-3" /> Adjust Stock
                          </Button>
                        </div>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <StockAdjustDialog product={adjustProduct} onClose={() => setAdjustProduct(null)} qc={qc} />
    </div>
  );
}

function StockAdjustDialog({ product, onClose, qc }) {
  const [mode, setMode] = useState('set'); // set | increase | decrease
  const [qty, setQty] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      let newQty;
      if (mode === 'set') newQty = Number(qty);
      else if (mode === 'increase') newQty = (product.stock_qty || 0) + Number(qty);
      else newQty = Math.max(0, (product.stock_qty || 0) - Number(qty));

      if (newQty < 0) { toast.error('Stock cannot be negative'); throw new Error('invalid'); }
      let status = newQty === 0 ? 'out_of_stock' : newQty <= 10 ? 'low_stock' : 'in_stock';
      return base44.entities.Product.update(product.id, { stock_qty: newQty, status });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Stock updated'); onClose(); setQty(''); }
  });

  if (!product) return null;

  const preview = () => {
    if (!qty || isNaN(Number(qty))) return product.stock_qty || 0;
    if (mode === 'set') return Number(qty);
    if (mode === 'increase') return (product.stock_qty || 0) + Number(qty);
    return Math.max(0, (product.stock_qty || 0) - Number(qty));
  };

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Adjust Stock — {product?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Stock:</span>
            <span className="text-2xl font-bold">{product?.stock_qty || 0}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{ k: 'set', label: 'Set', icon: Edit3 }, { k: 'increase', label: 'Add', icon: Plus }, { k: 'decrease', label: 'Remove', icon: Minus }].map(m => (
              <button key={m.k} onClick={() => setMode(m.k)}
                className={cn('flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors',
                  mode === m.k ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                )}>
                <m.icon className="w-4 h-4" />{m.label}
              </button>
            ))}
          </div>
          <div>
            <Label>{mode === 'set' ? 'New Quantity' : mode === 'increase' ? 'Add Quantity' : 'Remove Quantity'}</Label>
            <Input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} placeholder="Enter quantity" />
          </div>
          {qty && !isNaN(Number(qty)) && (
            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">New Stock Will Be:</span>
              <span className="font-bold text-lg">{preview()}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !qty}>
              {mutation.isPending ? 'Updating...' : 'Update Stock'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}