
-- Function to handle inventory transactions and update stock
CREATE OR REPLACE FUNCTION public.create_inventory_transaction(
  item_id_param UUID,
  transaction_type_param TEXT,
  quantity_param INTEGER,
  previous_stock_param INTEGER,
  new_stock_param INTEGER,
  praxis_id_param UUID,
  notes_param TEXT,
  created_by_param UUID,
  unit_price_param NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  -- Create the transaction record
  INSERT INTO public.inventory_transactions (
    item_id,
    transaction_type,
    quantity,
    previous_stock,
    new_stock,
    praxis_id,
    notes,
    created_by,
    unit_price
  ) VALUES (
    item_id_param,
    transaction_type_param,
    quantity_param,
    previous_stock_param,
    new_stock_param,
    praxis_id_param,
    notes_param,
    created_by_param,
    unit_price_param
  )
  RETURNING id INTO transaction_id;

  -- Update the item's current stock
  UPDATE public.inventory_items
  SET current_stock = new_stock_param,
      updated_at = now()
  WHERE id = item_id_param;

  RETURN transaction_id;
END;
$$;

-- Function to process order receipt
CREATE OR REPLACE FUNCTION public.process_order_receipt(
  order_id_param UUID,
  items_param JSONB[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_record JSONB;
  item_id UUID;
  received_qty INTEGER;
  praxis_id_val UUID;
  created_by_val UUID;
  current_stock_val INTEGER;
BEGIN
  -- Get the praxis_id and created_by from the order
  SELECT o.praxis_id, o.created_by INTO praxis_id_val, created_by_val
  FROM public.inventory_orders o
  WHERE o.id = order_id_param;
  
  -- Update order status to delivered if not already
  UPDATE public.inventory_orders
  SET status = 'delivered',
      actual_delivery_date = CURRENT_DATE
  WHERE id = order_id_param
    AND status <> 'delivered';
    
  -- Process each item
  FOREACH item_record IN ARRAY items_param
  LOOP
    item_id := (item_record->>'id')::UUID;
    received_qty := (item_record->>'received_quantity')::INTEGER;
    
    -- Update the order item's received quantity
    UPDATE public.inventory_order_items
    SET received_quantity = received_qty
    WHERE id = item_id;
    
    -- Get current stock of the inventory item
    SELECT current_stock INTO current_stock_val
    FROM public.inventory_items
    WHERE id = (
      SELECT item_id 
      FROM public.inventory_order_items 
      WHERE id = item_id
    );
    
    -- Create a purchase transaction to increase inventory
    IF received_qty > 0 THEN
      PERFORM public.create_inventory_transaction(
        (SELECT item_id FROM public.inventory_order_items WHERE id = item_id),
        'purchase',
        received_qty,
        current_stock_val,
        current_stock_val + received_qty,
        praxis_id_val,
        'Order receipt: ' || order_id_param::TEXT,
        created_by_val,
        (SELECT unit_price FROM public.inventory_order_items WHERE id = item_id)
      );
    END IF;
  END LOOP;
END;
$$;
