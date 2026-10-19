'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../lib/api';
import { Globe, Utensils, Clock, ChevronRight } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  nameAmharic?: string;
  description?: string;
  descriptionAmharic?: string;
  price: string;
  preparationMinutes: number;
}

interface MenuCategory {
  id: string;
  name: string;
  nameAmharic?: string;
  menuItems: MenuItem[];
}

interface PublicMenuResponse {
  branch: {
    id: string;
    name: string;
    organizationName: string;
    currency: string;
  };
  categories: MenuCategory[];
}

export default function PublicMenuPage() {
  const params = useParams();
  const branchId = params?.branchId as string;
  const [data, setData] = useState<PublicMenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    async function fetchMenu() {
      if (!branchId) return;
      try {
        setLoading(true);
        const res = await apiClient<PublicMenuResponse>(`/restaurants/public/menu/${branchId}`);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, [branchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Loading menu... / ሜኑ በመጫን ላይ...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <Utensils className="w-12 h-12 text-slate-500 mb-3" />
        <h1 className="text-lg font-bold">Menu Not Available</h1>
        <p className="text-xs text-slate-400 mt-1">{error || 'This branch could not be found.'}</p>
      </div>
    );
  }

  const allItems = data.categories.flatMap((c) => c.menuItems);
  const displayedItems =
    selectedCategory === 'ALL'
      ? allItems
      : data.categories.find((c) => c.id === selectedCategory)?.menuItems || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Venue Header */}
      <div className="bg-slate-900 text-white px-6 pt-10 pb-8 rounded-b-3xl shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Digital Menu</span>
            <h1 className="text-2xl font-black tracking-tight">{data.branch.organizationName}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{data.branch.name}</p>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'en' ? 'አማርኛ' : 'English'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-6 space-y-6">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {lang === 'en' ? 'All Items' : 'ሁሉም'}
          </button>
          {data.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {lang === 'am' && c.nameAmharic ? c.nameAmharic : c.name}
            </button>
          ))}
        </div>

        {/* Menu Items List */}
        <div className="space-y-3">
          {displayedItems.map((item) => {
            const title = lang === 'am' && item.nameAmharic ? item.nameAmharic : item.name;
            const subtitle = lang === 'en' ? item.nameAmharic : item.name;
            const desc = lang === 'am' && item.descriptionAmharic ? item.descriptionAmharic : item.description;

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
                  {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
                  {desc && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{desc}</p>}
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-2 font-medium">
                    <Clock className="w-3 h-3" /> ~{item.preparationMinutes} mins
                  </span>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-base font-extrabold text-sky-700">
                    {item.price} {data.branch.currency}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
