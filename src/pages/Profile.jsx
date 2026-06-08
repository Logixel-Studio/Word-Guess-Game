import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setAvatarUrl(u?.avatar_url || '');
    }).catch(() => {});
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
    await base44.auth.updateMe({ avatar_url: file_url });
    toast.success('Profile photo updated');
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
              <CardTitle className="flex items-center gap-2"><UserCircle className="w-5 h-5" /> Profile</CardTitle>
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
                  <Input type="file" accept="image/*" onChange={handleUpload} className="mt-2 w-auto" />
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
                  <span className="text-sm font-medium capitalize">{user.role || 'user'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}