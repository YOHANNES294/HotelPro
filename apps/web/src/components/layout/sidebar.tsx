'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../context/language-context';
import { useAuth } from '../../context/auth-context';
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Users,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  Boxes,
  CircleDollarSign,
  BarChart3,
  Settings,
  ShieldAlert,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();

  const navItems = [
    { label: t.navigation.dashboard, href: '/', icon: LayoutDashboard },
    {
      category: t.hotel.roomType,
      items: [
        { label: t.navigation.rooms, href: '/hotel/rooms', icon: BedDouble },
        { label: t.navigation.reservations, href: '/hotel/reservations', icon: CalendarCheck },
        { label: t.navigation.guests, href: '/hotel/guests', icon: Users },
        { label: t.navigation.housekeeping, href: '/hotel/housekeeping', icon: Sparkles },
      ],
    },
    {
      category: t.navigation.restaurant,
      items: [
        { label: t.navigation.tables, href: '/restaurant/tables', icon: UtensilsCrossed },
        { label: t.navigation.pos, href: '/restaurant/pos', icon: Receipt },
        { label: t.navigation.kitchen, href: '/restaurant/kitchen', icon: ChefHat },
        { label: t.navigation.menu, href: '/restaurant/menu', icon: UtensilsCrossed },
      ],
    },
    {
      category: t.navigation.inventory,
      items: [
        { label: t.navigation.inventory, href: '/inventory', icon: Boxes },
      ],
    },
    {
      category: t.navigation.payments,
      items: [
        { label: t.navigation.shifts, href: '/financials/shifts', icon: CircleDollarSign },
        { label: t.navigation.payments, href: '/financials/payments', icon: Receipt },
      ],
    },
    {
      category: t.navigation.reports,
      items: [
        { label: t.navigation.reports, href: '/reports', icon: BarChart3 },
        { label: t.navigation.settings, href: '/settings/organization', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 min-h-screen flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
          HP
        </div>
        <div>
          <h1 className="font-bold text-white tracking-wide text-lg">HotelPro</h1>
          <p className="text-xs text-sky-400 font-medium">{user?.organization?.name || 'Hospitality OS'}</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {/* Main Dashboard Link */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          {t.navigation.dashboard}
        </Link>

        {/* Section Groups */}
        {navItems.slice(1).map((group: any, idx) => (
          <div key={idx} className="space-y-1">
            <h2 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {group.category}
            </h2>
            <div className="space-y-1 mt-1">
              {group.items.map((item: any) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Role Badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 font-semibold border border-slate-700">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.fullName || 'Staff User'}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
