-- Funktion um neue User automatisch zu bestätigen
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Automatisch Email als bestätigt markieren
  UPDATE auth.users 
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Trigger um User automatisch zu bestätigen
CREATE TRIGGER auto_confirm_users
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_user();

-- Aktualisiere bestehende unbestätigte User
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;