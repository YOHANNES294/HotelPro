'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { ChefHat, Clock, CheckCircle2, RefreshCw, Check } from 'lucide-react';
import { OrderStatus } from '@hotelpro/shared';

interface KitchenTicket {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  order: {
    id: string;
    orderType: string;
    table?: {
      tableNumber: string;
    };
    customerName?: string;
    items: Array<{
      id: string;
      itemName: string;
      quantity: number;
      notes?: string;
    }>;
  };
}

export default function KitchenPage() {
  const { activeBranchId } = useAuth();
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const res = await apiClient<{ tickets: KitchenTicket[] }>(
        `/restaurants/kitchen/tickets${query}`
      );
      setTickets(res.tickets || []);
    } catch (err) {
      console.error('Failed to load kitchen tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [activeBranchId]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await apiClient(`/restaurants/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-amber-600" />
            {t.restaurant.kitchenDisplay}
          </h1>
          <p className="text-sm text-slate-500">Live order queue for chefs & kitchen stations</p>
        </div>

        <button
          onClick={loadTickets}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-xl hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tickets Grid */}
      {loading && tickets.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading kitchen queue...</div>
      ) : tickets.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">All caught up!</h2>
          <p className="text-xs text-slate-500 mt-1">No active orders in the kitchen queue right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {tickets.map((ticket) => {
            const isReady = ticket.status === OrderStatus.READY;
            const elapsedMins = Math.floor(
              (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60)
            );

            return (
              <div
                key={ticket.id}
                className={`bg-white rounded-2xl border ${
                  isReady ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'
                } shadow-sm flex flex-col justify-between overflow-hidden`}
              >
                {/* Ticket Top Info */}
                <div className={`p-4 ${isReady ? 'bg-emerald-50' : 'bg-slate-50'} border-b border-slate-200`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-base text-slate-900">
                      {ticket.orderNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isReady ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="font-bold text-slate-800">
                      {ticket.order.table?.tableNumber || ticket.order.orderType}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {elapsedMins}m ago
                    </span>
                  </div>

                  {ticket.notes && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                      ⚠️ {ticket.notes}
                    </p>
                  )}
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-2.5 divide-y divide-slate-100">
                  {ticket.order.items.map((item) => (
                    <div key={item.id} className="pt-2 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded bg-slate-100 font-extrabold text-slate-900 text-xs flex items-center justify-center flex-shrink-0">
                          {item.quantity}x
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{item.itemName}</p>
                          {item.notes && <p className="text-[11px] text-slate-400 italic">&quot;{item.notes}&quot;</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                  {!isReady ? (
                    <button
                      onClick={() => updateStatus(ticket.order.id, OrderStatus.READY)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      {t.restaurant.markReady}
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(ticket.order.id, OrderStatus.COMPLETED)}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      {t.restaurant.completeOrder}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
