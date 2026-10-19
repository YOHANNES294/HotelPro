'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { Receipt, Plus, Search, RefreshCw, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { PaymentMethod, PaymentTargetType } from '@hotelpro/shared';

interface PaymentRecord {
  id: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  targetType: PaymentTargetType;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  processedBy?: {
    fullName: string;
  };
  reservation?: {
    reservationNumber: string;
    guest: { fullName: string };
  };
  order?: {
    orderNumber: string;
  };
}

export default function PaymentsPage() {
  const { activeBranchId, user } = useAuth();
  const { t } = useLanguage();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    targetType: PaymentTargetType.GENERAL,
    amount: '',
    method: PaymentMethod.CASH,
    referenceNumber: '',
    notes: '',
  });

  const loadPayments = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const res = await apiClient<{ payments: PaymentRecord[] }>(`/financials/payments${query}`);
      setPayments(res.payments || []);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [activeBranchId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/financials/payments', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          ...formData,
        }),
      });
      setShowModal(false);
      setFormData({
        targetType: PaymentTargetType.GENERAL,
        amount: '',
        method: PaymentMethod.CASH,
        referenceNumber: '',
        notes: '',
      });
      loadPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH:
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      case PaymentMethod.TELEBIRR:
      case PaymentMethod.CBE_BIRR:
        return <Smartphone className="w-4 h-4 text-sky-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.payments}</h1>
          <p className="text-sm text-slate-500">Manual transaction records, payment methods, and receipts</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPayments}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            {t.financial.recordPayment}
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Method</th>
                <th className="px-6 py-3.5">Reference / Notes</th>
                <th className="px-6 py-3.5">Processed By</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-xs font-medium text-slate-800">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 text-xs">{p.targetType}</span>
                      {p.reservation && (
                        <p className="text-[11px] text-sky-600 font-medium">
                          {p.reservation.reservationNumber} ({p.reservation.guest.fullName})
                        </p>
                      )}
                      {p.order && (
                        <p className="text-[11px] text-emerald-600 font-medium">{p.order.orderNumber}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        {getMethodIcon(p.method)}
                        <span>{p.method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {p.referenceNumber && (
                        <p className="font-mono text-slate-900 font-semibold">{p.referenceNumber}</p>
                      )}
                      {p.notes && <p className="text-slate-400 italic">{p.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {p.processedBy?.fullName || 'System'}
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-sm">
                      {p.amount} {p.currency}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t.financial.recordPayment}</h2>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Payment Target Category
                </label>
                <select
                  value={formData.targetType}
                  onChange={(e) => setFormData({ ...formData, targetType: e.target.value as PaymentTargetType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                >
                  <option value={PaymentTargetType.GENERAL}>General Payment / Venue Service</option>
                  <option value={PaymentTargetType.RESERVATION}>Hotel Reservation Settlement</option>
                  <option value={PaymentTargetType.ORDER}>Restaurant Order Settlement</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Amount ({user?.organization?.currency || 'ETB'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1500.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {t.financial.paymentMethod}
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value={PaymentMethod.CASH}>{t.financial.cash}</option>
                    <option value={PaymentMethod.TELEBIRR}>{t.financial.telebirr}</option>
                    <option value={PaymentMethod.CBE_BIRR}>{t.financial.cbeBirr}</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>{t.financial.bankTransfer}</option>
                    <option value={PaymentMethod.CREDIT_CARD}>{t.financial.creditCard}</option>
                    <option value={PaymentMethod.OTHER}>Other Method</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Transaction Reference #
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank slip # / Telebirr trans ID"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Payment remarks"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
