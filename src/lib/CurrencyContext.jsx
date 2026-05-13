import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '@/api/supabaseClient';

const CurrencyContext = createContext({
  symbol: 'Rs',
  currency: 'PKR',
  formatCurrency: (v) => `Rs${Number(v || 0).toFixed(2)}`,
  refreshSettings: () => {},
});

export function CurrencyProvider({ children }) {
  const [symbol, setSymbol] = useState('Rs');
  const [currency, setCurrency] = useState('PKR');

  const loadSettings = useCallback(async () => {
    try {
      const list = await db.CompanySettings.list();
      if (list && list.length > 0) {
        setSymbol(list[0].currency_symbol || 'Rs');
        setCurrency(list[0].currency || 'PKR');
      }
    } catch {}
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const formatCurrency = useCallback((amount) => {
    if (amount == null || isNaN(amount)) return `${symbol}0.00`;
    return `${symbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [symbol]);

  return (
    <CurrencyContext.Provider value={{ symbol, currency, formatCurrency, refreshSettings: loadSettings }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
