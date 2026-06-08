import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { MapPin, Plus, Trash2, Edit2, Navigation, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const emptyForm = { name: '', address: '', latitude: '', longitude: '', radius_meters: 200, shift_start: '09:00', shift_end: '18:00', grace_minutes: 15, status: 'active' };

export default function OfficeLocations() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [locating, setLocating] = useState(false);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['office-locations'],
    queryFn: () => base44.entities.OfficeLocation.list(),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), radius_meters: parseInt(form.radius_meters), grace_minutes: parseInt(form.grace_minutes) };
      return editing ? base44.entities.OfficeLocation.update(editing.id, data) : base44.entities.OfficeLocation.create(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['office-locations'] }); toast.success(editing ? 'Location updated' : 'Location added'); setShowForm(false); setEditing(null); setForm(emptyForm); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OfficeLocation.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['office-locations'] }); toast.success('Location deleted'); },
  });

  const openEdit = (loc) => { setEditing(loc); setForm({ ...loc }); setShowForm(true); };

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setLocating(false);
        toast.success('Location detected!');
      },
      () => { toast.error('GPS unavailable'); setLocating(false); },
      { enableHighAccuracy: true }
    );
  };

  const activeLocations = locations.filter(l => l.status === 'active').length;

  return (
    <div>
      <PageHeader title="Office Locations" description="GPS-based office locations for attendance verification">
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Location
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Total Locations" value={locations.length} icon={MapPin} delay={0} />
        <SummaryCard title="Active" value={activeLocations} icon={CheckCircle} delay={0.05} />
        <SummaryCard title="Default Radius" value="200m" icon={Navigation} delay={0.1} />
        <SummaryCard title="Inactive" value={locations.length - activeLocations} icon={MapPin} delay={0.15} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && [...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse h-48" />
        ))}
        {locations.map((loc, i) => (
          <motion.div key={loc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10"><MapPin className="w-4 h-4 text-primary" /></div>
                <div>
                  <h3 className="font-semibold">{loc.name}</h3>
                  {loc.address && <p className="text-xs text-muted-foreground">{loc.address}</p>}
                </div>
              </div>
              <Badge variant="outline" className={cn('text-xs', loc.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200')}>
                {loc.status}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Navigation className="w-3 h-3" />
                <span>GPS: {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>Radius: {loc.radius_meters}m</span>
              </div>
              {loc.shift_start && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Shift: {loc.shift_start} – {loc.shift_end} · Grace: {loc.grace_minutes}min</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => openEdit(loc)}>
                <Edit2 className="w-3 h-3 mr-1" />Edit
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 hover:bg-red-50" onClick={() => deleteMutation.mutate(loc.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}

        {!isLoading && locations.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No office locations added yet</p>
            <p className="text-sm mt-1">Add your office GPS coordinates to enable attendance verification</p>
          </div>
        )}
      </div>

      {showForm && (
        <Dialog open onOpenChange={() => { setShowForm(false); setEditing(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Edit Location' : 'Add Office Location'}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Location Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Head Office, Branch A" /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Latitude *</Label><Input type="number" step="0.000001" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="e.g. 24.8607" /></div>
                <div><Label>Longitude *</Label><Input type="number" step="0.000001" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="e.g. 67.0011" /></div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={detectLocation} disabled={locating}>
                <Navigation className="w-4 h-4 mr-1" />
                {locating ? 'Detecting GPS…' : 'Auto-Detect My Location'}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Shift Start</Label><Input type="time" value={form.shift_start} onChange={e => setForm(f => ({ ...f, shift_start: e.target.value }))} /></div>
                <div><Label>Shift End</Label><Input type="time" value={form.shift_end} onChange={e => setForm(f => ({ ...f, shift_end: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Allowed Radius (meters)</Label><Input type="number" value={form.radius_meters} onChange={e => setForm(f => ({ ...f, radius_meters: e.target.value }))} /></div>
                <div><Label>Grace Period (minutes)</Label><Input type="number" value={form.grace_minutes} onChange={e => setForm(f => ({ ...f, grace_minutes: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button disabled={!form.name || !form.latitude || !form.longitude || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add Location'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}