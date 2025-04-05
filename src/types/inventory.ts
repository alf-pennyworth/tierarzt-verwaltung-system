
export interface InventoryItem {
  id: string;
  praxis_id: string;
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  unit_price?: number;
  expiry_date?: string;
  location?: string;
  supplier?: string;
  last_ordered?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface InventoryTransaction {
  id: string;
  praxis_id: string;
  item_id: string;
  transaction_type: string;
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
