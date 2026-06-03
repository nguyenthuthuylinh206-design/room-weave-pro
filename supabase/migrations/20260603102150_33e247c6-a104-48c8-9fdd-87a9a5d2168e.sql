
-- Storage RLS for einvoice-files (private)
CREATE POLICY "einvoice_files_tenant_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'einvoice-files'
  AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::text
);

CREATE POLICY "einvoice_files_manager_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'einvoice-files'
  AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::text
  AND (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'hotel_manager'::app_role)
  )
);

CREATE POLICY "einvoice_files_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'einvoice-files'
  AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::text
  AND public.has_role(auth.uid(), 'owner'::app_role)
);
