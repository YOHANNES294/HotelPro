export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  IN_KITCHEN = 'IN_KITCHEN',
  READY = 'READY',
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum KitchenItemStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED',
}

export interface DiningTableDTO {
  id: string;
  branchId: string;
  tableNumber: string;
  capacity: number;
  section: string; // e.g. "Main Dining", "Terrace", "Bar"
  status: TableStatus;
  isActive: boolean;
}

export interface MenuCategoryDTO {
  id: string;
  branchId: string;
  name: string;
  nameAmharic?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItemDTO {
  id: string;
  categoryId: string;
  name: string;
  nameAmharic?: string | null;
  description?: string | null;
  descriptionAmharic?: string | null;
  price: string;
  imageUrl?: string | null;
  isAvailable: boolean;
  preparationMinutes: number;
  category?: MenuCategoryDTO;
}

export interface OrderItemDTO {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes?: string | null;
  status: KitchenItemStatus;
  menuItem?: MenuItemDTO;
}

export interface OrderDTO {
  id: string;
  organizationId: string;
  branchId: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  tableId?: string | null;
  waiterId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string;
  notes?: string | null;
  table?: DiningTableDTO | null;
  items: OrderItemDTO[];
  createdAt: string;
}

export interface KitchenTicketDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber?: string | null;
  orderType: OrderType;
  status: OrderStatus;
  notes?: string | null;
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    notes?: string | null;
    status: KitchenItemStatus;
  }>;
  createdAt: string;
}
