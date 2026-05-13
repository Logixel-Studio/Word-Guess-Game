import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, uploadFile } from '@/api/supabaseClient';
import { useCurrency } from '@/lib/CurrencyContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/lib/useTheme';
import { toast } from 'sonner';
import { Building2, Palette, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { refreshSettings } = useCurrency();
  const { data: settingsList = [] } = useQuery({ queryKey: ['settings'], queryFn: () => db.CompanySettings.list() });
  const settings = settingsList[0] || {};

  const [form, setForm] = useState({
    company_name: 'NUTRIMETH', currency: 'PKR', currency_symbol: 'Rs',
    tax_rate: 0, address: '', phone: '', email: ''
  });

  useEffect(() => {
    if (settings.id) {
      setForm({
        company_name: settings.company_name || 'NUTRIMETH',
        currency: settings.currency || 'PKR',
        currency_symbol: settings.currency_symbol || 'Rs',
        tax_rate: settings.tax_rate || 0,
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
      });
    }
  }, [settings.id]);

  const saveMut = useMutation({
    mutationFn: (data) => settings.id
      ? db.CompanySettings.update(settings.id, data)
      : db.CompanySettings.create(data),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      await refreshSettings(); // Update global currency context immediately
      toast.success('Settings saved — currency updated across app');
    }
  });

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await uploadFile(file, 'logos');
    saveMut.mutate({ ...form, logo_url: file_url });
  };

  const currencyPresets = [
    { currency: 'PKR', symbol: 'Rs' },
    { currency: 'USD', symbol: '$' },
    { currency: 'EUR', symbol: '€' },
    { currency: 'GBP', symbol: '£' },
    { currency: 'INR', symbol: '₹' },
    { currency: 'AED', symbol: 'AED' },
  ];

  const handleCurrencyChange = (curr) => {
    const preset = currencyPresets.find(p => p.currency === curr);
    setForm(f => ({ ...f, currency: curr, currency_symbol: preset?.symbol || f.currency_symbol }));
  };

  return (
    <div>
      <PageHeader title="Settings" description="Configure your business settings" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-5 h-5" /> Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Company Name</Label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div>
                <Label>Company Logo</Label>
                <Input type="file" accept="image/*" onChange={handleUploadLogo} className="mt-1" />
                {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="mt-2 h-12 rounded object-contain" />}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Globe className="w-5 h-5" /> Currency & Tax</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencyPresets.map(p => (
                      <SelectItem key={p.currency} value={p.currency}>{p.currency} ({p.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency Symbol</Label>
                <Input value={form.currency_symbol} onChange={e => setForm({ ...form, currency_symbol: e.target.value })} placeholder="e.g. Rs, $, €" />
                <p className="text-xs text-muted-foreground mt-1">Preview: {form.currency_symbol}1,000.00</p>
              </div>
              <div><Label>Tax Rate (%)</Label><Input type="number" step="0.1" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: Number(e.target.value) })} /></div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Palette className="w-5 h-5" /> Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light Mode</SelectItem>
                    <SelectItem value="dark">Dark Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} size="lg">
          {saveMut.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}