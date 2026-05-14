import { useState } from 'react';
import { supabase, uploadFile } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Mail, Shield, Calendar, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/formatters';

export default function Profile() {
  const { user, profile, displayName, fetchProfile } = useAuth();
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const currentName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const currentAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || '';

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, 'avatars');
      // Update DB only (avoid triggering auth state change loop)
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: file_url })
        .eq('id', user.id);
      if (error) throw error;
      // Refresh profile state directly without triggering auth cycle
      if (user) await fetchProfile(user.id);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    }
    setUploading(false);
  };

  const handleSaveName = async () => {
    if (!editName.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    try {
      // Update DB profile — single operation, no auth metadata update to avoid loops
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: editName.trim() })
        .eq('id', user.id);
      if (error) throw error;
      // Refresh profile state
      if (user) await fetchProfile(user.id);
      setEditing(false);
      toast.success('Name updated');
    } catch (err) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  if (!user) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <PageHeader title="Profile" description="Your personal account information" />

      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCircle className="w-5 h-5" /> Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={currentAvatar} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {currentName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{currentName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <label className="cursor-pointer text-xs text-primary hover:underline">
                    Change photo
                    <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Display Name</Label>
                {editing ? (
                  <div className="flex gap-2 mt-1">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                    <Button size="sm" onClick={handleSaveName} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <Input value={currentName} readOnly className="bg-muted" />
                    {/* <Button size="sm" variant="outline" onClick={() => { setEditName(currentName); setEditing(true); }}>Edit</Button> */}
                  </div>
                )}
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user.email || ''} readOnly className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Role</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium capitalize">Team Member</span>
                </div>
              </div>
              {profile?.created_at && (
                <div>
                  <Label>Member Since</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(profile.created_at)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
