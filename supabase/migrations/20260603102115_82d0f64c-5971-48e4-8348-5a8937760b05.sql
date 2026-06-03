
-- Enums
DO $$ BEGIN CREATE TYPE public.einvoice_provider AS ENUM ('viettel_sinvoice','misa','vnpt','easyinvoice'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.einvoice_sign_type AS ENUM ('cloud','usb_token'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.einvoice_environment AS ENUM ('sandbox','production'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.einvoice_invoice_type AS ENUM ('normal','adjustment','replacement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.einvoice_status AS ENUM ('draft','queued','processing','signing','issued','cancelled','adjusted','replaced','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.einvoice_file_type AS ENUM ('pdf','xml','zip','signed_xml','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- hotel_einvoice_configs
CREATE TABLE IF NOT EXISTS public.hotel_einvoice_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  hotel_id uuid NOT NULL,
  provider public.einvoice_provider NOT NULL DEFAULT 'viettel_sinvoice',
  tax_code text NOT NULL,
  branch_code text,
  supplier_legal_name text,
  supplier_address text,
  api_base_url text NOT NULL DEFAULT 'https://api-vinvoice.viettel.vn',
  api_username text NOT NULL,
  api_password_secret_ref uuid,
  sign_type public.einvoice_sign_type NOT NULL DEFAULT 'cloud',
  environment public.einvoice_environment NOT NULL DEFAULT 'sandbox',
  default_template_code text,
  default_invoice_series text,
  is_active boolean NOT NULL DEFAULT true,
  auto_issue boolean NOT NULL DEFAULT false,
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_message text,
  cached_token text,
  cached_token_expires_at timestamptz,
  extra_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_einvoice_configs TO authenticated;
GRANT ALL ON public.hotel_einvoice_configs TO service_role;
ALTER TABLE public.hotel_einvoice_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "einvoice_configs_owner_select" ON public.hotel_einvoice_configs FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant_id() AND public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "einvoice_configs_owner_insert" ON public.hotel_einvoice_configs FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_user_tenant_id() AND public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "einvoice_configs_owner_update" ON public.hotel_einvoice_configs FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_user_tenant_id() AND public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "einvoice_configs_owner_delete" ON public.hotel_einvoice_configs FOR DELETE TO authenticated
USING (tenant_id = public.get_current_user_tenant_id() AND public.has_role(auth.uid(), 'owner'::app_role));

CREATE INDEX IF NOT EXISTS idx_einvoice_configs_tenant_hotel ON public.hotel_einvoice_configs (tenant_id, hotel_id);

-- invoice_templates
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  hotel_id uuid NOT NULL,
  provider public.einvoice_provider NOT NULL DEFAULT 'viettel_sinvoice',
  template_code text NOT NULL,
  invoice_series text NOT NULL,
  template_name text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, provider, template_code, invoice_series)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_templates TO authenticated;
GRANT ALL ON public.invoice_templates TO service_role;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_templates_tenant_select" ON public.invoice_templates FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());
CREATE POLICY "invoice_templates_owner_write" ON public.invoice_templates FOR ALL TO authenticated
USING (tenant_id = public.get_current_user_tenant_id() AND public.has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (tenant_id = public.get_current_user_tenant_id() AND public.has_role(auth.uid(), 'owner'::app_role));

CREATE INDEX IF NOT EXISTS idx_invoice_templates_hotel ON public.invoice_templates (tenant_id, hotel_id, provider);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_templates_default ON public.invoice_templates (hotel_id, provider) WHERE is_default;

-- hotel_invoices
CREATE TABLE IF NOT EXISTS public.hotel_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  hotel_id uuid NOT NULL,
  provider public.einvoice_provider NOT NULL DEFAULT 'viettel_sinvoice',
  config_id uuid REFERENCES public.hotel_einvoice_configs(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.invoice_templates(id) ON DELETE SET NULL,
  source_table text,
  source_id uuid,
  transaction_uuid text NOT NULL,
  invoice_type public.einvoice_invoice_type NOT NULL DEFAULT 'normal',
  parent_invoice_id uuid REFERENCES public.hotel_invoices(id) ON DELETE SET NULL,
  original_invoice_no text,
  original_transaction_uuid text,
  adjustment_type smallint,
  adjustment_reason text,
  invoice_no text,
  template_code text,
  invoice_series text,
  reservation_code text,
  issued_at timestamptz,
  buyer jsonb NOT NULL DEFAULT '{}'::jsonb,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  currency text NOT NULL DEFAULT 'VND',
  exchange_rate numeric(18,6) NOT NULL DEFAULT 1,
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  vat_amount numeric(18,2) NOT NULL DEFAULT 0,
  discount_amount numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  status public.einvoice_status NOT NULL DEFAULT 'draft',
  viettel_status text,
  last_polled_at timestamptz,
  poll_attempts integer NOT NULL DEFAULT 0,
  provider_request jsonb,
  provider_response jsonb,
  error_code text,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, transaction_uuid)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_invoices TO authenticated;
GRANT ALL ON public.hotel_invoices TO service_role;
ALTER TABLE public.hotel_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_invoices_tenant_select" ON public.hotel_invoices FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());
CREATE POLICY "hotel_invoices_staff_insert" ON public.hotel_invoices FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_user_tenant_id() AND (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'hotel_manager'::app_role)
  OR public.has_role(auth.uid(), 'department_manager'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
));
CREATE POLICY "hotel_invoices_manager_update" ON public.hotel_invoices FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_user_tenant_id() AND (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'hotel_manager'::app_role)
));

CREATE INDEX IF NOT EXISTS idx_hotel_invoices_tenant_hotel ON public.hotel_invoices (tenant_id, hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_invoices_status ON public.hotel_invoices (status);
CREATE INDEX IF NOT EXISTS idx_hotel_invoices_source ON public.hotel_invoices (source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_hotel_invoices_parent ON public.hotel_invoices (parent_invoice_id);
CREATE INDEX IF NOT EXISTS idx_hotel_invoices_polling ON public.hotel_invoices (status, last_polled_at)
  WHERE status IN ('queued','processing','signing');

-- invoice_files
CREATE TABLE IF NOT EXISTS public.invoice_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  hotel_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.hotel_invoices(id) ON DELETE CASCADE,
  file_type public.einvoice_file_type NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'einvoice-files',
  storage_path text NOT NULL,
  file_size bigint,
  mime_type text,
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.invoice_files TO authenticated;
GRANT ALL ON public.invoice_files TO service_role;
ALTER TABLE public.invoice_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_files_tenant_select" ON public.invoice_files FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());
CREATE POLICY "invoice_files_manager_write" ON public.invoice_files FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_user_tenant_id() AND (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'hotel_manager'::app_role)
));
CREATE POLICY "invoice_files_owner_delete" ON public.invoice_files FOR DELETE TO authenticated
USING (tenant_id = public.get_current_user_tenant_id() AND public.has_role(auth.uid(), 'owner'::app_role));

CREATE INDEX IF NOT EXISTS idx_invoice_files_invoice ON public.invoice_files (invoice_id);

-- invoice_api_logs
CREATE TABLE IF NOT EXISTS public.invoice_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  hotel_id uuid,
  invoice_id uuid REFERENCES public.hotel_invoices(id) ON DELETE SET NULL,
  provider public.einvoice_provider NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  duration_ms integer,
  request_body jsonb,
  response_body jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.invoice_api_logs TO authenticated;
GRANT ALL ON public.invoice_api_logs TO service_role;
ALTER TABLE public.invoice_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_api_logs_owner_select" ON public.invoice_api_logs FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant_id() AND public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "invoice_api_logs_service_insert" ON public.invoice_api_logs FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_user_tenant_id());

CREATE INDEX IF NOT EXISTS idx_invoice_api_logs_invoice ON public.invoice_api_logs (invoice_id, created_at DESC);

-- triggers
CREATE TRIGGER trg_einvoice_configs_updated BEFORE UPDATE ON public.hotel_einvoice_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_invoice_templates_updated BEFORE UPDATE ON public.invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_invoices_updated BEFORE UPDATE ON public.hotel_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vault helpers
CREATE OR REPLACE FUNCTION public.set_einvoice_password(_config_id uuid, _password text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_tenant uuid; v_old_ref uuid; v_new_ref uuid; v_name text;
BEGIN
  SELECT tenant_id, api_password_secret_ref INTO v_tenant, v_old_ref
    FROM public.hotel_einvoice_configs WHERE id = _config_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Config not found'; END IF;
  IF v_tenant <> public.get_current_user_tenant_id()
     OR NOT public.has_role(auth.uid(), 'owner'::app_role) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  v_name := 'einvoice_pwd_' || _config_id::text || '_' || extract(epoch from now())::bigint;
  v_new_ref := vault.create_secret(_password, v_name, 'E-invoice API password');
  UPDATE public.hotel_einvoice_configs
    SET api_password_secret_ref = v_new_ref, updated_at = now()
    WHERE id = _config_id;
  IF v_old_ref IS NOT NULL THEN
    BEGIN DELETE FROM vault.secrets WHERE id = v_old_ref; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN v_new_ref;
END $$;
REVOKE ALL ON FUNCTION public.set_einvoice_password(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_einvoice_password(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_einvoice_password(_config_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_ref uuid; v_secret text;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  SELECT api_password_secret_ref INTO v_ref
    FROM public.hotel_einvoice_configs WHERE id = _config_id;
  IF v_ref IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE id = v_ref;
  RETURN v_secret;
END $$;
REVOKE ALL ON FUNCTION public.get_einvoice_password(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_einvoice_password(uuid) TO service_role;
