import { useCurrentUser } from '@/lib/useCurrentUser';
import { ROLES } from '@/lib/roleConfig';
import SuperAdminDashboard from './dashboards/SuperAdminDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import HRDashboard from './dashboards/HRDashboard';
import AccountantDashboard from './dashboards/AccountantDashboard';
import InventoryDashboard from './dashboards/InventoryDashboard';
import SalesDashboard from './dashboards/SalesDashboard';
import EmployeeDashboard from './employee/EmployeeDashboard';

// Original full dashboard for admin roles
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatNumber } from '@/lib/formatters';
import { useCurrency } from '@/lib/CurrencyContext';
import SummaryCard from '@/components/shared/SummaryCard';
import PageHeader from '@/components/shared/PageHeader';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import {
  Users, Truck, TrendingUp, Receipt, ShoppingCart,
  DollarSign, Clock, CreditCard, Package, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

function AdminDashboard() {
  const { formatCurrency } = useCurrency();
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list() });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list() });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });

  const totalSales = sales.reduce((s, r) => s + (r.total || 0), 0);
  const totalPurchases = purchases.reduce((s, r) => s + (r.total || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + (r.total || 0), 0);
  const totalProfit = totalSales - totalPurchases - totalExpenses;
  const paidSales = sales.filter(s => s.payment_status === 'paid').reduce((a, s) => a + (s.total || 0), 0);
  const unpaidSales = sales.filter(s => s.payment_status === 'unpaid').reduce((a, s) => a + (s.total || 0), 0);
  const partialSalesAmt = sales.filter(s => s.payment_status === 'partial').reduce((a, s) => a + (s.paid_amount || 0), 0);
  const pendingReceivable = sales.filter(s => s.payment_status !== 'paid').reduce((a, s) => a + ((s.total || 0) - (s.paid_amount || 0)), 0);
  const pendingPayable = purchases.filter(p => p.payment_status !== 'paid').reduce((a, p) => a + ((p.total || 0) - (p.paid_amount || 0)), 0);
  const totalStock = products.reduce((s, p) => s + (p.stock_qty || 0), 0);

  const cards = [
    { title: 'Total Clients', value: formatNumber(clients.length), icon: Users, delay: 0 },
    { title: 'Total Suppliers', value: formatNumber(suppliers.length), icon: Truck, delay: 0.05 },
    { title: 'Total Sales', value: formatCurrency(totalSales), icon: TrendingUp, delay: 0.1 },
    { title: 'Total Expenses', value: formatCurrency(totalExpenses), icon: Receipt, delay: 0.15 },
    { title: 'Total Purchases', value: formatCurrency(totalPurchases), icon: ShoppingCart, delay: 0.2 },
    { title: 'Total Profit', value: formatCurrency(totalProfit), icon: DollarSign, delay: 0.25, trendUp: totalProfit >= 0 },
    { title: 'Receivable', value: formatCurrency(pendingReceivable), icon: Clock, delay: 0.3 },
    { title: 'Payable', value: formatCurrency(pendingPayable), icon: CreditCard, delay: 0.35 },
    { title: 'Product Stock', value: formatNumber(totalStock), icon: Package, delay: 0.4 },
    { title: 'Paid', value: formatCurrency(paidSales + partialSalesAmt), icon: CheckCircle, delay: 0.45 },
    { title: 'Unpaid', value: formatCurrency(unpaidSales), icon: XCircle, delay: 0.5 },
    { title: 'Partial Orders', value: formatNumber(sales.filter(s => s.payment_status === 'partial').length), icon: AlertCircle, delay: 0.55 },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your business performance" />
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        {cards.map(card => <SummaryCard key={card.title} {...card} />)}
      </div>
      <DashboardCharts sales={sales} purchases={purchases} expenses={expenses} products={products} />
    </div>
  );
}

export default function Dashboard() {
  const user = useCurrentUser();
  const role = user?.role;

  // Show loading state while user is being fetched
  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  switch (role) {
    case ROLES.SUPER_ADMIN: return <SuperAdminDashboard />;
    case ROLES.ADMIN: return <AdminDashboard />;
    case ROLES.MANAGER: return <ManagerDashboard />;
    case ROLES.HR_MANAGER: return <HRDashboard />;
    case ROLES.ACCOUNTANT: return <AccountantDashboard />;
    case ROLES.INVENTORY_MANAGER: return <InventoryDashboard />;
    case ROLES.SALES_MANAGER: return <SalesDashboard />;
    case ROLES.EMPLOYEE: return <EmployeeDashboard />;
    default: return <AdminDashboard />;
  }
}