'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { Users, Plus, Search, RefreshCw, Mail, Phone, MapPin } from 'lucide-react';

interface Guest {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  idType?: string;
  nationality?: string;
  address?: string;
  notes?: string;
}

export default function GuestsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    idNumber: '',
    idType: 'PASSPORT',
    nationality: 'Ethiopian',
    address: '',
    notes: '',
  });

  const loadGuests = async (query = '') => {
    try {
      setLoading(true);
      const url = query ? `/hotels/guests?search=${encodeURIComponent(query)}` : '/hotels/guests';
      const res = await apiClient<{ guests: Guest[] }>(url);
      setGuests(res.guests || []);
    } catch (err) {
      console.error('Failed to load guests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadGuests(search);
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/hotels/guests', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        idNumber: '',
        idType: 'PASSPORT',
        nationality: 'Ethiopian',
        address: '',
        notes: '',
      });
      loadGuests();
    } catch (err: any) {
      alert(err.message || 'Failed to create guest');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.guests} Profiles</h1>
          <p className="text-sm text-slate-500">Customer directory, identity records, and stay preferences</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadGuests(search)}
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
            Add Guest
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or passport..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
        >
          {t.common.search}
        </button>
      </form>

      {/* Guests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Guest Full Name</th>
                <th className="px-6 py-3.5">Contact Details</th>
                <th className="px-6 py-3.5">ID / Passport</th>
                <th className="px-6 py-3.5">Nationality</th>
                <th className="px-6 py-3.5">Special Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading guest directory...
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No guests found.
                  </td>
                </tr>
              ) : (
                guests.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{g.fullName}</td>
                    <td className="px-6 py-4 text-xs space-y-0.5">
                      {g.phone && (
                        <p className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {g.phone}
                        </p>
                      )}
                      {g.email && (
                        <p className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {g.email}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      {g.idNumber ? `${g.idNumber} (${g.idType})` : <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">{g.nationality || '—'}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 italic">{g.notes || 'No remarks'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Guest Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Guest Profile</h2>
            <form onSubmit={handleCreateGuest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abebe Bikila"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+251911..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="guest@mail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ID / Passport #</label>
                  <input
                    type="text"
                    placeholder="EP123456"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Notes / Preferences</label>
                <textarea
                  rows={2}
                  placeholder="Dietary preferences, room requests..."
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
                  Save Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
