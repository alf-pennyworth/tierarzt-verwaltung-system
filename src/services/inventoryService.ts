
import { supabase } from '@/integrations/supabase/client';
import { 
  MedikamentItem, 
  Supplier, 
  InventoryOrder, 
  OrderItem, 
  InventoryTransaction 
} from '@/types/inventory';

// Inventory Items (using medikamente table)
export const getInventoryItems = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, praxisId] = queryKey;
  
  console.log("Fetching inventory items for praxis:", praxisId);
  
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

  if (error) {
    console.error("Error fetching inventory items:", error);
    throw error;
  }
  
  console.log(`Fetched ${data?.length || 0} inventory items`);
  return data as MedikamentItem[];
};

// Get low stock items
export const getLowStockItems = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, praxisId] = queryKey;
  
  console.log("Fetching low stock items for praxis:", praxisId);
  
  const query = supabase
    .from("medikamente")
    .select("*")
    .is("deleted_at", null)
    .lt("current_stock", "minimum_stock") // No raw() method needed
    .order("name");
  
  if (praxisId) {
    query.eq("praxis_id", praxisId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching low stock items:", error);
    throw error;
  }
  
  console.log(`Fetched ${data?.length || 0} low stock items`);
  return data as MedikamentItem[];
};

// Get expiring items
export const getExpiringItems = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, daysUntilExpiry, praxisId] = queryKey;
  const days = parseInt(daysUntilExpiry) || 30;
  
  console.log(`Fetching items expiring within ${days} days for praxis:`, praxisId);
  
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  const query = supabase
    .from("medikamente")
    .select("*")
    .is("deleted_at", null)
    .not("expiry_date", "is", null)
    .lte("expiry_date", expiryDate.toISOString().split('T')[0])
    .order("expiry_date");
  
  if (praxisId) {
    query.eq("praxis_id", praxisId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching expiring items:", error);
    throw error;
  }
  
  console.log(`Fetched ${data?.length || 0} expiring items`);
  return data as MedikamentItem[];
};

// Get inventory statistics
export const getInventoryStats = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, praxisId] = queryKey;
  
  console.log("Fetching inventory statistics for praxis:", praxisId);
  
  try {
    // Get total items count
    const { count: totalItems, error: countError } = await supabase
      .from("medikamente")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("praxis_id", praxisId);
    
    if (countError) throw countError;
    
    // Get low stock items count
    const { count: lowStockItems, error: lowStockError } = await supabase
      .from("medikamente")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .lt("current_stock", "minimum_stock") // No raw() method needed
      .eq("praxis_id", praxisId);
    
    if (lowStockError) throw lowStockError;
    
    // Get pending orders count
    const { count: pendingOrders, error: pendingOrdersError } = await supabase
      .from("inventory_orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "ordered"])
      .eq("praxis_id", praxisId);
    
    if (pendingOrdersError) throw pendingOrdersError;
    
    // Get recent transactions count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentTransactions, error: transactionsError } = await supabase
      .from("inventory_transactions")
      .select("*", { count: "exact", head: true })
      .gte("transaction_date", thirtyDaysAgo.toISOString().split('T')[0])
      .eq("praxis_id", praxisId);
    
    if (transactionsError) throw transactionsError;
    
    return {
      totalItems: totalItems || 0,
      lowStockItems: lowStockItems || 0,
      pendingOrders: pendingOrders || 0,
      recentTransactions: recentTransactions || 0
    };
  } catch (error) {
    console.error("Error fetching inventory statistics:", error);
    throw error;
  }
};

