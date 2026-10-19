'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { useLanguage } from '../../context/language-context';
import { apiClient } from '../../lib/api';
import { Globe, Building2, LogOut } from 'lucide-react';

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

export function Header() {
  const { user, activeBranchId, setActiveBranchId, logout } = useAuth();
  const { locale, toggleLocale, t } = useLanguage();
  const [branches, setBranches] = useState<BranchOption[]>([]);

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await apiClient<{ branches: BranchOption[] }>('/organizations/branches');
        setBranches(res.branches || []);
        if (!activeBranchId && res.branches?.length > 0) {
          setActiveBranchId(res.branches[0].id);
        }
      } catch (e) {
        // Fallback to user branch
        if (user?.branch) {
          setBranches([user.branch]);
        }
      }
    }
    loadBranches();
  }, [user, activeBranchId, setActiveBranchId]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
      {/* Branch Selector */}
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-slate-500" />
        <select
          value={activeBranchId || ''}
          onChange={(e) => setActiveBranchId(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg px-3 py-1.5 focus:ring-sky-500 focus:border-sky-500"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {/* Language Toggle & Actions */}
      <div className="flex items-center gap-4">
        {/* Language Switcher Pill */}
        <button
          onClick={toggleLocale}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-300 hover:bg-slate-100 transition-colors text-slate-700 shadow-sm"
          title="Switch Language / ቋንቋ ቀይር"
        >
          <Globe className="w-3.5 h-3.5 text-sky-600" />
          <span>{locale === 'en' ? 'English (EN)' : 'አማርኛ (AM)'}</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.navigation.logout}</span>
        </button>
      </div>
    </header>
  );
}
