
-- Ensure all required columns exist in medikamente table
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
    ALTER TABLE public.medikamente ADD COLUMN sku TEXT;
    ALTER TABLE public.medikamente ADD COLUMN category TEXT;
    ALTER TABLE public.medikamente ADD COLUMN description TEXT;
  END IF;
END $$;

-- Helper function for comparing stock levels directly in queries
CREATE OR REPLACE FUNCTION public.current_minimum_stock()
RETURNS boolean
LANGUAGE SQL STABLE 
AS $$
  SELECT current_stock <= minimum_stock
  FROM medikamente
  WHERE id = id;
$$;

-- Create a function to handle inventory transactions and update stock directly
CREATE OR REPLACE TRIGGER medikamente_updated_at_trigger
BEFORE UPDATE ON public.medikamente
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
