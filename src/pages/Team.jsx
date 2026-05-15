import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, uploadFile } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { formatDate } from '@/lib/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserCheck, UserPlus, Search, ChevronDown, ChevronUp,
  Mail, Calendar, Pencil, Trash2, Shield, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';

function getMemberInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getDaysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

// Avatar-only edit dialog — name editing removed to prevent data conflicts
function EditAvatarDialog({ member, open, onClose, onSaved }) {
  const [avatarUrl, setAvatarUrl] = useState(member?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, 'avatars');
      setAvatarUrl(file_url);
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', member.id);
      if (error) throw error;
      toast.success('Profile photo updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const displayName = member?.full_name || member?.email?.split('@')[0] || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Profile Photo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getMemberInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <label className="cursor-pointer text-xs text-primary hover:underline flex items-center gap-1">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {uploading ? 'Uploading...' : 'Change photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={displayName} readOnly className="mt-1 bg-muted" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={member?.email || ''} readOnly className="mt-1 bg-muted" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploading} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Photo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberCard({ member, currentUserId, onEdit, onDelete, expanded, onToggle }) {
  const days = getDaysSince(member.created_at);
  const isRecent = days !== null && days <= 7;
  const isCurrentUser = member.id === currentUserId;

  // Stable display name with email fallback — never blank
  const displayName = member.full_name || member.email?.split('@')[0] || 'Unknown User';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        <Avatar className="w-11 h-11 flex-shrink-0">
          <AvatarImage src={member.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {getMemberInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">
              {displayName}
            </p>
            {isCurrentUser && (
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">You</span>
            )}
            {isRecent && (
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">New</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); onEdit(member); }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {!isCurrentUser && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onDelete(member.id); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <div className="text-muted-foreground ml-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border bg-muted/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </p>
                  <p className="font-medium text-xs mt-0.5 break-all">{member.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Role
                  </p>
                  <p className="font-medium text-xs mt-0.5 capitalize">{member.role || 'Team Member'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Joined
                  </p>
                  <p className="font-medium text-xs mt-0.5">{formatDate(member.created_at)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Team() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, avatar_url, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000, // don't re-fetch for 30s
  });

  // const deleteMut = useMutation({
  //   mutationFn: async (id) => {
  //     const { error } = await supabase.from('user_profiles').delete().eq('id', id);
  //     if (error) throw error;
  //   },
  //   onSuccess: () => {
  //     // Optimistically update cache instead of full refetch
  //     qc.setQueryData(['user_profiles'], (old) =>
  //       (old || []).filter((m) => m.id !== deleteId)
  //     );
  //     toast.success('Member removed');
  //     setDeleteId(null);
  //   },
  //   onError: (err) => toast.error(err.message),
  // });



const deleteMut = useMutation({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // return deleted id
    return id;
  },

  onSuccess: (deletedId) => {
    qc.setQueryData(['user_profiles'], (old) =>
      (old || []).filter((m) => m.id !== deletedId)
    );

    toast.success('Member removed');
    setDeleteId(null);
  },

  onError: (err) => {
    toast.error(err.message);
  },
});


  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  });

  const recentMembers = members.filter(m => {
    const d = getDaysSince(m.created_at);
    return d !== null && d <= 7;
  }).length;

  return (
    <div>
      <PageHeader title="Team" description="Manage your team members" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <SummaryCard title="Total Members" value={members.length} icon={Users} />
        <SummaryCard title="Active Users" value={members.length} icon={UserCheck} delay={0.05} />
        <SummaryCard title="Recently Joined" value={recentMembers} icon={UserPlus} delay={0.1} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {filtered.length} of {members.length}
        </p>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No members found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              currentUserId={user?.id}
              expanded={expandedId === member.id}
              onToggle={() => setExpandedId(expandedId === member.id ? null : member.id)}
              onEdit={setEditingMember}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {editingMember && (
        <EditAvatarDialog
          member={editingMember}
          open={!!editingMember}
          onClose={() => setEditingMember(null)}
          // onSaved={() => qc.invalidateQueries({ queryKey: ['user_profiles'] })}
          onSaved={() => }
        />
      )}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        title="Remove Team Member"
        description="This will remove the member's profile. Their created records will remain."
      />
    </div>
  );
}
