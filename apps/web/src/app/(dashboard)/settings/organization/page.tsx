'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { Building2, Plus, RefreshCw, CheckCircle, MapPin, Phone, Mail } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  hasHotel: boolean;
  hasRestaurant: boolean;
  isActive: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  branches: Branch[];
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [newBranch, setNewBranch] = useState({
    name: '',
    code: '',
    city: 'Addis Ababa',
    address: '',
    phone: '',
    email: '',
    hasHotel: true,
    hasRestaurant: true,
  });

  const loadOrg = async () => {
    try {
      setLoading(true);
      const res = await apiClient<{ organization: Organization }>('/organizations');
      setOrg(res.organization);
    } catch (err) {
      console.error('Failed to load organization:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrg();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/organizations/branches', {
        method: 'POST',
        body: JSON.stringify(newBranch),
      });
      setShowModal(false);
      setNewBranch({
        name: '',
        code: '',
        city: 'Addis Ababa',
        address: '',
        phone: '',
        email: '',
        hasHotel: true,
        hasRestaurant: true,
      });
      loadOrg();
    } catch (err: any) {
      alert(err.message || 'Failed to add branch');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.settings} — Organization</h1>
          <p className="text-sm text-slate-500">Business account details, multi-branch network, and locale defaults</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      {/* Organization Card */}
      {org && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-900 text-base mb-4">Organization Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-medium">Business Name</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{org.name}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-medium">Domain Slug</span>
              <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{org.slug}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-medium">Default Currency</span>
              <p className="font-bold text-sky-700 text-sm mt-0.5">{org.currency}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-medium">Timezone</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{org.timezone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Branches List */}
      <div className="space-y-4">
        <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-sky-600" />
          Branches Network ({org?.branches?.length || 0})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {org?.branches?.map((branch) => (
            <div
              key={branch.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">{branch.name}</h3>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    {branch.code}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-500 mt-2">
                  {branch.city && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {branch.address ? `${branch.address}, ` : ''}{branch.city}
                    </p>
                  )}
                  {branch.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {branch.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold">
                {branch.hasHotel && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">🏨 Hotel</span>
                )}
                {branch.hasRestaurant && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md">🍽️ Restaurant</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Business Branch</h2>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Branch Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hawassa Resort"
                    value={newBranch.name}
                    onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Branch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="HAW"
                    maxLength={10}
                    value={newBranch.code}
                    onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newBranch.city}
                    onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Address / Street</label>
                  <input
                    type="text"
                    placeholder="Lakeside Road"
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+251..."
                    value={newBranch.phone}
                    onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="branch@hotel.com"
                    value={newBranch.email}
                    onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newBranch.hasHotel}
                    onChange={(e) => setNewBranch({ ...newBranch, hasHotel: e.target.checked })}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  Has Hotel
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newBranch.hasRestaurant}
                    onChange={(e) => setNewBranch({ ...newBranch, hasRestaurant: e.target.checked })}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  Has Restaurant
                </label>
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
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
