import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Wifi, WifiOff, AlertCircle, Activity, Zap, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import SummaryCard from '@/components/shared/SummaryCard';
import { findAllowedLocation, checkLateStatus, calcWorkingHours, calcOvertimeHours } from '@/lib/gpsUtils';

const statusStyle = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  half_day: 'bg-blue-50 text-blue-700 border-blue-200',
  on_leave: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function MyAttendance() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const [myEmployee, setMyEmployee] = useState(null);
  const [position, setPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [locating, setLocating] = useState(false);

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });
  useEffect(() => {
    if (user && employees.length > 0) {
      // Match by email first (most reliable), then by name as fallback
      const emp = employees.find(e => e.email === user.email) 
        || employees.find(e => e.full_name === user.full_name);
      setMyEmployee(emp || null);
    }
  }, [user, employees]);

  // empId = the DB UUID of the employee record — used as employee_id in Attendance
  const empId = myEmployee?.id;

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['my-attendance', empId],
    queryFn: () => base44.entities.Attendance.filter({ employee_id: empId }, '-date', 200),
    enabled: !!empId,
  });

  // Fetch ALL office locations
  const { data: allOfficeLocations = [] } = useQuery({
    queryKey: ['office-locations'],
    queryFn: () => base44.entities.OfficeLocation.list(),
  });

  // Fetch this employee's assigned locations
  const { data: assignments = [] } = useQuery({
    queryKey: ['employee-locations', empId],
    queryFn: () => base44.entities.EmployeeLocation.filter({ employee_id: empId }),
    enabled: !!empId,
  });

  // Resolve the locations this employee is allowed to use
  const assignedLocationIds = new Set(assignments.map(a => a.office_location_id));
  const allowedOfficeLocations = assignments.length > 0
    ? allOfficeLocations.filter(l => assignedLocationIds.has(l.id))
    : allOfficeLocations; // if no assignments → allow all (fallback)

  const allowedLocation = position && allowedOfficeLocations.length > 0
    ? findAllowedLocation(position.latitude, position.longitude, allowedOfficeLocations)
    : allowedOfficeLocations.length === 0 && allOfficeLocations.length === 0 ? { noRestriction: true } : null;
  const isInsideRadius = allowedLocation?.noRestriction || !!allowedLocation;

  // Status message for radius validation
  const getRadiusMessage = () => {
    if (!position) return null;
    if (allowedLocation?.noRestriction) return null;
    if (allowedOfficeLocations.length === 0 && allOfficeLocations.length > 0) {
      return { ok: false, msg: '⚠️ No GPS locations assigned to you. Contact your admin.' };
    }
    if (isInsideRadius) {
      return { ok: true, msg: `✅ Inside: ${allowedLocation?.location?.name} (${allowedLocation?.distance}m away)` };
    }
    return { ok: false, msg: '❌ You are outside all your assigned office locations. Move inside to mark attendance.' };
  };
  const radiusStatus = getRadiusMessage();

  const getLocation = () => {
    setLocating(true); setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      pos => { setPosition(pos.coords); setLocating(false); },
      () => { setGpsError('GPS unavailable'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  useEffect(() => { if (empId) getLocation(); }, [empId]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!empId) throw new Error('Employee record not found. Contact admin to link your account.');
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 5);
      const todayStr = now.toISOString().slice(0, 10);
      // Check for duplicate check-in today
      const existing = await base44.entities.Attendance.filter({ employee_id: empId, date: todayStr });
      if (existing && existing.length > 0) {
        throw new Error('Attendance already marked for today');
      }
      const loc = allowedLocation?.noRestriction ? null : allowedLocation?.location;
      const shiftStart = myEmployee?.shift_start || loc?.shift_start;
      const graceMins = myEmployee?.grace_minutes ?? loc?.grace_minutes ?? 15;
      const { isLate, lateMinutes } = checkLateStatus(timeStr, shiftStart, graceMins);
      return base44.entities.Attendance.create({
        employee_id: empId,
        employee_name: myEmployee?.full_name || user?.full_name,
        date: todayStr,
        check_in: timeStr,
        check_in_lat: position?.latitude,
        check_in_lng: position?.longitude,
        status: isLate ? 'late' : 'present',
        late_minutes: lateMinutes,
        notes: loc ? `Checked in at ${loc.name}` : undefined,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-attendance', empId] }); toast.success('Checked in successfully!'); },
    onError: (err) => { toast.error(err.message || 'Check-in failed'); },
  });

  const checkOutMutation = useMutation({
    mutationFn: (record) => {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 5);
      const loc = allowedLocation?.noRestriction ? null : allowedLocation?.location;
      const shiftEnd = myEmployee?.shift_end || loc?.shift_end;
      const workingHours = calcWorkingHours(record.check_in, timeStr);
      const overtimeHours = calcOvertimeHours(timeStr, shiftEnd);
      return base44.entities.Attendance.update(record.id, {
        check_out: timeStr,
        check_out_lat: position?.latitude,
        check_out_lng: position?.longitude,
        working_hours: workingHours.toFixed(2),
        overtime_hours: overtimeHours.toFixed(2),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-attendance', empId] }); toast.success('Checked out!'); },
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance.find(a => a.date === today);
  const thisMonth = today.slice(0, 7);
  const monthAtt = attendance.filter(a => a.date?.startsWith(thisMonth));
  const presentDays = monthAtt.filter(a => ['present', 'late'].includes(a.status)).length;
  const lateDays = monthAtt.filter(a => a.status === 'late').length;
  const totalOT = monthAtt.reduce((s, a) => s + (a.overtime_hours || 0), 0);
  const totalHours = monthAtt.reduce((s, a) => s + (Number(a.working_hours) || 0), 0);

  return (
    <div>
      <PageHeader title="My Attendance" description="GPS-verified attendance records and history" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Present (Month)" value={presentDays} icon={Activity} delay={0} />
        <SummaryCard title="Late Days" value={lateDays} icon={Clock} delay={0.05} />
        <SummaryCard title="OT Hours" value={totalOT.toFixed(1) + 'h'} icon={Zap} delay={0.1} />
        <SummaryCard title="Total Hours" value={totalHours.toFixed(1) + 'h'} icon={Clock} delay={0.15} />
      </div>

      {/* Today's GPS Check-in */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-primary/10 to-card rounded-xl border border-primary/30 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Today — {today}</h3>
            {position && <p className="text-xs text-muted-foreground mt-1">GPS: {position.latitude?.toFixed(5)}, {position.longitude?.toFixed(5)} · ±{Math.round(position.accuracy || 0)}m</p>}
            {gpsError && <p className="text-xs text-red-600 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{gpsError}</p>}
          </div>
          <div className="flex items-center gap-2">
            {position ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"><Wifi className="w-3 h-3 mr-1" />GPS Ready</Badge>
              : <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs"><WifiOff className="w-3 h-3 mr-1" />No GPS</Badge>}
            <Button variant="outline" size="sm" onClick={getLocation} disabled={locating}>{locating ? '…' : '🔄'}</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-card rounded-xl border border-border">
            <p className="text-xs text-muted-foreground mb-1">Check In Time</p>
            <p className="text-2xl font-bold text-emerald-600">{todayAtt?.check_in || '—:—'}</p>
            {todayAtt?.check_in_lat && <p className="text-xs text-emerald-600 mt-1">📍 GPS Verified</p>}
          </div>
          <div className="text-center p-4 bg-card rounded-xl border border-border">
            <p className="text-xs text-muted-foreground mb-1">Check Out Time</p>
            <p className="text-2xl font-bold">{todayAtt?.check_out || '—:—'}</p>
            {todayAtt?.check_out_lat && <p className="text-xs text-emerald-600 mt-1">📍 GPS Verified</p>}
          </div>
          <div className="text-center p-4 bg-card rounded-xl border border-border">
            <p className="text-xs text-muted-foreground mb-1">Working Hours</p>
            <p className="text-2xl font-bold text-primary">{todayAtt?.working_hours ? `${Number(todayAtt.working_hours).toFixed(1)}h` : '—'}</p>
            {todayAtt?.status && <p className={cn('text-xs mt-1 capitalize font-medium', todayAtt.status === 'late' ? 'text-amber-600' : 'text-emerald-600')}>{todayAtt.status}</p>}
          </div>
        </div>

        {/* Radius validation message */}
        {radiusStatus && (
          <div className={cn('text-xs mb-3 px-3 py-2 rounded-lg flex items-center gap-2',
            radiusStatus.ok
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          )}>
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {radiusStatus.msg}
          </div>
        )}

        {/* Assigned locations list */}
        {assignments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {assignments.map(a => (
              <Badge key={a.id} variant="outline" className="text-xs bg-card">
                <MapPin className="w-2.5 h-2.5 mr-1" />{a.office_location_name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {!todayAtt?.check_in && (
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11" disabled={!position || !isInsideRadius || checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}>
              <MapPin className="w-4 h-4 mr-2" />{checkInMutation.isPending ? 'Recording…' : 'Check In with GPS'}
            </Button>
          )}
          {todayAtt?.check_in && !todayAtt?.check_out && (
            <Button variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-11"
              disabled={checkOutMutation.isPending} onClick={() => checkOutMutation.mutate(todayAtt)}>
              <MapPin className="w-4 h-4 mr-2" />{checkOutMutation.isPending ? 'Recording…' : 'Check Out with GPS'}
            </Button>
          )}
          {todayAtt?.check_in && todayAtt?.check_out && (
            <div className="flex-1 h-11 flex items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-sm">
              ✅ Attendance recorded for today
            </div>
          )}
        </div>
      </motion.div>

      {/* Attendance History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-semibold text-sm mb-4">Attendance History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {['Date', 'Check In', 'Check Out', 'Hours', 'OT', 'Late Min', 'Status', 'GPS'].map(h => (
                  <th key={h} className="pb-2 font-medium text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
              )}
              {attendance.map(a => (
                <tr key={a.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 font-medium">{formatDate(a.date)}</td>
                  <td className="py-2.5">{a.check_in || '—'}</td>
                  <td className="py-2.5">{a.check_out || '—'}</td>
                  <td className="py-2.5">{a.working_hours ? `${Number(a.working_hours).toFixed(1)}h` : '—'}</td>
                  <td className="py-2.5">{a.overtime_hours ? `${Number(a.overtime_hours).toFixed(1)}h` : '—'}</td>
                  <td className="py-2.5">{a.late_minutes ? `${a.late_minutes}m` : '—'}</td>
                  <td className="py-2.5">
                    <Badge variant="outline" className={cn('text-xs capitalize', statusStyle[a.status] || '')}>{a.status?.replace('_', ' ')}</Badge>
                  </td>
                  <td className="py-2.5 text-xs">{a.check_in_lat ? <span className="text-emerald-600">📍 Yes</span> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
              {!isLoading && attendance.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">No attendance records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}