import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/CurrencyContext';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, Download, Printer, Eye } from 'lucide-react';
import SummaryCard from '@/components/shared/SummaryCard';
import { downloadPayslipPDF, printPayslip } from '@/components/payroll/PayslipPDF';
import { toast } from 'sonner';

export default function MyPayroll() {
  const { formatCurrency } = useCurrency();
  const user = useCurrentUser();
  const [myEmployee, setMyEmployee] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  useEffect(() => {
    if (user && employees.length > 0) {
      const emp = employees.find(e => e.email === user.email);
      setMyEmployee(emp || null);
    }
  }, [user, employees]);

  // Primary: filter by employee_email (matches RLS rule)
  const { data: payrollsByEmail = [], isLoading } = useQuery({
    queryKey: ['my-payrolls-email', user?.email],
    queryFn: () => base44.entities.Payroll.filter({ employee_email: user?.email }, '-month', 36),
    enabled: !!user?.email,
  });

  // Fallback: filter by employee_id if we have it
  const { data: payrollsById = [] } = useQuery({
    queryKey: ['my-payrolls-id', myEmployee?.id],
    queryFn: () => base44.entities.Payroll.filter({ employee_id: myEmployee?.id }, '-month', 36),
    enabled: !!myEmployee?.id,
  });

  // Merge and deduplicate
  const payrolls = (() => {
    const map = new Map();
    [...payrollsByEmail, ...payrollsById].forEach(p => map.set(p.id, p));
    return Array.from(map.values()).sort((a, b) => (b.month > a.month ? 1 : -1));
  })();

  const { data: companySettingsList = [] } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });
  const companySettings = companySettingsList[0] || {};

  const thisMonth = new Date().toISOString().slice(0, 7);
  const currentPayroll = payrolls.find(p => p.month === thisMonth);
  const totalPaid = payrolls.filter(p => p.payment_status === 'paid').reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalOT = payrolls.reduce((s, p) => s + (p.overtime_amount || p.overtime_pay || 0), 0);

  const handleDownload = (payroll) => {
    toast.success('Generating payslip PDF...');
    downloadPayslipPDF(payroll, companySettings);
  };

  const handlePrint = (payroll) => {
    printPayslip(payroll, companySettings);
  };

  if (!user) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div>
      <PageHeader title="My Payroll" description="Salary slips, earnings history and deductions" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Current Month" value={currentPayroll ? formatCurrency(currentPayroll.net_salary) : '—'} icon={DollarSign} delay={0} />
        <SummaryCard title="Total Earned (Paid)" value={formatCurrency(totalPaid)} icon={TrendingUp} delay={0.05} />
        <SummaryCard title="Total Overtime Paid" value={formatCurrency(totalOT)} icon={Clock} delay={0.1} />
        <SummaryCard title="Total Payslips" value={payrolls.length} icon={DollarSign} delay={0.15} />
      </div>

      {/* Current Month Highlight */}
      {currentPayroll && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-primary/10 to-card rounded-xl border border-primary/30 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">This Month — {currentPayroll.month}</h3>
              <Badge variant="outline" className={cn('mt-1 text-xs',
                currentPayroll.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              )}>{currentPayroll.payment_status}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handlePrint(currentPayroll)}>
                <Printer className="w-3.5 h-3.5 mr-1" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload(currentPayroll)}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Basic Salary', value: formatCurrency(currentPayroll.basic_salary), color: '' },
              { label: 'Overtime Pay', value: `+${formatCurrency(currentPayroll.overtime_amount || currentPayroll.overtime_pay || 0)}`, color: 'text-emerald-600' },
              { label: 'Deductions', value: `-${formatCurrency((currentPayroll.deductions || 0) + (currentPayroll.late_deduction || 0) + (currentPayroll.leave_deduction || 0))}`, color: 'text-red-600' },
              { label: 'Net Salary', value: formatCurrency(currentPayroll.net_salary), color: 'text-primary', highlight: true },
            ].map(s => (
              <div key={s.label} className={cn('p-3 rounded-lg border text-center', s.highlight ? 'bg-primary/10 border-primary/30' : 'bg-card border-border')}>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn('text-lg font-bold mt-1', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-5 gap-3 text-center">
            {[
              { label: 'Total Days', val: currentPayroll.total_days || 0 },
              { label: 'Present', val: currentPayroll.present_days || 0 },
              { label: 'Absent', val: currentPayroll.absent_days || 0 },
              { label: 'Late', val: currentPayroll.late_days || 0 },
              { label: 'OT Hours', val: `${currentPayroll.overtime_hours || 0}h` },
            ].map(s => (
              <div key={s.label}>
                <p className="text-xl font-bold">{s.val}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Payroll History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-semibold text-sm mb-4">Payroll History</h3>
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-6">Loading payroll records…</p>}
          {payrolls.map(p => (
            <div key={p.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 rounded-lg px-2 transition-colors">
              <div className="flex-1">
                <p className="font-medium text-sm">{p.month}</p>
                <p className="text-xs text-muted-foreground">
                  {p.present_days || 0} present · {p.overtime_hours || 0}h OT ·
                  Deductions: {formatCurrency((p.deductions || 0) + (p.late_deduction || 0) + (p.leave_deduction || 0))}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold text-sm">{formatCurrency(p.net_salary)}</p>
                  <Badge variant="outline" className={cn('text-xs',
                    p.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}>{p.payment_status}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="View / Print" onClick={() => handlePrint(p)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Download PDF" onClick={() => handleDownload(p)}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && payrolls.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No payroll records found for your account.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}