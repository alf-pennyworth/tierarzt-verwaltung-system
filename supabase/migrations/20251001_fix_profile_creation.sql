
-- Create a function to automatically handle new user creation and profile association
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, vorname, nachname, praxis_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'vorname', ''),
    COALESCE(new.raw_user_meta_data->>'nachname', ''),
    COALESCE((new.raw_user_meta_data->>'praxis_id')::uuid, NULL)
  );
  RETURN new;
END;
$$;

-- Make sure the trigger exists to call the function whenever a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
