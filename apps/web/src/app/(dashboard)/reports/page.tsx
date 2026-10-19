'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useLanguage } from '../../../context/language-context';
import { apiClient } from '../../../lib/api';
import { BarChart3, Download, RefreshCw, TrendingUp, DollarSign, BedDouble, Utensils } from 'lucide-react';

interface SalesItem {
  name: string;
  category: string;
  quantity: number;
  revenue: string;
}

export default function ReportsPage() {
  const { activeBranchId, user } = useAuth();
  const { t } = useLanguage();
  const [sales, setSales] = useState<SalesItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const [salesRes, summaryRes] = await Promise.all([
        apiClient<{ salesByItem: SalesItem[] }>(`/reports/restaurant-sales${query}`),
        apiClient<{ summary: any }>(`/reports/dashboard${query}`),
      ]);
      setSales(salesRes.salesByItem || []);
      setSummary(summaryRes.summary);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeBranchId]);

  const handleExportCSV = () => {
    if (sales.length === 0) return;
    const headers = ['Item Name,Category,Quantity Sold,Revenue (' + (user?.organization?.currency || 'ETB') + ')'];
    const rows = sales.map((s) => `"${s.name}","${s.category}",${s.quantity},${s.revenue}`);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotelpro_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.reports}</h1>
          <p className="text-sm text-slate-500">Live analytics, product performance, and financial summaries</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadReports}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Occupancy Rate</span>
            <BedDouble className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{summary?.occupancyRate || '0.0%'}</p>
          <p className="text-xs text-slate-400 mt-1">Based on active room status</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Room Revenue Today</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {summary?.todayRoomRevenue || '0.00'} {user?.organization?.currency || 'ETB'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Settled payments for rooms</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Dining Sales Today</span>
            <Utensils className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {summary?.todayRestaurantRevenue || '0.00'} {user?.organization?.currency || 'ETB'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Settled payments for restaurant</p>
        </div>
      </div>

      {/* Product Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">Restaurant Product Sales Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Product Name</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Total Quantity Sold</th>
                <th className="px-6 py-3.5 text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Loading performance reports...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No completed order items recorded yet.
                  </td>
                </tr>
              ) : (
                sales.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">{item.category}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{item.quantity} units</td>
                    <td className="px-6 py-4 text-right font-extrabold text-slate-900">
                      {item.revenue} {user?.organization?.currency || 'ETB'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
