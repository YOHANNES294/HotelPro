'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { Utensils, Plus, RefreshCw, Users, Receipt } from 'lucide-react';
import { TableStatus } from '@hotelpro/shared';

interface DiningTable {
  id: string;
  tableNumber: string;
  capacity: number;
  section: string;
  status: TableStatus;
  orders?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: string;
  }>;
}

export default function TablesPage() {
  const { activeBranchId } = useAuth();
  const { t } = useLanguage();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  const [newTable, setNewTable] = useState({
    tableNumber: '',
    capacity: 4,
    section: 'Main Dining',
    status: TableStatus.AVAILABLE,
  });

  const loadTables = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const res = await apiClient<{ tables: DiningTable[] }>(`/restaurants/tables${query}`);
      setTables(res.tables || []);
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, [activeBranchId]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/restaurants/tables', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          ...newTable,
        }),
      });
      setShowAddModal(false);
      setNewTable({ tableNumber: '', capacity: 4, section: 'Main Dining', status: TableStatus.AVAILABLE });
      loadTables();
    } catch (err: any) {
      alert(err.message || 'Failed to create table');
    }
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    try {
      await apiClient(`/restaurants/tables/${tableId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadTables();
    } catch (err: any) {
      alert(err.message || 'Failed to update table status');
    }
  };

  const sections = Array.from(new Set(tables.map((t) => t.section)));
  const filteredTables =
    selectedSection === 'ALL'
      ? tables
      : tables.filter((t) => t.section === selectedSection);

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case TableStatus.OCCUPIED:
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case TableStatus.RESERVED:
        return 'bg-sky-50 border-sky-200 text-sky-800';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.tables}</h1>
          <p className="text-sm text-slate-500">Floor plan overview, table seating, and occupancy</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTables}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      {/* Section Filters */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setSelectedSection('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            selectedSection === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Sections
        </button>
        {sections.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedSection === sec ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading dining floor...</div>
      ) : filteredTables.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <Utensils className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No tables found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredTables.map((table) => {
            const activeOrder = table.orders?.[0];
            return (
              <div
                key={table.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-slate-900 text-lg">{table.tableNumber}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase ${getStatusColor(
                        table.status
                      )}`}
                    >
                      {table.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-medium">{table.section}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Users className="w-3.5 h-3.5" /> Seating: {table.capacity} guests
                  </p>

                  {activeOrder && (
                    <div className="mt-3 p-2 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                      <p className="font-bold text-amber-900">{activeOrder.orderNumber}</p>
                      <p className="text-amber-700 font-medium">Status: {activeOrder.status}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    href={`/restaurant/pos`}
                    className="flex items-center gap-1 text-sky-600 font-bold hover:underline"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    Open Order
                  </Link>

                  <select
                    value={table.status}
                    onChange={(e) => updateTableStatus(table.id, e.target.value as TableStatus)}
                    className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-700"
                  >
                    <option value={TableStatus.AVAILABLE}>Available</option>
                    <option value={TableStatus.OCCUPIED}>Occupied</option>
                    <option value={TableStatus.RESERVED}>Reserved</option>
                    <option value={TableStatus.OUT_OF_SERVICE}>Out of Service</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Dining Table</h2>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Table Number / Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 12 or Terrace 4"
                  value={newTable.tableNumber}
                  onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Capacity (Seats)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value, 10) || 2 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Floor Section</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Dining, Patio"
                    value={newTable.section}
                    onChange={(e) => setNewTable({ ...newTable, section: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
