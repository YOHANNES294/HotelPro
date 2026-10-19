'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { CalendarCheck, Plus, CheckCircle, LogOut, XCircle, Search, RefreshCw, UserCheck } from 'lucide-react';
import { ReservationStatus } from '@hotelpro/shared';

interface Reservation {
  id: string;
  reservationNumber: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  status: ReservationStatus;
  guest: {
    fullName: string;
    phone?: string;
  };
  room?: {
    id: string;
    roomNumber: string;
  };
  roomType: {
    name: string;
    basePrice: string;
  };
}

export default function ReservationsPage() {
  const { activeBranchId, user } = useAuth();
  const { t } = useLanguage();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  // Booking form state
  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    roomTypeId: '',
    roomId: '',
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 nights default
    adultsCount: 1,
    childrenCount: 0,
    nightlyRate: '0.00',
  });

  const loadReservations = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const res = await apiClient<{ reservations: Reservation[] }>(`/hotels/reservations${query}`);
      setReservations(res.reservations || []);

      const rtRes = await apiClient<{ roomTypes: any[] }>(`/hotels/room-types${query}`);
      setRoomTypes(rtRes.roomTypes || []);
      if (rtRes.roomTypes?.length > 0 && !formData.roomTypeId) {
        setFormData((prev) => ({
          ...prev,
          roomTypeId: rtRes.roomTypes[0].id,
          nightlyRate: rtRes.roomTypes[0].basePrice,
        }));
      }
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, [activeBranchId]);

  // Load available rooms when dates or roomType change
  useEffect(() => {
    async function fetchAvailableRooms() {
      if (!activeBranchId || !formData.checkInDate || !formData.checkOutDate) return;
      try {
        const query = `?branchId=${activeBranchId}&checkInDate=${new Date(formData.checkInDate).toISOString()}&checkOutDate=${new Date(formData.checkOutDate).toISOString()}${formData.roomTypeId ? `&roomTypeId=${formData.roomTypeId}` : ''}`;
        const res = await apiClient<{ availableRooms: any[] }>(`/hotels/reservations/availability${query}`);
        setAvailableRooms(res.availableRooms || []);
        if (res.availableRooms?.length > 0) {
          setFormData((prev) => ({ ...prev, roomId: res.availableRooms[0].id }));
        }
      } catch (err) {
        // Silently skip or log
      }
    }
    fetchAvailableRooms();
  }, [activeBranchId, formData.checkInDate, formData.checkOutDate, formData.roomTypeId]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/hotels/reservations', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          roomTypeId: formData.roomTypeId,
          roomId: formData.roomId || undefined,
          checkInDate: new Date(formData.checkInDate).toISOString(),
          checkOutDate: new Date(formData.checkOutDate).toISOString(),
          adultsCount: Number(formData.adultsCount),
          childrenCount: Number(formData.childrenCount),
          nightlyRate: formData.nightlyRate,
          guestData: {
            fullName: formData.guestName,
            phone: formData.guestPhone || undefined,
            email: formData.guestEmail || undefined,
          },
        }),
      });

      setShowModal(false);
      loadReservations();
    } catch (err: any) {
      alert(err.message || 'Failed to create reservation');
    }
  };

  const handleCheckIn = async (resvId: string) => {
    try {
      await apiClient(`/hotels/reservations/${resvId}/check-in`, { method: 'POST' });
      loadReservations();
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async (resvId: string) => {
    try {
      await apiClient(`/hotels/reservations/${resvId}/check-out`, { method: 'POST' });
      loadReservations();
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    }
  };

  const handleCancel = async (resvId: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await apiClient(`/hotels/reservations/${resvId}/cancel`, { method: 'POST' });
      loadReservations();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    }
  };

  const filtered = reservations.filter(
    (r) =>
      r.reservationNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.guest.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.reservations}</h1>
          <p className="text-sm text-slate-500">Booking lifecycle, guest folios, and check-in / check-out</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadReservations}
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
            {t.hotel.newReservation}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by reservation # or guest name..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
        />
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Reservation #</th>
                <th className="px-6 py-3.5">Guest</th>
                <th className="px-6 py-3.5">Room</th>
                <th className="px-6 py-3.5">Stay Dates</th>
                <th className="px-6 py-3.5">Balance Due</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading reservations...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No reservations found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{r.reservationNumber}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{r.guest.fullName}</p>
                      <p className="text-xs text-slate-400">{r.guest.phone || 'No phone'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {r.room ? (
                        <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                          Room {r.room.roomNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{r.roomType.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-800 font-medium">
                        {new Date(r.checkInDate).toLocaleDateString()} — {new Date(r.checkOutDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-400">{r.totalNights} nights</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {r.balanceDue} {user?.organization?.currency || 'ETB'}
                      {parseFloat(r.paidAmount) > 0 && (
                        <p className="text-xs text-emerald-600 font-normal">Paid: {r.paidAmount}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          r.status === 'CHECKED_IN'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : r.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.status === 'CHECKED_OUT'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleCheckIn(r.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {t.hotel.confirmCheckIn}
                          </button>
                        )}
                        {r.status === 'CHECKED_IN' && (
                          <button
                            onClick={() => handleCheckOut(r.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            {t.hotel.confirmCheckOut}
                          </button>
                        )}
                        {(r.status === 'CONFIRMED' || r.status === 'PENDING') && (
                          <button
                            onClick={() => handleCancel(r.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Cancel Reservation"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Reservation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t.hotel.newReservation}</h2>
            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Check-in Date</label>
                  <input
                    type="date"
                    required
                    value={formData.checkInDate}
                    onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Check-out Date</label>
                  <input
                    type="date"
                    required
                    value={formData.checkOutDate}
                    onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Guest Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dawit Kebede"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+251911..."
                    value={formData.guestPhone}
                    onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="guest@mail.com"
                    value={formData.guestEmail}
                    onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Room Type</label>
                  <select
                    value={formData.roomTypeId}
                    onChange={(e) => {
                      const rt = roomTypes.find((r) => r.id === e.target.value);
                      setFormData({
                        ...formData,
                        roomTypeId: e.target.value,
                        nightlyRate: rt?.basePrice || '0.00',
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name} ({rt.basePrice} ETB)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Assign Available Room</label>
                  <select
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="">Auto-assign or unassigned</option>
                    {availableRooms.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        Room {rm.roomNumber} (Floor {rm.floor})
                      </option>
                    ))}
                  </select>
                </div>
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
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
