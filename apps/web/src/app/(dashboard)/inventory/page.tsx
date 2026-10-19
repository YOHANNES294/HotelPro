'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useLanguage } from '../../../context/language-context';
import { apiClient } from '../../../lib/api';
import { Boxes, Plus, AlertTriangle, ArrowUpDown, RefreshCw, CheckCircle } from 'lucide-react';
import { UnitOfMeasure, MovementType } from '@hotelpro/shared';

interface Ingredient {
  id: string;
  name: string;
  unit: UnitOfMeasure;
  currentStock: string;
  minimumStock: string;
  unitCost: string;
  isLowStock: boolean;
  supplier?: {
    name: string;
  };
}

export default function InventoryPage() {
  const { activeBranchId, user } = useAuth();
  const { t } = useLanguage();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  const [addForm, setAddForm] = useState({
    name: '',
    unit: UnitOfMeasure.KG,
    currentStock: '0.000',
    minimumStock: '10.000',
    unitCost: '0.00',
  });

  const [adjustForm, setAdjustForm] = useState({
    type: MovementType.MANUAL_ADJUSTMENT,
    quantityDelta: '0',
    reason: '',
  });

  const loadIngredients = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const res = await apiClient<{ ingredients: Ingredient[] }>(`/inventory/ingredients${query}`);
      setIngredients(res.ingredients || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIngredients();
  }, [activeBranchId]);

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/inventory/ingredients', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          ...addForm,
        }),
      });
      setShowAddModal(false);
      setAddForm({
        name: '',
        unit: UnitOfMeasure.KG,
        currentStock: '0.000',
        minimumStock: '10.000',
        unitCost: '0.00',
      });
      loadIngredients();
    } catch (err: any) {
      alert(err.message || 'Failed to add ingredient');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;
    try {
      await apiClient('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          ingredientId: selectedIngredient.id,
          type: adjustForm.type,
          quantityDelta: adjustForm.quantityDelta,
          reason: adjustForm.reason || undefined,
        }),
      });
      setShowAdjustModal(false);
      setSelectedIngredient(null);
      setAdjustForm({ type: MovementType.MANUAL_ADJUSTMENT, quantityDelta: '0', reason: '' });
      loadIngredients();
    } catch (err: any) {
      alert(err.message || 'Failed to record movement');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.inventory}</h1>
          <p className="text-sm text-slate-500">Raw materials, recipe ingredients, and stock movement logs</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadIngredients}
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
            Add Ingredient
          </button>
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Ingredient</th>
                <th className="px-6 py-3.5">Current Stock</th>
                <th className="px-6 py-3.5">Min Stock Alert</th>
                <th className="px-6 py-3.5">Unit Cost</th>
                <th className="px-6 py-3.5">Stock Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading inventory...
                  </td>
                </tr>
              ) : ingredients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No ingredients found.
                  </td>
                </tr>
              ) : (
                ingredients.map((ing) => (
                  <tr key={ing.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{ing.name}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-800">
                      {ing.currentStock} {ing.unit}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {ing.minimumStock} {ing.unit}
                    </td>
                    <td className="px-6 py-4 text-slate-800">
                      {ing.unitCost} {user?.organization?.currency || 'ETB'}
                    </td>
                    <td className="px-6 py-4">
                      {ing.isLowStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Adequate
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedIngredient(ing);
                          setShowAdjustModal(true);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Ingredient</h2>
            <form onSubmit={handleAddIngredient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Teff Flour, Butter"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Unit of Measure</label>
                  <select
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value as UnitOfMeasure })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  >
                    {Object.values(UnitOfMeasure).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addForm.unitCost}
                    onChange={(e) => setAddForm({ ...addForm, unitCost: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={addForm.currentStock}
                    onChange={(e) => setAddForm({ ...addForm, currentStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Min Stock Threshold</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={addForm.minimumStock}
                    onChange={(e) => setAddForm({ ...addForm, minimumStock: e.target.value })}
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
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedIngredient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Adjust Stock: {selectedIngredient.name}</h2>
            <p className="text-xs text-slate-500 mb-4">
              Current: {selectedIngredient.currentStock} {selectedIngredient.unit}
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Movement Type</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as MovementType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                >
                  <option value={MovementType.PURCHASE_RECEIPT}>Purchase Receipt (+)</option>
                  <option value={MovementType.MANUAL_ADJUSTMENT}>Manual Adjustment (+/-)</option>
                  <option value={MovementType.WASTE}>Spoilage / Waste (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Quantity Delta (Positive to add, Negative to deduct)
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="e.g. 5.0 or -2.5"
                  value={adjustForm.quantityDelta}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantityDelta: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Supplier delivery invoice #99"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Record Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
