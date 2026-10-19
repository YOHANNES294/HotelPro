import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../src/constants/theme';
import { apiRequest } from '../../src/services/api-client';
import { offlineStorage } from '../../src/services/sqlite-db';
import { syncService } from '../../src/services/offline-queue';
import { useAuth } from '../../src/context/auth-context';

interface MenuItem {
  id: string;
  nameEn: string;
  nameAm?: string;
  category: string;
  price: number;
}

interface TicketItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<TicketItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'NEW_ORDER' | 'ACTIVE_ORDERS'>('NEW_ORDER');
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  const loadData = async () => {
    // 1. Load active orders from SQLite cache first
    try {
      const cached = offlineStorage.getCachedOrders();
      if (cached && cached.length > 0) {
        setActiveOrders(cached);
      }
    } catch {}

    // 2. Fetch tables and menu from API
    try {
      const [tablesRes, menuRes, ordersRes] = await Promise.all([
        apiRequest('/api/v1/restaurants/tables'),
        apiRequest('/api/v1/restaurants/menu/items'),
        apiRequest('/api/v1/restaurants/orders?status=PENDING,CONFIRMED,PREPARING,READY'),
      ]);

      if (tablesRes.success && tablesRes.data) {
        setTables(tablesRes.data);
        if (tablesRes.data.length > 0 && !selectedTableId) {
          setSelectedTableId(tablesRes.data[0].id);
        }
      }

      if (menuRes.success && menuRes.data) {
        const mapped = menuRes.data.map((m: any) => ({
          id: m.id,
          nameEn: m.nameEn,
          nameAm: m.nameAm,
          category: m.category?.name || 'Mains',
          price: parseFloat(m.price),
        }));
        setMenuItems(mapped);
      }

      if (ordersRes.success && ordersRes.data) {
        setActiveOrders(ordersRes.data);
        offlineStorage.cacheOrders(ordersRes.data);
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { id: item.id, name: item.nameEn, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Order', 'Please add items to ticket first');
      return;
    }

    setIsSubmitting(true);
    const orderPayload = {
      tableId: selectedTableId || null,
      type: selectedTableId ? 'DINE_IN' : 'TAKEAWAY',
      items: cart.map((i) => ({
        menuItemId: i.id,
        quantity: i.quantity,
        unitPrice: i.price,
      })),
      notes: 'Mobile POS Order',
    };

    try {
      const res = await apiRequest('/api/v1/restaurants/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      if (res.success) {
        Alert.alert('Order Created', `Ticket submitted to kitchen successfully`);
        setCart([]);
        loadData();
      } else {
        // Enqueue offline action
        syncService.enqueueAction('CREATE_ORDER', orderPayload);
        Alert.alert('Offline Mode', 'Device is offline. Ticket queued and saved locally for auto-sync');
        setCart([]);
      }
    } catch {
      syncService.enqueueAction('CREATE_ORDER', orderPayload);
      Alert.alert('Offline Mode', 'Device is offline. Ticket queued and saved locally for auto-sync');
      setCart([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(menuItems.map((m) => m.category)))];
  const filteredMenu =
    selectedCategory === 'ALL'
      ? menuItems
      : menuItems.filter((m) => m.category === selectedCategory);

  return (
    <View style={styles.container}>
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'NEW_ORDER' && styles.tabBtnActive]}
          onPress={() => setActiveTab('NEW_ORDER')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'NEW_ORDER' && styles.tabBtnTextActive]}>
            Create Order
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE_ORDERS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE_ORDERS')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'ACTIVE_ORDERS' && styles.tabBtnTextActive]}>
            Active Tickets ({activeOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'NEW_ORDER' ? (
        <ScrollView style={styles.scrollArea}>
          <Text style={styles.label}>Select Dining Table</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableRow}>
            {tables.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tableChip,
                  selectedTableId === t.id && styles.tableChipActive,
                  t.status === 'OCCUPIED' && styles.tableChipOccupied,
                ]}
                onPress={() => setSelectedTableId(t.id)}
              >
                <Text
                  style={[
                    styles.tableChipText,
                    selectedTableId === t.id && styles.tableChipTextActive,
                  ]}
                >
                  Table {t.number}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { marginTop: 16 }]}>Menu Catalog</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, selectedCategory === c && styles.catChipActive]}
                onPress={() => setSelectedCategory(c)}
              >
                <Text style={[styles.catChipText, selectedCategory === c && styles.catChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.menuGrid}>
            {filteredMenu.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItemCard}
                onPress={() => addToCart(item)}
              >
                <View>
                  <Text style={styles.menuItemTitle}>{item.nameEn}</Text>
                  {item.nameAm && <Text style={styles.menuItemAm}>{item.nameAm}</Text>}
                </View>
                <View style={styles.menuItemPriceRow}>
                  <Text style={styles.menuItemPrice}>{item.price} ETB</Text>
                  <Text style={styles.addBtnText}>+ Add</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {cart.length > 0 && (
            <View style={styles.cartCard}>
              <Text style={styles.cartTitle}>Current Ticket Items</Text>
              {cart.map((i) => (
                <View key={i.id} style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{i.name}</Text>
                    <Text style={styles.cartItemSub}>{i.price} ETB each</Text>
                  </View>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(i.id, -1)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{i.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(i.id, 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemTotal}>{i.price * i.quantity} ETB</Text>
                </View>
              ))}

              <View style={styles.totalBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal</Text>
                  <Text style={styles.breakdownValue}>{subtotal.toFixed(2)} ETB</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>VAT (15%)</Text>
                  <Text style={styles.breakdownValue}>{vat.toFixed(2)} ETB</Text>
                </View>
                <View style={[styles.breakdownRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>{total.toFixed(2)} ETB</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitOrderBtn}
                onPress={handleSubmitOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitOrderText}>🚀 Send Ticket to Kitchen</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollArea}>
          <Text style={styles.label}>Active Dining & Takeaway Orders</Text>
          {activeOrders.map((o) => (
            <View key={o.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderNumber}>#{o.orderNumber || o.id.slice(0, 8)}</Text>
                  <Text style={styles.orderTable}>
                    {o.table?.number ? `Table ${o.table.number}` : 'Takeaway / Direct'}
                  </Text>
                </View>
                <View style={styles.orderStatusBadge}>
                  <Text style={styles.orderStatusText}>{o.status}</Text>
                </View>
              </View>

              <View style={styles.orderItemsBox}>
                {Array.isArray(o.items) &&
                  o.items.map((item: any, idx: number) => (
                    <Text key={idx} style={styles.orderItemText}>
                      • {item.quantity}x {item.menuItem?.nameEn || item.name || 'Item'}
                    </Text>
                  ))}
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.orderTotal}>
                  Total: {parseFloat(o.totalAmount || 0).toLocaleString()} ETB
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabToggleRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  scrollArea: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tableChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tableChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tableChipOccupied: {
    borderColor: Colors.warning,
  },
  tableChipText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  tableChipTextActive: {
    color: '#ffffff',
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  catChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.accent,
  },
  catChipText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  catChipTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  menuItemCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
    minHeight: 85,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  menuItemAm: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  menuItemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  menuItemPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.success,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  cartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  cartTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  cartItemSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
  },
  qtyBtn: {
    backgroundColor: Colors.surfaceLight,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  qtyValue: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cartItemTotal: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'right',
  },
  totalBreakdown: {
    marginTop: 12,
    gap: 4,
    paddingTop: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  breakdownValue: {
    color: Colors.text,
    fontSize: 12,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitOrderBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitOrderText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  orderTable: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  orderStatusBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderStatusText: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: 'bold',
  },
  orderItemsBox: {
    marginTop: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.surfaceLight,
    gap: 4,
  },
  orderItemText: {
    color: Colors.text,
    fontSize: 12,
  },
  orderFooter: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  orderTotal: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