// Suppliers
export const getSuppliers = async () => {
  console.log("Fetching suppliers");
  
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .is("deleted_at", null)
    .order("name");
  
  if (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
  
  console.log(`Fetched ${data?.length || 0} suppliers`);
  return data as Supplier[];
};

export const createSupplier = async (supplier: Partial<Supplier>) => {
  console.log("Creating supplier:", supplier);

  // Ensure required fields are present
  if (!supplier.name || !supplier.praxis_id) {
    throw new Error("Supplier name and praxis_id are required");
  }
  
  // FIX: Use a type assertion to satisfy TypeScript
  const supplierData = {
    name: supplier.name,
    praxis_id: supplier.praxis_id,
    contact_person: supplier.contact_person,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address,
    website: supplier.website,
    notes: supplier.notes
  };
  
  const { data, error } = await supabase
    .from("suppliers")
    .insert(supplierData)
    .select();
  
  if (error) {
    console.error("Error creating supplier:", error);
    throw error;
  }
  
  console.log("Supplier created successfully:", data?.[0]);
  return data?.[0] as Supplier;
};

// Orders
export const getOrders = async () => {
  console.log("Fetching orders");
  
  const { data, error } = await supabase
    .from("inventory_orders")
    .select(`
      *,
      supplier:suppliers(*)
    `)
    .order("order_date", { ascending: false });
  
  if (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
  
  console.log(`Fetched ${data?.length || 0} orders`);
  return data as InventoryOrder[];
};

export const getOrder = async (orderId: string) => {
  console.log("Fetching order:", orderId);
  
  const { data, error } = await supabase
    .from("inventory_orders")
    .select(`
      *,
      supplier:suppliers(*)
    `)
    .eq("id", orderId)
    .single();
  
  if (error) {
    console.error("Error fetching order:", error);
    throw error;
  }
  
  console.log("Order retrieved:", data);
  return data as InventoryOrder;
};

export const getOrderItems = async (orderId: string) => {
  console.log("Fetching order items for order:", orderId);
  
  const { data, error } = await supabase
    .from("inventory_order_items")
    .select(`
      *,
      item:medikamente(id, name, masseinheit)
    `)
    .eq("order_id", orderId);
  
  if (error) {
    console.error("Error fetching order items:", error);
    throw error;
  }
  
  console.log(`Fetched ${data?.length || 0} order items`);
  // Use type assertion to handle the complex join result
  return data as unknown as OrderItem[];
};

export const createOrder = async ({ 
  order, 
  items 
}: { 
  order: Partial<InventoryOrder>; 
  items: Partial<OrderItem>[] 
}) => {
  console.log("Creating order:", { order, items });

  // Ensure required fields are present
  if (!order.praxis_id) {
    throw new Error("Order praxis_id is required");
  }

  if (!order.created_by) {
    throw new Error("Order created_by is required");
  }
  
  // FIX: Create a complete order object with only the required fields
  const orderData = {
    praxis_id: order.praxis_id,
    created_by: order.created_by,
    supplier_id: order.supplier_id,
    order_date: order.order_date || new Date().toISOString().split('T')[0],
    expected_delivery_date: order.expected_delivery_date,
    order_number: order.order_number,
    notes: order.notes,
    status: order.status || "pending",
    total_amount: order.total_amount
  };
  
  // Start a transaction
  const { data: orderData, error: orderError } = await supabase
    .from("inventory_orders")
    .insert(orderData)
    .select();
  
  if (orderError) {
    console.error("Error creating order:", orderError);
    throw orderError;
  }
  
  const orderId = orderData[0].id;
  console.log("Order created with ID:", orderId);
  
  // Validate order items
  const validatedItems = items.map(item => {
    if (!item.item_id) throw new Error("Order item item_id is required");
    if (!item.quantity) throw new Error("Order item quantity is required");
    if (!item.unit_price) throw new Error("Order item unit_price is required");
    if (!item.total_price) throw new Error("Order item total_price is required");
    
    return {
      order_id: orderId,
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      notes: item.notes
    };
  });
  
  // Add order items with the order ID
  const { data: itemsData, error: itemsError } = await supabase
    .from("inventory_order_items")
    .insert(validatedItems)
    .select();
  
  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    throw itemsError;
  }
  
  console.log(`Created ${itemsData?.length || 0} order items`);
  
  return {
    order: orderData[0],
    items: itemsData
  };
};

export const updateOrderStatus = async (
  orderId: string, 
  status: 'pending' | 'ordered' | 'delivered' | 'cancelled',
  actualDeliveryDate?: string
) => {
  console.log(`Updating order ${orderId} status to ${status}`);
  
  const updateData: any = { status };
  
  if (status === 'delivered' && actualDeliveryDate) {
    updateData.actual_delivery_date = actualDeliveryDate;
  }
  
  const { data, error } = await supabase
    .from("inventory_orders")
    .update(updateData)
    .eq("id", orderId)
    .select();
  
  if (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
  
  console.log("Order status updated successfully:", data?.[0]);
  return data?.[0] as InventoryOrder;
};

export const receiveOrderItems = async (
  orderId: string, 
  items: Array<{ id: string, received_quantity: number }>
) => {
  console.log(`Receiving items for order ${orderId}:`, items);
  
  // Start a transaction
  try {
    // 1. Get the order to check its status
    const { data: orderData, error: orderError } = await supabase
      .from("inventory_orders")
      .select("*")
      .eq("id", orderId)
      .single();
    
    if (orderError) throw orderError;
    
    if (orderData.status === 'delivered' || orderData.status === 'cancelled') {
      throw new Error(`Cannot receive items for an order with status ${orderData.status}`);
    }
    
    // 2. Update received quantities for the items
    for (const item of items) {
      // Update the order item
      const { error: updateError } = await supabase
        .from("inventory_order_items")
        .update({ received_quantity: item.received_quantity })
        .eq("id", item.id);
      
      if (updateError) throw updateError;
      
      // Get the order item details to create the inventory transaction
      const { data: orderItemData, error: itemError } = await supabase
        .from("inventory_order_items")
        .select("*, item:medikamente!item_id(*)")
        .eq("id", item.id)
        .single();
      
      if (itemError) throw itemError;
      
      if (item.received_quantity > 0) {
        // Get current stock for the item
        const { data: inventoryItem, error: inventoryError } = await supabase
          .from("medikamente")
          .select("current_stock")
          .eq("id", orderItemData.item_id)
          .single();
        
        if (inventoryError) throw inventoryError;
        
        const previousStock = inventoryItem.current_stock;
        const newStock = previousStock + item.received_quantity;
        
        // Update the inventory item stock
        const { error: stockUpdateError } = await supabase
          .from("medikamente")
          .update({ 
            current_stock: newStock,
            last_ordered: new Date().toISOString().split('T')[0]
          })
          .eq("id", orderItemData.item_id);
        
        if (stockUpdateError) throw stockUpdateError;
        
        // Create inventory transaction record
        const { error: transactionError } = await supabase
          .from("inventory_transactions")
          .insert({
            praxis_id: orderData.praxis_id,
            item_id: orderItemData.item_id,
            transaction_type: 'purchase',
            quantity: item.received_quantity,
            previous_stock: previousStock,
            new_stock: newStock,
            unit_price: orderItemData.unit_price,
            notes: `Received from order #${orderId.substring(0, 8)}`,
            created_by: orderData.created_by,
            transaction_date: new Date().toISOString().split('T')[0]
          });
        
        if (transactionError) throw transactionError;
      }
    }
    
    // 3. Check if all items are received, update order status if needed
    const { data: allOrderItems, error: allItemsError } = await supabase
      .from("inventory_order_items")
      .select("quantity, received_quantity")
      .eq("order_id", orderId);
    
    if (allItemsError) throw allItemsError;
    
    const allReceived = allOrderItems.every(item => 
      item.received_quantity >= item.quantity
    );
    
    // If all items are received, mark the order as delivered
    if (allReceived) {
      const { error: statusError } = await supabase
        .from("inventory_orders")
        .update({ 
          status: 'delivered',
          actual_delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq("id", orderId);
      
      if (statusError) throw statusError;
    }
    
    return true;
  } catch (error) {
    console.error("Error receiving order items:", error);
    throw error;
  }
};

// Inventory categories and units
export const getInventoryCategories = async () => {
  console.log("Fetching inventory categories");
  
  // Fetch distinct categories from medikamente table
  const { data, error } = await supabase
    .from("medikamente")
    .select("category")
    .is("deleted_at", null)
    .not("category", "is", null)
    .order("category");
  
  if (error) {
    console.error("Error fetching inventory categories:", error);
    throw error;
  }
  
  // Extract unique categories
  const uniqueCategories = Array.from(
    new Set(data.filter(item => item.category).map(item => item.category))
  );
  
  console.log(`Fetched ${uniqueCategories.length} unique categories`);
  return uniqueCategories as string[];
};

export const getInventoryUnits = async () => {
  console.log("Fetching inventory units");
  
  // Fetch distinct units from medikamente table (masseinheit field)
  const { data, error } = await supabase
    .from("medikamente")
    .select("masseinheit")
    .is("deleted_at", null)
    .order("masseinheit");
  
  if (error) {
    console.error("Error fetching inventory units:", error);
    throw error;
  }
  
  // Extract unique units
  const uniqueUnits = Array.from(
    new Set(data.filter(item => item.masseinheit).map(item => item.masseinheit))
  );
  
  console.log(`Fetched ${uniqueUnits.length} unique units`);
  return uniqueUnits as string[];
};

// Create inventory item (using medikamente table)
export const createInventoryItem = async (item: Partial<MedikamentItem>) => {
  console.log("Creating inventory item:", item);

  // Ensure required fields are present
  if (!item.name || !item.masseinheit) {
    throw new Error("Item name and masseinheit are required");
  }
  
  // FIX: Create a complete object with required fields explicitly defined
  const itemData = {
    name: item.name,
    masseinheit: item.masseinheit,
    praxis_id: item.praxis_id,
    current_stock: item.current_stock ?? 0,
    minimum_stock: item.minimum_stock ?? 0,
    category: item.category,
    description: item.description,
    unit_price: item.unit_price,
    expiry_date: item.expiry_date,
    location: item.location,
    sku: item.sku,
    zulassungsnummer: item.zulassungsnummer,
    packungs_id: item.packungs_id,
    eingangs_nr: item.eingangs_nr,
    packungsbeschreibung: item.packungsbeschreibung,
    medication_type_id: item.medication_type_id
  };
  
  const { data, error } = await supabase
    .from("medikamente")
    .insert(itemData)
    .select();
  
  if (error) {
    console.error("Error creating inventory item:", error);
    throw error;
  }
  
  console.log("Inventory item created successfully:", data?.[0]);
  return data?.[0] as MedikamentItem;
};
