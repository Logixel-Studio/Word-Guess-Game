import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle } from 'lucide-react';

export default function CreatorFilter({ value, onChange }) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className="flex items-center gap-2">
      <UserCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Select value={value || 'all'} onValueChange={v => onChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-44 h-9 text-sm">
          <SelectValue placeholder="All creators" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Team Members</SelectItem>
          {profiles.map(p => (
            <SelectItem key={p.id} value={p.full_name || p.email}>
              {p.full_name || p.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
