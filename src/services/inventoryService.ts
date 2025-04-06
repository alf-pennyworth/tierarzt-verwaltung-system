
import { supabase } from "@/integrations/supabase/client";
import { 
  InventoryItem, 
  InventoryTransaction, 
  Supplier, 
  InventoryOrder, 
  OrderItem,
  TransactionType
} from "@/types/inventory";

// Inventory Items
export const getInventoryItems = async () => {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error) throw error;
  return data as InventoryItem[];
};

export const getInventoryItem = async (id: string) => {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as InventoryItem;
};

export const createInventoryItem = async (item: Omit<InventoryItem, "id" | "created_at" | "updated_at">) => {
  const { data, error } = await supabase
    .from("inventory_items")
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data as InventoryItem;
};

export const updateInventoryItem = async (id: string, item: Partial<InventoryItem>) => {
  const { data, error } = await supabase
    .from("inventory_items")
    .update(item)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as InventoryItem;
};

export const deleteInventoryItem = async (id: string) => {
  const { error } = await supabase
    .from("inventory_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  return true;
};

export const getLowStockItems = async () => {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .is("deleted_at", null)
    .lte("current_stock", supabase.rpc("greatest", { a: 0, b: "minimum_stock" }))
    .order("name");

  if (error) throw error;
  return data as InventoryItem[];
};

export const getExpiringItems = async (daysThreshold: number = 30) => {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .is("deleted_at", null)
    .lt("expiry_date", thresholdDate.toISOString())
    .order("expiry_date");

  if (error) throw error;
  return data as InventoryItem[];
};

// Inventory Transactions
export const getItemTransactions = async (itemId: string) => {
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as InventoryTransaction[];
};

export const createTransaction = async (
  itemId: string, 
  transactionType: TransactionType, 
  quantity: number, 
  praxisId: string,
  createdBy: string,
  notes?: string,
  unitPrice?: number
) => {
  // First get the current stock
  const { data: item, error: itemError } = await supabase
    .from("inventory_items")
    .select("current_stock")
    .eq("id", itemId)
    .single();

  if (itemError) throw itemError;
  
  const previousStock = item.current_stock;
  let newStock = previousStock;
  
  // Calculate new stock based on transaction type
  switch (transactionType) {
    case "purchase":
    case "adjustment":
      newStock = previousStock + quantity;
      break;
    case "use":
    case "expired":
    case "return":
      newStock = Math.max(0, previousStock - quantity);
      break;
  }
  
  // Call the stored procedure to update inventory
  const { data, error } = await supabase.rpc("create_inventory_transaction", {
    item_id_param: itemId,
    transaction_type_param: transactionType,
    quantity_param: quantity,
    previous_stock_param: previousStock,
    new_stock_param: newStock,
    praxis_id_param: praxisId,
    notes_param: notes || null,
    created_by_param: createdBy,
    unit_price_param: unitPrice || null
  });

  if (error) throw error;
  return data;
};

// Suppliers
export const getSuppliers = async () => {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error) throw error;
  return data as Supplier[];
};

export const getSupplier = async (id: string) => {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Supplier;
};

export const createSupplier = async (supplier: Omit<Supplier, "id" | "created_at" | "updated_at">) => {
  const { data, error } = await supabase
    .from("suppliers")
    .insert(supplier)
    .select()
    .single();

  if (error) throw error;
  return data as Supplier;
};

export const updateSupplier = async (id: string, supplier: Partial<Supplier>) => {
  const { data, error } = await supabase
    .from("suppliers")
    .update(supplier)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Supplier;
};

export const deleteSupplier = async (id: string) => {
  const { error } = await supabase
    .from("suppliers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  return true;
};

// Orders
export const getOrders = async () => {
  const { data, error } = await supabase
    .from("inventory_orders")
    .select(`
      *,
      supplier:supplier_id (name)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const getOrder = async (id: string) => {
  const { data, error } = await supabase
    .from("inventory_orders")
    .select(`
      *,
      supplier:supplier_id (id, name)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const getOrderItems = async (orderId: string) => {
  const { data, error } = await supabase
    .from("inventory_order_items")
    .select(`
      *,
      item:item_id (id, name, unit)
    `)
    .eq("order_id", orderId);

  if (error) throw error;
  return data;
};

export const createOrder = async (
  order: Omit<InventoryOrder, "id" | "created_at" | "updated_at">,
  items: Array<Omit<OrderItem, "id" | "order_id">>
) => {
  // Create the order
  const { data, error } = await supabase
    .from("inventory_orders")
    .insert(order)
    .select()
    .single();

  if (error) throw error;

  const orderId = data.id;
  
  // Add the order items
  const orderItems = items.map(item => ({
    ...item,
    order_id: orderId
  }));

  const { error: itemsError } = await supabase
    .from("inventory_order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;

  return data;
};

export const updateOrderStatus = async (id: string, status: 'pending' | 'ordered' | 'delivered' | 'cancelled', actualDeliveryDate?: string) => {
  const updates: Partial<InventoryOrder> = { status };
  if (status === 'delivered' && actualDeliveryDate) {
    updates.actual_delivery_date = actualDeliveryDate;
  }

  const { data, error } = await supabase
    .from("inventory_orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const receiveOrderItems = async (
  orderId: string,
  items: Array<{ id: string, received_quantity: number }>
) => {
  // Call the stored procedure to process the receipt
  const { error } = await supabase.rpc("process_order_receipt", {
    order_id_param: orderId,
    items_param: items
  });

  if (error) throw error;
  return true;
};

// Categories and Units (for dropdowns and filtering)
export const getInventoryCategories = async () => {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("category")
    .is("deleted_at", null)
    .not("category", "is", null);

  if (error) throw error;
  return [...new Set(data.map(item => item.category))];
};

export const getInventoryUnits = async () => {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("unit")
    .is("deleted_at", null);

  if (error) throw error;
  return [...new Set(data.map(item => item.unit))];
};

// Dashboard stats
export const getInventoryStats = async () => {
  const { data: totalItems, error: totalError } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact" })
    .is("deleted_at", null);

  if (totalError) throw totalError;

  const { data: lowStock, error: lowError } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact" })
    .is("deleted_at", null)
    .lte("current_stock", supabase.rpc("greatest", { a: 0, b: "minimum_stock" }));

  if (lowError) throw lowError;

  const { data: pendingOrders, error: pendingError } = await supabase
    .from("inventory_orders")
    .select("id", { count: "exact" })
    .in("status", ["pending", "ordered"]);

  if (pendingError) throw pendingError;

  // Get the count of transactions in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: recentTransactions, error: transError } = await supabase
    .from("inventory_transactions")
    .select("id", { count: "exact" })
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (transError) throw transError;

  return {
    totalItems: totalItems.length,
    lowStockItems: lowStock.length,
    pendingOrders: pendingOrders.length,
    recentTransactions: recentTransactions.length
  };
};
