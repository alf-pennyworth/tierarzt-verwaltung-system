export interface MedikamentItem {
  id: string;
  praxis_id: string;
  name: string;
  masseinheit: string;
  zulassungsnummer?: string;
  packungs_id?: string;
  eingangs_nr?: string;
  packungsbeschreibung?: string;
  medication_type_id?: string;
  description?: string;
  current_stock: number;
  minimum_stock: number;
  unit_price?: number;
  expiry_date?: string;
  location?: string;
  last_ordered?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  sku?: string;
  category?: string;
  unit?: string;
}

export interface InventoryTransaction {
  id: string;
  praxis_id: string;
  item_id: string;
  transaction_type: TransactionType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_price?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  transaction_date: string;
}

export interface Supplier {
  id: string;
  praxis_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface InventoryOrder {
  id: string;
  praxis_id: string;
  supplier_id?: string;
  order_number?: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status: 'pending' | 'ordered' | 'delivered' | 'cancelled';
  total_amount?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity?: number;
  notes?: string;
}

export type TransactionType = 'purchase' | 'use' | 'adjustment' | 'expired' | 'return';
