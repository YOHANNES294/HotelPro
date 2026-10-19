export enum Role {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  GENERAL_MANAGER = 'GENERAL_MANAGER',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  FRONT_DESK = 'FRONT_DESK',
  RECEPTIONIST = 'RECEPTIONIST',
  WAITER = 'WAITER',
  CASHIER = 'CASHIER',
  KITCHEN_STAFF = 'KITCHEN_STAFF',
  HOUSEKEEPING = 'HOUSEKEEPING',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  AUDITOR = 'AUDITOR',
}

export enum Permission {
  // Tenant & Organization
  MANAGE_ORGANIZATION = 'org:manage',
  MANAGE_BRANCHES = 'branches:manage',
  MANAGE_USERS = 'users:manage',
  VIEW_AUDIT_LOGS = 'audit:view',

  // Hotel Front-Desk & Rooms
  VIEW_ROOMS = 'rooms:view',
  MANAGE_ROOMS = 'rooms:manage',
  VIEW_RESERVATIONS = 'reservations:view',
  CREATE_RESERVATIONS = 'reservations:create',
  UPDATE_RESERVATIONS = 'reservations:update',
  CHECK_IN_OUT = 'reservations:check_in_out',
  MANAGE_HOUSEKEEPING = 'housekeeping:manage',

  // Restaurant & POS
  VIEW_TABLES = 'tables:view',
  MANAGE_TABLES = 'tables:manage',
  VIEW_MENUS = 'menus:view',
  MANAGE_MENUS = 'menus:manage',
  CREATE_ORDERS = 'orders:create',
  UPDATE_ORDERS = 'orders:update',
  CANCEL_ORDERS = 'orders:cancel',
  VIEW_KITCHEN_DISPLAY = 'kitchen:view',
  UPDATE_KITCHEN_STATUS = 'kitchen:update',

  // Inventory & Purchasing
  VIEW_INVENTORY = 'inventory:view',
  MANAGE_INVENTORY = 'inventory:manage',
  ADJUST_STOCK = 'inventory:adjust',
  MANAGE_SUPPLIERS = 'suppliers:manage',

  // Financials & Shifts
  VIEW_PAYMENTS = 'payments:view',
  PROCESS_PAYMENTS = 'payments:process',
  PROCESS_REFUNDS = 'payments:refund',
  MANAGE_SHIFTS = 'shifts:manage',
  VIEW_REPORTS = 'reports:view',
  EXPORT_REPORTS = 'reports:export',
}

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string;
  branchId?: string | null;
  permissions: Permission[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
