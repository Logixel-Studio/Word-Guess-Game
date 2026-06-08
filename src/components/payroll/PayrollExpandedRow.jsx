import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/lib/CurrencyContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Printer, Download, Eye, User, Calendar, BarChart2, FileText } from 'lucide-react';
import { downloadPayslipPDF, printPayslip } from './PayslipPDF';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function InfoRow({ label, value, valueClass }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-semibold', valueClass)}>{value}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-muted/30 rounded-xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function PayrollExpandedRow({ row }) {
  const { formatCurrency } = useCurrency();

  const { data: companySettingsList = [] } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });
  const companySettings = companySettingsList[0] || {};

  const handleDownload = async () => {
    toast.success('Generating payslip PDF...');
    downloadPayslipPDF(row, companySettings);
  };

  const handlePrint = () => {
    printPayslip(row, companySettings);
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Employee Info */}
        <Section icon={User} title="Employee Information">
          <InfoRow label="Name" value={row.employee_name || '—'} />
          <InfoRow label="Department" value={row.employee_department || '—'} />
          <InfoRow label="Role" value={row.employee_role || '—'} />
          <InfoRow label="Email" value={row.employee_email || '—'} />
        </Section>

        {/* Attendance Summary */}
        <Section icon={BarChart2} title="Attendance Summary">
          <InfoRow label="Total Days" value={row.total_days || 0} />
          <InfoRow label="Present Days" value={row.present_days || 0} valueClass="text-emerald-600" />
          <InfoRow label="Absent Days" value={row.absent_days || 0} valueClass="text-red-500" />
          <InfoRow label="Late Days" value={row.late_days || 0} valueClass="text-amber-600" />
          <InfoRow label="Late Minutes" value={`${row.late_minutes || 0} min`} />
          <InfoRow label="Overtime Hours" value={`${row.overtime_hours || 0}h`} valueClass="text-blue-600" />
        </Section>

        {/* Payroll Breakdown */}
        <Section icon={FileText} title="Payroll Breakdown">
          <InfoRow label="Basic Salary" value={formatCurrency(row.basic_salary || 0)} />
          <InfoRow label="Overtime Amount" value={formatCurrency(row.overtime_amount || row.overtime_pay || 0)} valueClass="text-blue-600" />
          <InfoRow label="Bonus" value={formatCurrency(row.bonus_amount || row.bonus || 0)} valueClass="text-emerald-600" />
          <InfoRow label="Late Deduction" value={`-${formatCurrency(row.late_deduction || 0)}`} valueClass="text-red-500" />
          <InfoRow label="Leave Deduction" value={`-${formatCurrency(row.leave_deduction || 0)}`} valueClass="text-red-500" />
          <InfoRow label="Other Deductions" value={`-${formatCurrency(row.deductions || 0)}`} valueClass="text-red-500" />
          <InfoRow label="Gross Salary" value={formatCurrency(row.gross_salary || 0)} valueClass="text-emerald-700" />
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-border/50">
            <span className="text-xs font-bold">Net Salary</span>
            <Badge className="bg-primary text-primary-foreground text-sm px-3">{formatCurrency(row.net_salary || 0)}</Badge>
          </div>
        </Section>

        {/* Audit + Actions */}
        <div className="space-y-3">
          <Section icon={Calendar} title="Audit Information">
            <InfoRow label="Created By" value={row.created_by_name || '—'} />
            <InfoRow label="Created At" value={row.created_date ? new Date(row.created_date).toLocaleDateString() : '—'} />
            <InfoRow label="Updated At" value={row.updated_date ? new Date(row.updated_date).toLocaleDateString() : '—'} />
            <InfoRow label="Payment Status" value={
              <Badge variant="outline" className={cn('text-xs', row.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                {row.payment_status === 'paid' ? 'Paid' : 'Pending'}
              </Badge>
            } />
            {row.paid_date && <InfoRow label="Paid Date" value={row.paid_date} />}
          </Section>

          <div className="bg-muted/30 rounded-xl border border-border/50 p-4 space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-2">Payslip Actions</span>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={handlePrint}>
              <Eye className="w-3.5 h-3.5 mr-2" />View / Print Payslip
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-primary border-primary/40 hover:bg-primary/5" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-2" />Download PDF
            </Button>
          </div>
        </div>
      </div>

      {row.notes && (
        <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
          <span className="font-semibold">Notes: </span>{row.notes}
        </div>
      )}
    </div>
  );
}