import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Plus, Trash2, Search, Loader2, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EmployeeLocationAssignment({ employee }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: allLocations = [], isLoading: loadingLocs } = useQuery({
    queryKey: ['office-locations'],
    queryFn: () => base44.entities.OfficeLocation.list(),
  });

  const { data: assignments = [], isLoading: loadingAssign } = useQuery({
    queryKey: ['employee-locations', employee.id],
    queryFn: () => base44.entities.EmployeeLocation.filter({ employee_id: employee.id }),
    enabled: !!employee.id,
  });

  const assignMutation = useMutation({
    mutationFn: (loc) => base44.entities.EmployeeLocation.create({
      employee_id: employee.id,
      employee_name: employee.full_name,
      office_location_id: loc.id,
      office_location_name: loc.name,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-locations', employee.id] });
      toast.success('Location assigned');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId) => base44.entities.EmployeeLocation.delete(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-locations', employee.id] });
      toast.success('Location removed');
    },
  });

  const assignedIds = new Set(assignments.map(a => a.office_location_id));

  const filteredLocations = useMemo(() =>
    allLocations.filter(l =>
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.address?.toLowerCase().includes(search.toLowerCase())
    ), [allLocations, search]);

  const isLoading = loadingLocs || loadingAssign;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Allowed GPS Locations</span>
        {assignments.length > 0 && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
            {assignments.length} assigned
          </Badge>
        )}
      </div>

      {/* Assigned badges */}
      {assignments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          {assignments.map(a => (
            <div key={a.id} className="flex items-center gap-1.5 bg-white dark:bg-card border border-emerald-300 dark:border-emerald-700 rounded-full px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              {a.office_location_name}
              <button
                onClick={() => removeMutation.mutate(a.id)}
                className="ml-0.5 text-emerald-400 hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {assignments.length === 0 && !isLoading && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 text-amber-700 text-xs">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          No locations assigned — employee can check in at ANY location
        </div>
      )}

      {/* Search & Add */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search locations to assign…"
          className="pl-8 h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading locations…
          </div>
        )}
        {filteredLocations.map(loc => {
          const isAssigned = assignedIds.has(loc.id);
          return (
            <div key={loc.id} className={cn(
              'flex items-center justify-between p-2.5 rounded-lg border text-sm transition-all',
              isAssigned
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-card border-border hover:border-primary/40'
            )}>
              <div className="flex items-center gap-2 min-w-0">
                {isAssigned
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  : <Circle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="font-medium text-xs truncate">{loc.name}</p>
                  <p className="text-xs text-muted-foreground">{loc.radius_meters || 200}m radius · {loc.shift_start || '09:00'} – {loc.shift_end || '18:00'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <Badge variant="outline" className={cn(
                  'text-xs',
                  loc.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                )}>
                  {loc.status || 'active'}
                </Badge>
                {!isAssigned ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => assignMutation.mutate(loc)}
                    disabled={assignMutation.isPending}
                  >
                    <Plus className="w-3 h-3 mr-1" />Assign
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      const assignment = assignments.find(a => a.office_location_id === loc.id);
                      if (assignment) removeMutation.mutate(assignment.id);
                    }}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {!isLoading && filteredLocations.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-3">No matching locations found</p>
        )}
      </div>
    </div>
  );
}