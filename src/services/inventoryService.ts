import { supabase } from "@/integrations/supabase/client";
import { 
  MedikamentItem,
  InventoryTransaction, 
  Supplier, 
  InventoryOrder, 
  OrderItem,
  TransactionType
} from "@/types/inventory";

// Inventory Items (using medikamente table)
export const getInventoryItems = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, praxisId] = queryKey;
  
  const query = supabase
    .from("medikamente")
    .select("*")
    .is("deleted_at", null)
    .order("name");
  
  // Filter by praxis_id if provided
  if (praxisId) {
    query.eq("praxis_id", praxisId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as MedikamentItem[];
};

export const getInventoryItem = async (id: string) => {
  const { data, error } = await supabase
    .from("medikamente")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as MedikamentItem;
};

export const createInventoryItem = async (item: Partial<MedikamentItem> & { name: string; masseinheit: string }) => {
  const { data, error } = await supabase
    .from("medikamente")
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data as MedikamentItem;
};

export const updateInventoryItem = async (id: string, item: Partial<MedikamentItem>) => {
  const { data, error } = await supabase
    .from("medikamente")
    .update(item)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MedikamentItem;
};

export const deleteInventoryItem = async (id: string) => {
  const { error } = await supabase
    .from("medikamente")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  return true;
};

export const getLowStockItems = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, praxisId] = queryKey;
  
  const query = supabase
    .from("medikamente")
    .select("*")
    .is("deleted_at", null)
    .lt("current_stock", "minimum_stock")
    .order("name");
  
  // Filter by praxis_id if provided
  if (praxisId) {
    query.eq("praxis_id", praxisId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as MedikamentItem[];
};

export const getExpiringItems = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, daysThresholdString = "30", praxisId] = queryKey;
  
  const daysThreshold = parseInt(daysThresholdString, 10);
  
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  const query = supabase
    .from("medikamente")
    .select("*")
    .is("deleted_at", null)
    .lt("expiry_date", thresholdDate.toISOString())
    .order("expiry_date");

  // Filter by praxis_id if provided
  if (praxisId) {
    query.eq("praxis_id", praxisId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as MedikamentItem[];
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
    .from("medikamente")
    .select("current_stock")
    .eq("id", itemId)
    .single();

  if (itemError) {
    console.error("Error fetching item:", itemError);
    throw new Error(`Failed to get current stock: ${itemError.message}`);
  }
  
  if (!item) throw new Error("Item not found");
  
  // Safely access current_stock with proper type checking
  const previousStock = item.current_stock ?? 0;
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
  
  // Create the transaction directly
  const { data: transactionData, error: transError } = await supabase
    .from("inventory_transactions")
    .insert({
      item_id: itemId,
      transaction_type: transactionType,
      quantity: quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      praxis_id: praxisId,
      notes: notes || null,
      created_by: createdBy,
      unit_price: unitPrice || null,
      transaction_date: new Date().toISOString()
    })
    .select();

  if (transError) throw transError;
  
  // Update the stock in the medikamente table
  const { error: updateError } = await supabase
    .from("medikamente")
    .update({
      current_stock: newStock,
      updated_at: new Date().toISOString()
    })
    .eq("id", itemId);
    
  if (updateError) throw updateError;
  
  return transactionData;
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
  return data as (InventoryOrder & { supplier: { name: string } })[];
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
  return data as (InventoryOrder & { supplier: { id: string; name: string } });
};

export const getOrderItems = async (orderId: string) => {
  const { data, error } = await supabase
    .from("inventory_order_items")
    .select(`
      *,
      item:item_id (id, name, masseinheit)
    `)
    .eq("order_id", orderId);

  if (error) throw error;
  // We need to cast the result to ensure TypeScript is happy
  return data as unknown as (OrderItem & { item: { id: string; name: string; masseinheit: string } })[];
};

export const createOrder = async ({
  order,
  items
}: {
  order: Omit<InventoryOrder, "id" | "created_at" | "updated_at">,
  items: Array<Omit<OrderItem, "id" | "order_id">>
}) => {
  // Modify the order object to handle non-UUID values for created_by
  // This is a workaround when we don't have a valid UUID
  const orderData = { ...order };
  
  // If created_by is not a valid UUID format (like an email), set it to null
  // The database will handle this with defaults or constraints
  if (orderData.created_by && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(orderData.created_by)) {
    console.log("Created by is not a valid UUID format:", orderData.created_by);
    orderData.created_by = null;
  }

  // Create the order
  const { data, error } = await supabase
    .from("inventory_orders")
    .insert(orderData)
    .select()
    .single();

  if (error) {
    console.error("Error creating order:", error);
    throw error;
  }

  const orderId = data.id;
  
  try {
    // Add the order items - use the medikamente table
    const orderItems = items.map(item => ({
      ...item,
      order_id: orderId
    }));

    const { error: itemsError } = await supabase
      .from("inventory_order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      throw itemsError;
    }

    return data as InventoryOrder;
  } catch (itemError) {
    // If adding items fails, we should clean up the order to prevent orphaned orders
    console.error("Error adding order items:", itemError);
    
    // Delete the order we just created
    const { error: deleteError } = await supabase
      .from("inventory_orders")
      .delete()
      .eq("id", orderId);
      
    if (deleteError) {
      console.error("Failed to clean up order after item error:", deleteError);
    }
    
    throw itemError;
  }
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
  return data as InventoryOrder;
};

export const receiveOrderItems = async (
  orderId: string,
  items: Array<{ id: string, received_quantity: number }>
) => {
  // We'll implement this function directly instead of using an RPC call
  // Get the order information
  const { data: orderData, error: orderError } = await supabase
    .from("inventory_orders")
    .select("*")
    .eq("id", orderId)
    .single();
    
  if (orderError) throw orderError;

  // Process each item
  for (const item of items) {
    if (item.received_quantity <= 0) continue;
    
    // Get order item details
    const { data: orderItemData, error: orderItemError } = await supabase
      .from("inventory_order_items")
      .select("*, item:item_id (*)")
      .eq("id", item.id)
      .single();
      
    if (orderItemError) throw orderItemError;
    
    // Update the order item
    const { error: updateError } = await supabase
      .from("inventory_order_items")
      .update({ received_quantity: item.received_quantity })
      .eq("id", item.id);
      
    if (updateError) throw updateError;
    
    // Create a transaction and update stock
    await createTransaction(
      orderItemData.item_id,
      'purchase',
      item.received_quantity,
      orderData.praxis_id,
      orderData.created_by,
      `Received from order #${orderData.order_number || orderData.id}`,
      orderItemData.unit_price
    );
  }
  
  // Check if all items are fully received
  const { data: pendingItems, error: pendingError } = await supabase
    .from("inventory_order_items")
    .select("*")
    .eq("order_id", orderId)
    .lt("received_quantity", "quantity");
    
  if (pendingError) throw pendingError;
  
  // If no pending items, mark order as delivered
  if (pendingItems.length === 0) {
    await updateOrderStatus(orderId, 'delivered', new Date().toISOString());
  }
  
  return true;
};

// Categories and Units (for dropdowns and filtering)
export const getInventoryCategories = async () => {
  const { data, error } = await supabase
    .from("medication_types")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return data;
};

export const getInventoryUnits = async () => {
  const { data, error } = await supabase
    .from("medikamente")
    .select("masseinheit")
    .is("deleted_at", null);

  if (error) throw error;
  return [...new Set(data.map(item => item.masseinheit))];
};

// Dashboard stats
export const getInventoryStats = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, praxisId] = queryKey;
  
  const queryTotal = supabase
    .from("medikamente")
    .select("id", { count: "exact" })
    .is("deleted_at", null);
  
  // Filter by praxis_id if provided
  if (praxisId) {
    queryTotal.eq("praxis_id", praxisId);
  }
  
  const { data: totalItems, error: totalError } = await queryTotal;

  if (totalError) throw totalError;

  // Using simple comparison for low stock
  const queryLow = supabase
    .from("medikamente")
    .select("id", { count: "exact" })
    .is("deleted_at", null)
    .lte("current_stock", "minimum_stock");
  
  // Filter by praxis_id if provided
  if (praxisId) {
    queryLow.eq("praxis_id", praxisId);
  }
  
  const { data: lowStock, error: lowError } = await queryLow;

  if (lowError) throw lowError;

  const queryPending = supabase
    .from("inventory_orders")
    .select("id", { count: "exact" })
    .in("status", ["pending", "ordered"]);
  
  // Filter by praxis_id if provided
  if (praxisId) {
    queryPending.eq("praxis_id", praxisId);
  }
  
  const { data: pendingOrders, error: pendingError } = await queryPending;

  if (pendingError) throw pendingError;

  // Get the count of transactions in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const queryTrans = supabase
    .from("inventory_transactions")
    .select("id", { count: "exact" })
    .gte("created_at", thirtyDaysAgo.toISOString());
  
  // Filter by praxis_id if provided
  if (praxisId) {
    queryTrans.eq("praxis_id", praxisId);
  }
  
  const { data: recentTransactions, error: transError } = await queryTrans;

  if (transError) throw transError;

  return {
    totalItems: totalItems.length,
    lowStockItems: lowStock.length,
    pendingOrders: pendingOrders.length,
    recentTransactions: recentTransactions.length
  };
};
