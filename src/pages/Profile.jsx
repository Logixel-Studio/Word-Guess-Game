import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { auth as supabaseAuth } from '@/api/supabaseAdapter';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Mail, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Profile() {
  const { user, checkUserAuth } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('nutrimeth-files')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('nutrimeth-files')
        .getPublicUrl(path);

      // Update profile row
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setAvatarUrl(publicUrl);
      supabaseAuth.clearCache();
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!user) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <PageHeader title="Profile" description="Your account information" />
      <div className="max-w-2xl mx-auto space-y-6">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCircle className="w-5 h-5" /> Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{user.full_name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Label htmlFor="avatar-upload"
                      className="cursor-pointer text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition flex items-center gap-1">
                      {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
                      {uploading ? 'Uploading...' : 'Change Photo'}
                    </Label>
                    <Input id="avatar-upload" type="file" accept="image/*" onChange={handleUpload}
                      className="hidden" disabled={uploading} />
                  </div>
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
              <div><Label>Full Name</Label><Input value={user.full_name || ''} readOnly className="bg-muted" /></div>
              <div><Label>Email</Label><Input value={user.email || ''} readOnly className="bg-muted" /></div>
              <div>
                <Label>Role</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium capitalize">{user.role?.replace(/_/g, ' ') || 'user'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
