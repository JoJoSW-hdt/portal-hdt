-- Harden every public SECURITY DEFINER function against search_path hijacking.
-- All application relations and helper calls in these functions are schema-qualified.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = pg_catalog, public',
      fn.signature
    );
  END LOOP;
END;
$$;

-- The private balance helper is also SECURITY DEFINER and must use a safe path.
ALTER FUNCTION private.member_exp_balance_rows()
  SET search_path = pg_catalog, public;
