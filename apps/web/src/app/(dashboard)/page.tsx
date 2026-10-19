'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/auth-context';
import { useLanguage } from '../../context/language-context';
import { apiClient } from '../../lib/api';
import {
  BedDouble,
  DollarSign,
  Utensils,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  CalendarCheck,
  Receipt,
  CircleDollarSign,
} from 'lucide-react';

interface DashboardMetrics {
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: string;
  checkedInGuests: number;
  todayTotalRevenue: string;
  todayRoomRevenue: string;
  todayRestaurantRevenue: string;
  activeOrdersCount: number;
  lowStockCount: number;
  activeShiftsCount: number;
}

export default function DashboardPage() {
  const { user, activeBranchId } = useAuth();
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
        const res = await apiClient<{ summary: DashboardMetrics }>(`/reports/dashboard${query}`);
        setMetrics(res.summary);
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [activeBranchId]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.navigation.dashboard}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-800">{user?.fullName}</span>. Operational overview for{' '}
            <span className="font-semibold text-sky-600">{user?.organization?.name}</span>.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/hotel/reservations"
            className="flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <CalendarCheck className="w-4 h-4" />
            {t.hotel.newReservation}
          </Link>
          <Link
            href="/restaurant/pos"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            {t.restaurant.newOrder}
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Occupancy Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Occupancy Rate</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics?.occupancyRate || '0.0%'}
            </span>
            <span className="text-xs text-slate-500">
              ({metrics?.occupiedRooms || 0} / {metrics?.totalRooms || 0} {t.navigation.rooms})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Checked-in guests: <span className="font-semibold text-slate-700">{metrics?.checkedInGuests || 0}</span>
          </p>
        </div>

        {/* Total Today Revenue Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : `${metrics?.todayTotalRevenue || '0.00'} ${user?.organization?.currency || 'ETB'}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Rooms: {metrics?.todayRoomRevenue || '0.00'} | Dining: {metrics?.todayRestaurantRevenue || '0.00'}
          </p>
        </div>

        {/* Active Orders Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Dining Orders</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics?.activeOrdersCount || 0}
            </span>
            <span className="text-xs text-amber-600 font-medium">In Prep / Kitchen</span>
          </div>
          <Link href="/restaurant/kitchen" className="inline-flex items-center gap-1 text-xs text-sky-600 font-semibold mt-2 hover:underline">
            View Kitchen Display <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Low Stock Alerts Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Alerts</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics?.lowStockCount || 0}
            </span>
            <span className="text-xs text-red-600 font-medium">Below Min Stock</span>
          </div>
          <Link href="/inventory" className="inline-flex items-center gap-1 text-xs text-sky-600 font-semibold mt-2 hover:underline">
            Manage Inventory <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Operational Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Front Desk Module */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 font-bold">
                <BedDouble className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-slate-900">{t.navigation.frontDesk}</h2>
            </div>
            <p className="text-xs text-slate-500">
              Real-time room occupancy grid, guest check-in, check-out, and housekeeping status sync.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link href="/hotel/rooms" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
              View Rooms Grid →
            </Link>
            <Link href="/hotel/reservations" className="text-xs font-semibold text-slate-600 hover:text-slate-800">
              Reservations Calendar →
            </Link>
          </div>
        </div>

        {/* Restaurant POS & Kitchen */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                <Utensils className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-slate-900">{t.navigation.restaurant} & POS</h2>
            </div>
            <p className="text-xs text-slate-500">
              Touch-friendly order entry, table floor layout, live kitchen tickets, and digital QR menu.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link href="/restaurant/pos" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Open Point of Sale →
            </Link>
            <Link href="/restaurant/kitchen" className="text-xs font-semibold text-slate-600 hover:text-slate-800">
              Kitchen Display (KDS) →
            </Link>
          </div>
        </div>

        {/* Financial Shift & Cashier */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 font-bold">
                <CircleDollarSign className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-slate-900">{t.navigation.shifts}</h2>
            </div>
            <p className="text-xs text-slate-500">
              Opening float, cash payments tracking, physical count reconciliation, and variance control.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link href="/financials/shifts" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
              Reconcile Active Shift →
            </Link>
            <Link href="/reports" className="text-xs font-semibold text-slate-600 hover:text-slate-800">
              Business Reports →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
