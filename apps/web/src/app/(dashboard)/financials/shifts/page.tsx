'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { CircleDollarSign, Plus, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { ShiftStatus } from '@hotelpro/shared';

interface CashierShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingCash: string;
  expectedCash?: string;
  countedCash?: string;
  variance?: string;
  status: ShiftStatus;
  notes?: string;
  cashier?: {
    fullName: string;
    email: string;
  };
  payments?: any[];
}

export default function ShiftsPage() {
  const { activeBranchId, user } = useAuth();
  const { t } = useLanguage();
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [pastShifts, setPastShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const [openingCash, setOpeningCash] = useState('5000.00');
  const [countedCash, setCountedCash] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  const loadShifts = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const activeRes = await apiClient<{ shift: CashierShift | null }>(`/financials/shifts/active${query}`);
      setActiveShift(activeRes.shift);

      const pastRes = await apiClient<{ shifts: CashierShift[] }>(`/reports/shift-reconciliations${query}`);
      setPastShifts(pastRes.shifts || []);
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [activeBranchId]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/financials/shifts/open', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          openingCash,
          notes: shiftNotes || undefined,
        }),
      });
      setShowOpenModal(false);
      setShiftNotes('');
      loadShifts();
    } catch (err: any) {
      alert(err.message || 'Failed to open shift');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    try {
      await apiClient(`/financials/shifts/${activeShift.id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          countedCash,
          notes: shiftNotes || undefined,
        }),
      });
      setShowCloseModal(false);
      setCountedCash('');
      setShiftNotes('');
      loadShifts();
    } catch (err: any) {
      alert(err.message || 'Failed to close shift');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.shifts}</h1>
          <p className="text-sm text-slate-500">Cash float opening, shift payments, physical counting, and variance control</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadShifts}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {!activeShift && (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              {t.financial.openShift}
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Card */}
      {activeShift ? (
        <div className="bg-gradient-to-r from-sky-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-sky-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Active Open Shift</span>
            </div>
            <h2 className="text-xl font-black">Cashier: {user?.fullName}</h2>
            <p className="text-xs text-slate-300 mt-1">
              Opened at: {new Date(activeShift.openedAt).toLocaleTimeString()} • Opening Cash:{' '}
              <span className="font-bold text-white">
                {activeShift.openingCash} {user?.organization?.currency || 'ETB'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
            >
              {t.financial.closeShift} & Reconcile
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <Clock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-800">No Shift Currently Open</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">Open a shift float before processing cash payments.</p>
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition"
          >
            {t.financial.openShift}
          </button>
        </div>
      )}

      {/* Past Shifts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-bold text-slate-900 text-sm">Shift Reconciliation History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Cashier</th>
                <th className="px-6 py-3.5">Shift Interval</th>
                <th className="px-6 py-3.5">Opening Float</th>
                <th className="px-6 py-3.5">Expected Balance</th>
                <th className="px-6 py-3.5">Counted Cash</th>
                <th className="px-6 py-3.5">Variance</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading shift records...
                  </td>
                </tr>
              ) : pastShifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No closed shifts recorded yet.
                  </td>
                </tr>
              ) : (
                pastShifts.map((s) => {
                  const varNum = parseFloat(s.variance || '0');
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">{s.cashier?.fullName || 'Cashier'}</td>
                      <td className="px-6 py-4 text-xs">
                        <p className="font-semibold text-slate-800">{new Date(s.openedAt).toLocaleDateString()}</p>
                        <p className="text-slate-400">
                          {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                          {s.closedAt ? new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-mono">{s.openingCash} ETB</td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-800">{s.expectedCash || '0.00'} ETB</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{s.countedCash || '0.00'} ETB</td>
                      <td className="px-6 py-4 font-mono font-bold">
                        {varNum === 0 ? (
                          <span className="text-emerald-600">0.00 ETB (Balanced)</span>
                        ) : varNum > 0 ? (
                          <span className="text-emerald-700">+{s.variance} ETB (Surplus)</span>
                        ) : (
                          <span className="text-rose-600">{s.variance} ETB (Shortage)</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t.financial.openShift}</h2>
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t.financial.openingBalance} ({user?.organization?.currency || 'ETB'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Shift Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Verified by head cashier"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Confirm Opening Float
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">{t.financial.closeShift} & Reconciliation</h2>
            <p className="text-xs text-slate-500 mb-4">
              Count all physical cash in the till drawer before finalizing shift.
            </p>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Physical Counted Cash ({user?.organization?.currency || 'ETB'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 7450.00"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Handover Notes</label>
                <input
                  type="text"
                  placeholder="Handover recipient or notes"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Submit & Reconcile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
