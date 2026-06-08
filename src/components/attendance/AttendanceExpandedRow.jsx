import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { MapPin, Navigation } from 'lucide-react';
import AuditInfo from '@/components/shared/AuditInfo';
import { getDistanceMeters } from '@/lib/gpsUtils';

const Field = ({ label, value, className }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{label}</p>
    <p className={cn('text-sm font-medium text-foreground', !value && 'text-muted-foreground')}>{value || '—'}</p>
  </div>
);

const statusColors = {
  present: 'text-emerald-600 border-emerald-200 bg-emerald-50',
  absent: 'text-red-600 border-red-200 bg-red-50',
  late: 'text-amber-600 border-amber-200 bg-amber-50',
  half_day: 'text-blue-600 border-blue-200 bg-blue-50',
  on_leave: 'text-purple-600 border-purple-200 bg-purple-50',
};

export default function AttendanceExpandedRow({ record }) {
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: officeLocations = [] } = useQuery({
    queryKey: ['office-locations'],
    queryFn: () => base44.entities.OfficeLocation.list(),
  });

  const { data: empLocations = [] } = useQuery({
    queryKey: ['employee-locations', record.employee_id],
    queryFn: () => base44.entities.EmployeeLocation.filter({ employee_id: record.employee_id }),
    enabled: !!record.employee_id,
  });

  const employee = employees.find(e => e.id === record.employee_id);

  // Find nearest assigned office location
  const assignedLocationIds = new Set(empLocations.map(l => l.office_location_id));
  const assignedOffices = officeLocations.filter(l => assignedLocationIds.has(l.id));

  let nearestOffice = null;
  let distanceFromOffice = null;
  if (record.check_in_lat && record.check_in_lng && assignedOffices.length > 0) {
    let minDist = Infinity;
    assignedOffices.forEach(loc => {
      const d = getDistanceMeters(record.check_in_lat, record.check_in_lng, loc.latitude, loc.longitude);
      if (d < minDist) { minDist = d; nearestOffice = loc; }
    });
    distanceFromOffice = Math.round(minDist);
  }

  const isGpsVerified = record.check_in_lat && record.check_in_lng;
  const isWithinRadius = nearestOffice && distanceFromOffice !== null && distanceFromOffice <= (nearestOffice.radius_meters || 200);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Employee & date info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3 bg-background rounded-lg border border-border">
        <Field label="Employee" value={record.employee_name} />
        <Field label="Employee ID" value={employee?.employee_id} />
        <Field label="Department" value={employee?.department} />
        <Field label="Date" value={formatDate(record.date)} />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Status</p>
          <Badge variant="outline" className={cn('text-xs capitalize', statusColors[record.status])}>
            {record.status?.replace('_', ' ')}
          </Badge>
        </div>
        <Field label="Designation" value={employee?.designation} />
      </div>

      {/* Time details */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-3 bg-background rounded-lg border border-border">
        <Field label="Check In" value={record.check_in} />
        <Field label="Check Out" value={record.check_out} />
        <Field label="Working Hours" value={record.working_hours ? `${Number(record.working_hours).toFixed(2)}h` : null} />
        <Field label="Overtime Hours" value={record.overtime_hours > 0 ? `${Number(record.overtime_hours).toFixed(2)}h` : null} />
        <Field label="Late Minutes" value={record.late_minutes > 0 ? `${record.late_minutes}m` : null} />
      </div>

      {/* GPS details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-background rounded-lg border border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Navigation className="w-3 h-3" /> GPS Check-In
          </div>
          {isGpsVerified ? (
            <div className="space-y-1">
              <p className="text-xs font-mono text-foreground">
                {Number(record.check_in_lat).toFixed(6)}, {Number(record.check_in_lng).toFixed(6)}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn('text-xs', isWithinRadius ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-red-600 border-red-200 bg-red-50')}>
                  {isWithinRadius ? '✅ Inside radius' : '❌ Outside radius'}
                </Badge>
                {distanceFromOffice !== null && (
                  <span className="text-xs text-muted-foreground">{distanceFromOffice}m from {nearestOffice?.name}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No GPS data recorded</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Navigation className="w-3 h-3" /> GPS Check-Out
          </div>
          {record.check_out_lat && record.check_out_lng ? (
            <p className="text-xs font-mono text-foreground">
              {Number(record.check_out_lat).toFixed(6)}, {Number(record.check_out_lng).toFixed(6)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No GPS data recorded</p>
          )}
        </div>
      </div>

      {/* Assigned offices & notes */}
      <div className="flex flex-col sm:flex-row gap-3">
        {assignedOffices.length > 0 && (
          <div className="flex-1 p-3 bg-background rounded-lg border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Assigned Offices
            </p>
            <div className="flex flex-wrap gap-1.5">
              {assignedOffices.map(o => (
                <Badge key={o.id} variant="outline" className="text-xs">{o.name}</Badge>
              ))}
            </div>
          </div>
        )}
        {record.notes && (
          <div className="flex-1 p-3 bg-background rounded-lg border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Notes</p>
            <p className="text-xs text-foreground">{record.notes}</p>
          </div>
        )}
      </div>

      <AuditInfo record={record} />
    </motion.div>
  );
}