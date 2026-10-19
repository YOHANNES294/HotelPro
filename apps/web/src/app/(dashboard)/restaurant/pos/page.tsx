'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import {
  Utensils,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Receipt,
  User,
  Coffee,
  AlertCircle,
} from 'lucide-react';
import { OrderType } from '@hotelpro/shared';

interface MenuItem {
  id: string;
  name: string;
  nameAmharic?: string;
  price: string;
  preparationMinutes: number;
}

interface MenuCategory {
  id: string;
  name: string;
  nameAmharic?: string;
  menuItems: MenuItem[];
}

interface TableOption {
  id: string;
  tableNumber: string;
  section: string;
  status: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export default function PosPage() {
  const { activeBranchId, user } = useAuth();
  const { locale, t } = useLanguage();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    async function loadPosData() {
      if (!activeBranchId) return;
      try {
        const menuRes = await apiClient<{ categories: MenuCategory[] }>(
          `/restaurants/menu?branchId=${activeBranchId}`
        );
        setCategories(menuRes.categories || []);

        const tablesRes = await apiClient<{ tables: TableOption[] }>(
          `/restaurants/tables?branchId=${activeBranchId}`
        );
        setTables(tablesRes.tables || []);
        if (tablesRes.tables?.length > 0) {
          setSelectedTableId(tablesRes.tables[0].id);
        }
      } catch (err) {
        console.error('Failed to load POS data:', err);
      }
    }
    loadPosData();
  }, [activeBranchId]);

  const addToCart = (item: MenuItem) => {
    setSuccessOrderNumber(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: locale === 'am' && item.nameAmharic ? item.nameAmharic : item.name,
          price: parseFloat(item.price),
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  // Financial calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.15; // 15% VAT
  const total = subtotal + tax;

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setSuccessOrderNumber(null);

    try {
      const res = await apiClient<{ order: { orderNumber: string } }>('/restaurants/orders', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          orderType,
          tableId: orderType === OrderType.DINE_IN ? selectedTableId || undefined : undefined,
          customerName: customerName || undefined,
          notes: orderNotes || undefined,
          taxAmount: tax.toFixed(2),
          items: cart.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes || undefined,
          })),
        }),
      });

      setSuccessOrderNumber(res.order.orderNumber);
      setCart([]);
      setCustomerName('');
      setOrderNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allItems = categories.flatMap((c) => c.menuItems);
  const displayedItems =
    selectedCategory === 'ALL'
      ? allItems
      : categories.find((c) => c.id === selectedCategory)?.menuItems || [];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Left Menu Section */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Category Tabs */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-2 overflow-x-auto bg-slate-50">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {locale === 'am' && c.nameAmharic ? c.nameAmharic : c.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 p-4 rounded-2xl flex flex-col justify-between text-left transition group shadow-sm hover:shadow"
            >
              <div>
                <p className="font-bold text-slate-900 group-hover:text-sky-700 text-sm line-clamp-2">
                  {locale === 'am' && item.nameAmharic ? item.nameAmharic : item.name}
                </p>
                {item.nameAmharic && locale === 'en' && (
                  <p className="text-xs text-slate-400 mt-0.5">{item.nameAmharic}</p>
                )}
                <span className="text-[11px] font-medium text-slate-500 mt-2 block">
                  ~{item.preparationMinutes} mins
                </span>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">
                  {item.price} {user?.organization?.currency || 'ETB'}
                </span>
                <span className="w-6 h-6 rounded-full bg-white group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center text-slate-400 border border-slate-200 transition">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Cart Section */}
      <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">
        {/* Cart Header & Type Selector */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-sky-600" />
              Order Ticket
            </h2>
            <span className="text-xs text-slate-500 font-semibold">{cart.length} items</span>
          </div>

          {/* Order Type Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-200 p-1 rounded-xl text-xs font-semibold">
            {[
              { type: OrderType.DINE_IN, label: t.restaurant.dineIn },
              { type: OrderType.TAKEAWAY, label: t.restaurant.takeaway },
              { type: OrderType.DELIVERY, label: t.restaurant.delivery },
            ].map((ot) => (
              <button
                key={ot.type}
                onClick={() => setOrderType(ot.type)}
                className={`py-1.5 rounded-lg transition ${
                  orderType === ot.type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                {ot.label}
              </button>
            ))}
          </div>

          {/* Table Selector for Dine-in */}
          {orderType === OrderType.DINE_IN && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                {t.restaurant.tableNumber}
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-sky-500"
              >
                {tables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.tableNumber} ({tbl.section}) — {tbl.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          <input
            type="text"
            placeholder="Customer Name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
          />
        </div>

        {/* Success Alert */}
        {successOrderNumber && (
          <div className="m-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              Order <strong>{successOrderNumber}</strong> submitted and sent to kitchen!
            </span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 p-4 overflow-y-auto divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <Coffee className="w-8 h-8 mb-2 stroke-1" />
              <span>Select items from menu to start order</span>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.menuItemId} className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-xs truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {item.price.toFixed(2)} x {item.quantity} = {(item.price * item.quantity).toFixed(2)}{' '}
                    {user?.organization?.currency || 'ETB'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-200 text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-200 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.menuItemId)}
                    className="text-slate-400 hover:text-red-500 transition p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Submit */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>{t.common.subtotal}</span>
              <span className="font-semibold text-slate-800">
                {subtotal.toFixed(2)} {user?.organization?.currency || 'ETB'}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>{t.common.tax} (15% VAT)</span>
              <span className="font-semibold text-slate-800">
                {tax.toFixed(2)} {user?.organization?.currency || 'ETB'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>{t.common.total}</span>
              <span className="text-emerald-700">
                {total.toFixed(2)} {user?.organization?.currency || 'ETB'}
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmitOrder}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-xs uppercase tracking-wide transition disabled:opacity-50"
          >
            {isSubmitting ? t.common.loading : t.restaurant.sendToKitchen}
          </button>
        </div>
      </div>
    </div>
  );
}
