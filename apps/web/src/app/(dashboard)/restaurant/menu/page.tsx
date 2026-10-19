'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { Utensils, Plus, ExternalLink, QrCode, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  nameAmharic?: string;
  description?: string;
  price: string;
  isAvailable: boolean;
  preparationMinutes: number;
}

interface MenuCategory {
  id: string;
  name: string;
  nameAmharic?: string;
  sortOrder: number;
  menuItems: MenuItem[];
}

export default function MenuManagementPage() {
  const { activeBranchId, user } = useAuth();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  const [itemForm, setItemForm] = useState({
    categoryId: '',
    name: '',
    nameAmharic: '',
    description: '',
    price: '',
    preparationMinutes: 15,
  });

  const [catForm, setCatForm] = useState({
    name: '',
    nameAmharic: '',
    sortOrder: 0,
  });

  const loadMenu = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const res = await apiClient<{ categories: MenuCategory[] }>(`/restaurants/menu${query}`);
      setCategories(res.categories || []);
      if (res.categories?.length > 0 && !itemForm.categoryId) {
        setItemForm((prev) => ({ ...prev, categoryId: res.categories[0].id }));
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [activeBranchId]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/restaurants/menu/categories', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          ...catForm,
        }),
      });
      setShowCatModal(false);
      setCatForm({ name: '', nameAmharic: '', sortOrder: 0 });
      loadMenu();
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/restaurants/menu/items', {
        method: 'POST',
        body: JSON.stringify(itemForm),
      });
      setShowItemModal(false);
      setItemForm({
        categoryId: categories[0]?.id || '',
        name: '',
        nameAmharic: '',
        description: '',
        price: '',
        preparationMinutes: 15,
      });
      loadMenu();
    } catch (err: any) {
      alert(err.message || 'Failed to create menu item');
    }
  };

  const toggleAvailability = async (itemId: string, current: boolean) => {
    try {
      await apiClient(`/restaurants/menu/items/${itemId}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !current }),
      });
      loadMenu();
    } catch (err: any) {
      alert(err.message || 'Failed to update availability');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.menu} Management</h1>
          <p className="text-sm text-slate-500">Categories, bilingual items, prices, and digital QR menu</p>
        </div>

        <div className="flex items-center gap-3">
          {activeBranchId && (
            <Link
              href={`/menu/${activeBranchId}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
            >
              <QrCode className="w-4 h-4 text-sky-600" />
              Preview Public QR Menu
            </Link>
          )}
          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
          <button
            onClick={() => setShowItemModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Categories & Items List */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading menu...</div>
        ) : categories.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
            <Utensils className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No menu categories created yet.</p>
          </div>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">{category.name}</h2>
                  {category.nameAmharic && (
                    <p className="text-xs text-slate-500 font-medium">{category.nameAmharic}</p>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-semibold">{category.menuItems.length} items</span>
              </div>

              <div className="divide-y divide-slate-100">
                {category.menuItems.length === 0 ? (
                  <p className="p-6 text-center text-slate-400 text-xs italic">No items in this category</p>
                ) : (
                  category.menuItems.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                          {item.nameAmharic && (
                            <span className="text-xs text-slate-400 font-medium">({item.nameAmharic})</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                        <span className="text-[11px] text-slate-400 block mt-1">
                          Prep: ~{item.preparationMinutes} mins
                        </span>
                      </div>

                      <div className="flex items-center gap-6">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {item.price} {user?.organization?.currency || 'ETB'}
                        </span>

                        {/* Availability Toggle */}
                        <button
                          onClick={() => toggleAvailability(item.id, item.isAvailable)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {item.isAvailable ? 'Available' : 'Sold Out'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Menu Category</h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Category Name (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grills & Steaks"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Category Name (Amharic)</label>
                <input
                  type="text"
                  placeholder="e.g. ጥብስ እና ስቴክ"
                  value={catForm.nameAmharic}
                  onChange={(e) => setCatForm({ ...catForm, nameAmharic: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Menu Item</h2>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                <select
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Item Name (EN)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Special Kitfo"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Item Name (AM)</label>
                  <input
                    type="text"
                    placeholder="ልዩ ክትፎ"
                    value={itemForm.nameAmharic}
                    onChange={(e) => setItemForm({ ...itemForm, nameAmharic: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Price ({user?.organization?.currency || 'ETB'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="750.00"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Prep Time (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={itemForm.preparationMinutes}
                    onChange={(e) => setItemForm({ ...itemForm, preparationMinutes: parseInt(e.target.value, 10) || 15 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients and culinary notes"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
