
-- Create a function to handle inventory transactions and update stock
CREATE OR REPLACE FUNCTION public.create_inventory_transaction(
  item_id_param UUID,
  transaction_type_param TEXT,
  quantity_param INTEGER,
  previous_stock_param INTEGER,
  new_stock_param INTEGER,
  praxis_id_param UUID,
  notes_param TEXT,
  created_by_param UUID,
  unit_price_param NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  -- Insert the transaction record
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
  ) RETURNING id INTO transaction_id;
  
  -- Update the medikamente's current_stock
  UPDATE public.medikamente
  SET current_stock = new_stock_param,
      updated_at = NOW()
  WHERE id = item_id_param;
  
  -- Return transaction info
  RETURN jsonb_build_object(
    'transaction_id', transaction_id,
    'item_id', item_id_param,
    'new_stock', new_stock_param
  );
END;
$$;

-- Create a function to handle receiving order items
CREATE OR REPLACE FUNCTION public.process_order_receipt(
  order_id_param UUID,
  items_param JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  item_data JSONB;
  current_stock INTEGER;
  new_stock INTEGER;
  item_id UUID;
  received_qty INTEGER;
  item_index INTEGER := 0;
  results JSONB := '[]';
BEGIN
  -- Get order information
  SELECT * INTO order_record FROM public.inventory_orders WHERE id = order_id_param;
  
  IF order_record IS NULL THEN
    RAISE EXCEPTION 'Order with ID % not found', order_id_param;
  END IF;
  
  -- Process each item
  FOR item_data IN SELECT * FROM jsonb_array_elements(items_param)
  LOOP
    item_id := (item_data->>'id')::UUID;
    received_qty := (item_data->>'received_quantity')::INTEGER;
    
    -- Skip if received_qty is 0
    IF received_qty > 0 THEN
      -- Get current item stock
      SELECT current_stock INTO current_stock FROM public.medikamente WHERE id = item_id;
      
      -- Calculate new stock level
      new_stock := current_stock + received_qty;
      
      -- Update order item received quantity
      UPDATE public.inventory_order_items 
      SET received_quantity = received_qty 
      WHERE id = item_id;
      
      -- Create transaction record and update stock
      PERFORM public.create_inventory_transaction(
        item_id,
        'purchase',
        received_qty,
        current_stock,
        new_stock,
        order_record.praxis_id,
        'Received from order #' || COALESCE(order_record.order_number, order_record.id::TEXT),
        order_record.created_by,
        (SELECT unit_price FROM public.inventory_order_items WHERE id = item_id AND order_id = order_id_param)
      );
      
      -- Add to results
      results := results || jsonb_build_object(
        'index', item_index,
        'item_id', item_id,
        'received_quantity', received_qty,
        'new_stock', new_stock
      );
      
      item_index := item_index + 1;
    END IF;
  END LOOP;
  
  -- Update order status to delivered if all items are fully received
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_order_items
    WHERE order_id = order_id_param
    AND quantity > COALESCE(received_quantity, 0)
  ) THEN
    UPDATE public.inventory_orders
    SET status = 'delivered',
        actual_delivery_date = CURRENT_DATE
    WHERE id = order_id_param;
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'order_id', order_id_param,
    'items_processed', item_index,
    'results', results
  );
END;
$$;

-- Helper function for finding minimum between two values
CREATE OR REPLACE FUNCTION public.min_stock(current_stock INTEGER, min_stock INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_stock <= min_stock;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add current_stock, minimum_stock columns to medikamente if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'medikamente'
    AND column_name = 'current_stock'
  ) THEN
    ALTER TABLE public.medikamente ADD COLUMN current_stock INTEGER DEFAULT 0 NOT NULL;
    ALTER TABLE public.medikamente ADD COLUMN minimum_stock INTEGER DEFAULT 0 NOT NULL;
    ALTER TABLE public.medikamente ADD COLUMN unit_price NUMERIC;
    ALTER TABLE public.medikamente ADD COLUMN expiry_date DATE;
    ALTER TABLE public.medikamente ADD COLUMN location TEXT;
    ALTER TABLE public.medikamente ADD COLUMN last_ordered DATE;
  END IF;
END $$;
