export enum SubscriptionTier {
  TRIAL = 'TRIAL',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
}

export interface BranchDTO {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  hasHotel: boolean;
  hasRestaurant: boolean;
  isActive: boolean;
  createdAt: string;
}
