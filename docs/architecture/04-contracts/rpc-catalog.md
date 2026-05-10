# RPC Catalog

**Tổng**: 626 RPC. 237 dùng SECURITY DEFINER. 487 không có caller trong frontend (dead code candidate hoặc chỉ gọi từ trigger/edge).

> Sinh tự động từ `pg_proc` + grep `supabase.rpc()`. Xem nguồn: `_generated/db-functions.tsv`, `_generated/rpc-calls.json`.

## Bảng tra cứu

| RPC | Args | Returns | Lang | SecDef | #Callers FE |
|---|---|---|---|---|---|
| `_add` | text, integer, text | integer | plpgsql |  | 0 |
| `_alike` | boolean, anyelement, text, text | text | plpgsql |  | 0 |
| `_ancestor_of` | name, name, name, name, integer | boolean | sql |  | 0 |
| `_are` | text, name[], name[], text | text | plpgsql |  | 0 |
| `_areni` | text, text[], text[], text | text | plpgsql |  | 0 |
| `_array_to_sorted_string` | name[], text | text | sql |  | 0 |
| `_assets_are` | text, text[], text[], text | text | sql |  | 0 |
| `_cast_exists` | name, name, name | boolean | sql |  | 0 |
| `_cdi` | name, name, anyelement | text | sql |  | 0 |
| `_cexists` | name, name | boolean | sql |  | 0 |
| `_ckeys` | name, name, character | name[] | sql |  | 0 |
| `_cleanup` | – | boolean | sql |  | 0 |
| `_cmp_types` | oid, name | boolean | plpgsql |  | 0 |
| `_col_is_null` | name, name, text, boolean | text | plpgsql |  | 0 |
| `_constraint` | name, character, name[], text, text | text | plpgsql |  | 0 |
| `_contract_on` | text | "char" | sql |  | 0 |
| `_currtest` | – | integer | plpgsql |  | 0 |
| `_db_privs` | – | name[] | plpgsql |  | 0 |
| `_def_is` | text, text, anyelement, text | text | plpgsql |  | 0 |
| `_definer` | name, name[] | boolean | sql |  | 0 |
| `_dexists` | name | boolean | sql |  | 0 |
| `_do_ne` | text, text, text, text | text | plpgsql |  | 0 |
| `_docomp` | text, text, text, text | text | plpgsql |  | 0 |
| `_error_diag` | text, text, text, text, text, text, text, text, text, text | text | sql |  | 0 |
| `_expand_context` | character | text | sql |  | 0 |
| `_expand_on` | character | text | sql |  | 0 |
| `_expand_vol` | character | text | sql |  | 0 |
| `_ext_exists` | name | boolean | sql |  | 0 |
| `_extensions` | name | SETOF name | sql |  | 0 |
| `_extras` | character[], name, name[] | name[] | sql |  | 0 |
| `_finish` | integer, integer, integer, boolean DEFAULT NULL::boolean | SETOF text | plpgsql |  | 0 |
| `_fkexists` | name, name, name[] | boolean | sql |  | 0 |
| `_fprivs_are` | text, name, name[], text | text | plpgsql |  | 0 |
| `_func_compare` | name, name, anyelement, anyelement, text | text | sql |  | 0 |
| `_funkargs` | name[] | text | plpgsql |  | 0 |
| `_get` | text | integer | plpgsql |  | 0 |
| `_get_ac_privs` | name, text | text[] | plpgsql |  | 0 |
| `_get_col_ns_type` | name, name, name | text | sql |  | 0 |
| `_get_col_privs` | name, text, name | text[] | plpgsql |  | 0 |
| `_get_col_type` | name, name | text | sql |  | 0 |
| `_get_context` | name, name | "char" | sql |  | 0 |
| `_get_db_owner` | name | name | sql |  | 0 |
| `_get_db_privs` | name, text | text[] | plpgsql |  | 0 |
| `_get_dtype` | name | text | sql |  | 0 |
| `_get_fdw_privs` | name, text | text[] | plpgsql |  | 0 |
| `_get_func_owner` | name, name, name[] | name | sql |  | 0 |
| `_get_func_privs` | text, text | text[] | plpgsql |  | 0 |
| `_get_index_owner` | name, name | name | sql |  | 0 |
| `_get_lang_privs` | name, text | text[] | plpgsql |  | 0 |
| `_get_language_owner` | name | name | sql |  | 0 |
| `_get_latest` | text, integer | integer | plpgsql |  | 0 |
| `_get_note` | integer | text | plpgsql |  | 0 |
| `_get_opclass_owner` | name, name | name | sql |  | 0 |
| `_get_rel_owner` | name | name | sql |  | 0 |
| `_get_schema_owner` | name | name | sql |  | 0 |
| `_get_schema_privs` | name, text | text[] | plpgsql |  | 0 |
| `_get_sequence_privs` | name, text | text[] | plpgsql |  | 0 |
| `_get_server_privs` | name, text | text[] | plpgsql |  | 0 |
| `_get_table_privs` | name, text | text[] | plpgsql |  | 0 |
| `_get_tablespace_owner` | name | name | sql |  | 0 |
| `_get_tablespaceprivs` | name, text | text[] | plpgsql |  | 0 |
| `_get_type_owner` | name, name | name | sql |  | 0 |
| `_got_func` | name, name[] | boolean | sql |  | 0 |
| `_grolist` | name | oid[] | sql |  | 0 |
| `_has_def` | name, name, name | boolean | sql |  | 0 |
| `_has_group` | name | boolean | sql |  | 0 |
| `_has_role` | name | boolean | sql |  | 0 |
| `_has_type` | name, name, character[] | boolean | sql |  | 0 |
| `_has_user` | name | boolean | sql |  | 0 |
| `_hasc` | name, name, character | boolean | sql |  | 0 |
| `_have_index` | name, name | boolean | sql |  | 0 |
| `_ident_array_to_sorted_string` | name[], text | text | sql |  | 0 |
| `_ident_array_to_string` | name[], text | text | sql |  | 0 |
| `_ikeys` | name, name, name | text[] | sql |  | 0 |
| `_inherited` | name, name | boolean | sql |  | 0 |
| `_is_indexed` | name, name, text[] | boolean | sql |  | 0 |
| `_is_instead` | name, name, name | boolean | sql |  | 0 |
| `_is_schema` | name | boolean | sql |  | 0 |
| `_is_super` | name | boolean | sql |  | 0 |
| `_is_trusted` | name | boolean | sql |  | 0 |
| `_is_verbose` | – | boolean | sql |  | 0 |
| `_keys` | name, character | SETOF name[] | sql |  | 0 |
| `_lang` | name, name | name | sql |  | 0 |
| `_missing` | character, name[] | name[] | sql |  | 0 |
| `_nosuch` | name, name, name[] | text | sql |  | 0 |
| `_op_exists` | name, name, name | boolean | sql |  | 0 |
| `_opc_exists` | name | boolean | sql |  | 0 |
| `_partof` | name, name | boolean | sql |  | 0 |
| `_parts` | name, name | SETOF name | sql |  | 0 |
| `_pg_sv_column_array` | oid, smallint[] | name[] | sql |  | 0 |
| `_pg_sv_table_accessible` | oid, oid | boolean | sql |  | 0 |
| `_pg_sv_type_array` | oid[] | name[] | sql |  | 0 |
| `_prokind` | p_oid oid | "char" | plpgsql |  | 0 |
| `_query` | text | text | sql |  | 0 |
| `_quote_ident_like` | text, text | text | plpgsql |  | 0 |
| `_refine_vol` | text | text | sql |  | 0 |
| `_relcomp` | text, text, text, text | text | sql |  | 0 |
| `_relexists` | name, name | boolean | sql |  | 0 |
| `_relne` | text, text, text, text | text | sql |  | 0 |
| `_returns` | name, name | text | sql |  | 0 |
| `_rexists` | character[], name | boolean | sql |  | 0 |
| `_rule_on` | name, name | "char" | sql |  | 0 |
| `_runem` | text[], boolean | SETOF text | plpgsql |  | 0 |
| `_runner` | text[], text[], text[], text[], text[] | SETOF text | plpgsql |  | 0 |
| `_set` | integer, integer | integer | plpgsql |  | 0 |
| `_strict` | name, name, name[] | boolean | sql |  | 0 |
| `_table_privs` | – | name[] | plpgsql |  | 0 |
| `_temptable` | text, text | text | plpgsql |  | 0 |
| `_temptypes` | text | text | sql |  | 0 |
| `_time_trials` | text, integer, numeric | SETOF _time_trial_type | plpgsql |  | 0 |
| `_tlike` | boolean, text, text, text | text | sql |  | 0 |
| `_todo` | – | text | plpgsql |  | 0 |
| `_trig` | name, name | boolean | sql |  | 0 |
| `_type_func` | "char", name, name[] | boolean | sql |  | 0 |
| `_types_are` | name[], text, character[] | text | sql |  | 0 |
| `_unalike` | boolean, anyelement, text, text | text | plpgsql |  | 0 |
| `_vol` | name | text | sql |  | 0 |
| `add_laundry_to_draft_batch` | p_tenant_id uuid, p_hotel_id uuid, p_laundry_request_id uuid | uuid | plpgsql | ✓ | 2 |
| `add_result` | boolean, boolean, text, text, text | integer | plpgsql |  | 0 |
| `alike` | anyelement, text | text | sql |  | 0 |
| `allocate_linen_fifo` | _item_id uuid, _quantity integer | jsonb | plpgsql | ✓ | 0 |
| `any_column_privs_are` | name, name, name[] | text | sql |  | 0 |
| `apply_asset_group_mapping` | _tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid, _override_existing boolean D | jsonb | plpgsql | ✓ | 1 |
| `apply_promo_code` | p_tenant_id uuid, p_promo_code text, p_original_amount numeric | jsonb | plpgsql |  | 1 |
| `apply_room_standards` | p_room_id uuid, p_user_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 2 |
| `approve_reorder_suggestions` | _suggestion_ids uuid[] | jsonb | plpgsql | ✓ | 1 |
| `approve_task` | _task_id uuid, _note text DEFAULT NULL::text | housekeeping_tasks | plpgsql | ✓ | 1 |
| `approve_tenant` | p_tenant_id uuid, p_admin_id uuid | jsonb | plpgsql | ✓ | 1 |
| `assign_default_permissions_to_role` | p_tenant_id uuid, p_role_code text, p_permission_codes text[] | void | plpgsql | ✓ | 0 |
| `atomic_item_consumed` | p_item_id uuid, p_quantity integer | TABLE(quantity_before integer, quantity_ | plpgsql | ✓ | 1 |
| `atomic_item_lost` | p_item_id uuid, p_quantity integer | TABLE(quantity_before integer, quantity_ | plpgsql | ✓ | 1 |
| `atomic_item_to_laundry` | p_item_id uuid, p_quantity integer | void | plpgsql | ✓ | 1 |
| `auto_apply_read_only_after_grace` | – | integer | plpgsql | ✓ | 0 |
| `auto_assign_batch_number` | – | trigger | plpgsql | ✓ | 0 |
| `auto_classify_item_type` | – | trigger | plpgsql |  | 0 |
| `auto_create_batch_records` | – | trigger | plpgsql | ✓ | 0 |
| `auto_offline_inactive_staff` | – | void | sql | ✓ | 0 |
| `auto_update_order_floor` | – | trigger | plpgsql | ✓ | 0 |
| `bag_eq` | text, text, text | text | sql |  | 0 |
| `bag_has` | text, text, text | text | sql |  | 0 |
| `bag_hasnt` | text, text, text | text | sql |  | 0 |
| `bag_ne` | text, text | text | sql |  | 0 |
| `batch_confirm_room_deliveries` | p_room_order_ids uuid[], p_confirmed_by uuid | jsonb | plpgsql | ✓ | 1 |
| `bulk_delete_items` | p_item_ids uuid[], p_user_id uuid | jsonb | plpgsql | ✓ | 1 |
| `calculate_grace_period_end` | – | trigger | plpgsql | ✓ | 0 |
| `calculate_payment_status` | – | trigger | plpgsql |  | 0 |
| `calculate_staff_statistics` | p_user_id uuid, p_hotel_id uuid, p_period_start date, p_period_end date | void | plpgsql | ✓ | 1 |
| `calculate_tenant_storage` | p_tenant_id uuid | bigint | plpgsql | ✓ | 1 |
| `can` | name, name[], text | text | plpgsql |  | 0 |
| `can_create_user` | p_creator_id uuid, p_new_user_level text, p_tenant_id uuid | boolean | plpgsql | ✓ | 0 |
| `can_manage_user` | p_manager_id uuid, p_target_user_id uuid | boolean | plpgsql | ✓ | 0 |
| `can_perform_quick_check` | _room_id uuid | boolean | plpgsql | ✓ | 0 |
| `cancel_booking` | p_booking_id uuid, p_room_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `cancel_distribution_order` | p_order_id uuid, p_cancelled_by uuid | jsonb | plpgsql | ✓ | 1 |
| `cast_context_is` | name, name, text | text | sql |  | 0 |
| `casts_are` | text[], text | text | sql |  | 0 |
| `check_and_update_batch_status` | p_batch_id uuid | void | plpgsql | ✓ | 0 |
| `check_and_update_order_status` | p_order_id uuid | void | plpgsql | ✓ | 0 |
| `check_created_by_required` | – | trigger | plpgsql |  | 0 |
| `check_duplicate_room_check` | – | trigger | plpgsql | ✓ | 0 |
| `check_expiring_subscriptions` | – | void | plpgsql | ✓ | 1 |
| `check_rate_limit` | _bucket_key text, _max_hits integer, _window_seconds integer | boolean | plpgsql | ✓ | 0 |
| `check_tenant_can_add` | p_tenant_id uuid, p_resource_type text | boolean | plpgsql | ✓ | 1 |
| `check_test` | text, boolean, text, text, text | SETOF text | sql |  | 0 |
| `cleanup_expired_otps` | – | void | plpgsql | ✓ | 0 |
| `cleanup_old_check_sessions` | – | void | plpgsql | ✓ | 0 |
| `cleanup_orphaned_auth_users` | – | integer | plpgsql | ✓ | 0 |
| `cleanup_rate_limit_hits` | – | void | sql | ✓ | 0 |
| `cleanup_stale_check_sessions` | – | void | plpgsql | ✓ | 0 |
| `clear_tenant_read_only` | p_tenant_id uuid, p_reason text DEFAULT NULL::text | void | plpgsql | ✓ | 0 |
| `close_route_if_complete` | p_order_id uuid, p_actor_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `cmp_ok` | anyelement, text, anyelement, text | text | plpgsql |  | 0 |
| `col_default_is` | name, name, name, anyelement, text | text | sql |  | 0 |
| `col_has_check` | name, name[], text | text | sql |  | 0 |
| `col_has_default` | name, name, name, text | text | plpgsql |  | 0 |
| `col_hasnt_default` | name, name, text | text | plpgsql |  | 0 |
| `col_is_fk` | name, name[] | text | sql |  | 0 |
| `col_is_null` | table_name name, column_name name, description text DEFAULT NULL::text | text | sql |  | 0 |
| `col_is_pk` | name, name, text | text | sql |  | 0 |
| `col_is_unique` | name, name, text | text | sql |  | 0 |
| `col_isnt_fk` | name, name[], text | text | sql |  | 0 |
| `col_isnt_pk` | name, name[], text | text | sql |  | 0 |
| `col_not_null` | schema_name name, table_name name, column_name name, description text DEFAULT NU | text | sql |  | 0 |
| `col_type_is` | name, name, name, name, text, text | text | plpgsql |  | 0 |
| `collect_tap` | character varying[] | text | sql |  | 0 |
| `column_privs_are` | name, name, name, name[], text | text | plpgsql |  | 0 |
| `columns_are` | name, name, name[], text | text | sql |  | 0 |
| `complete_registration` | p_user_id uuid, p_full_name text, p_phone text, p_tenant_name text, p_email text | jsonb | plpgsql | ✓ | 2 |
| `complete_room_delivery` | p_distribution_order_room_id uuid, p_confirmed_by uuid, p_item_confirmations jso | jsonb | plpgsql | ✓ | 1 |
| `complete_task` | _task_id uuid, _note text DEFAULT NULL::text | housekeeping_tasks | plpgsql | ✓ | 2 |
| `composite_owner_is` | name, name, name | text | sql |  | 0 |
| `compute_auto_reorder_suggestions` | _tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 0 |
| `compute_reorder_suggestions` | _tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid, _item_id uuid DEFAULT NULL:: | jsonb | plpgsql | ✓ | 1 |
| `confirm_delivery_from_room_check` | p_room_order_id uuid, p_confirmed_by uuid | jsonb | plpgsql | ✓ | 1 |
| `confirm_receive_order` | p_order_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_adjustments jsonb DEFAULT | jsonb | plpgsql | ✓ | 1 |
| `confirm_room_delivery` | p_room_order_id uuid, p_confirmed_by uuid | jsonb | plpgsql | ✓ | 1 |
| `confirm_warehouse_delivery` | p_room_order_id uuid, p_delivered_by uuid, p_item_confirmations jsonb DEFAULT NU | jsonb | plpgsql | ✓ | 1 |
| `create_default_categories` | p_tenant_id uuid | void | plpgsql | ✓ | 0 |
| `create_default_tenant_roles` | p_tenant_id uuid | void | plpgsql | ✓ | 0 |
| `create_default_warehouse_for_hotel` | p_hotel_id uuid, p_tenant_id uuid | uuid | plpgsql | ✓ | 0 |
| `create_distribution_order` | p_tenant_id uuid, p_hotel_id uuid, p_created_by uuid, p_assigned_to uuid, p_room | jsonb | plpgsql | ✓ | 3 |
| `create_inbound_transaction` | p_tenant_id uuid, p_hotel_id uuid, p_transaction_category text, p_from_location  | jsonb | plpgsql | ✓ | 2 |
| `create_laundry_batch_with_items` | p_tenant_id uuid, p_hotel_id uuid, p_vendor_id uuid, p_delivery_date date, p_exp | jsonb | plpgsql | ✓ | 1 |
| `create_laundry_loss_transaction` | p_tenant_id uuid, p_hotel_id uuid, p_batch_id uuid, p_batch_code text, p_item_id | jsonb | plpgsql | ✓ | 1 |
| `create_laundry_return_transaction` | p_tenant_id uuid, p_hotel_id uuid, p_batch_id uuid, p_batch_code text, p_item_id | jsonb | plpgsql | ✓ | 1 |
| `create_new_linen_batch` | _item_id uuid, _quantity integer, _batch_code text | jsonb | plpgsql | ✓ | 1 |
| `create_notification` | p_user_id uuid, p_tenant_id uuid, p_title text, p_body text, p_type text DEFAULT | uuid | plpgsql | ✓ | 0 |
| `create_notification_for_user` | p_user_id uuid, p_tenant_id uuid, p_title text, p_body text, p_type text DEFAULT | uuid | plpgsql | ✓ | 1 |
| `create_outbound_transaction` | p_tenant_id uuid, p_hotel_id uuid, p_transaction_category text, p_from_location  | jsonb | plpgsql | ✓ | 3 |
| `create_staff_status_for_new_user` | – | trigger | plpgsql | ✓ | 0 |
| `create_stock_adjustment` | p_tenant_id uuid, p_hotel_id uuid, p_adjustment_type text, p_scheduled_date date | jsonb | plpgsql | ✓ | 1 |
| `create_super_admin` | p_email text, p_full_name text DEFAULT 'Super Admin'::text | jsonb | plpgsql | ✓ | 0 |
| `create_warehouse_transfer` | p_tenant_id uuid, p_hotel_id uuid, p_from_warehouse_id uuid, p_to_warehouse_id u | uuid | plpgsql | ✓ | 1 |
| `database_privs_are` | name, name, name[], text | text | plpgsql |  | 0 |
| `db_owner_is` | name, name, text | text | plpgsql |  | 0 |
| `delete_inventory_transaction` | p_transaction_id uuid | jsonb | plpgsql | ✓ | 1 |
| `deliver_stop` | p_room_order_id uuid, p_items_confirmed jsonb DEFAULT NULL::jsonb, p_actor_id uu | jsonb | plpgsql | ✓ | 1 |
| `diag` | VARIADIC anyarray | text | sql |  | 0 |
| `diag_test_name` | text | text | sql |  | 0 |
| `display_oper` | name, oid | text | sql |  | 0 |
| `do_tap` | – | SETOF text | sql |  | 0 |
| `doesnt_imatch` | anyelement, text | text | sql |  | 0 |
| `doesnt_match` | anyelement, text, text | text | sql |  | 0 |
| `domain_type_is` | text, text, text | text | plpgsql |  | 0 |
| `domain_type_isnt` | text, text | text | sql |  | 0 |
| `domains_are` | name, name[], text | text | sql |  | 0 |
| `enforce_read_only_mutation` | – | trigger | plpgsql | ✓ | 0 |
| `enforce_room_check_photos` | – | trigger | plpgsql | ✓ | 0 |
| `ensure_single_default_warehouse` | – | trigger | plpgsql | ✓ | 0 |
| `enum_has_labels` | name, name, name[], text | text | sql |  | 0 |
| `enums_are` | name, name[] | text | sql |  | 0 |
| `extensions_are` | name[], text | text | sql |  | 0 |
| `fail` | text | text | sql |  | 0 |
| `fdw_privs_are` | name, name, name[], text | text | plpgsql |  | 0 |
| `findfuncs` | text | text[] | sql |  | 0 |
| `finish` | exception_on_failure boolean DEFAULT NULL::boolean | SETOF text | sql |  | 0 |
| `fk_ok` | name, name, name, name, name, name, text | text | sql |  | 0 |
| `fn_can_user_transition_room` | _user_id uuid, _from text, _to text | boolean | plpgsql | ✓ | 0 |
| `fn_is_valid_room_transition` | _from text, _to text | boolean | sql |  | 0 |
| `fn_is_valid_task_transition` | _from text, _to text | boolean | sql |  | 0 |
| `fn_room_status_alias` | _status text | text | sql |  | 0 |
| `fn_sync_room_legacy_status` | – | trigger | plpgsql |  | 0 |
| `fn_sync_room_legacy_status_ins` | – | trigger | plpgsql |  | 0 |
| `fn_sync_room_status_on_booking_flag` | – | trigger | plpgsql | ✓ | 0 |
| `fn_write_audit_log` | – | trigger | plpgsql | ✓ | 0 |
| `foreign_table_owner_is` | name, name, text | text | plpgsql |  | 0 |
| `foreign_tables_are` | name, name[] | text | sql |  | 0 |
| `function_lang_is` | name, name, name, text | text | sql |  | 0 |
| `function_owner_is` | name, name[], name | text | sql |  | 0 |
| `function_privs_are` | name, name[], name, name[], text | text | sql |  | 0 |
| `function_returns` | name, name[], text | text | sql |  | 0 |
| `functions_are` | name, name[], text | text | sql |  | 0 |
| `generate_guest_invoice_number` | p_tenant_id uuid | text | plpgsql | ✓ | 2 |
| `generate_invoice_number` | – | text | plpgsql |  | 0 |
| `generate_laundry_request_code` | p_tenant_id uuid | text | plpgsql | ✓ | 2 |
| `generate_lost_found_item_code` | p_tenant_id uuid | text | plpgsql | ✓ | 1 |
| `generate_supplement_request_code` | p_tenant_id uuid | text | plpgsql | ✓ | 2 |
| `generate_unique_code` | prefix text, table_name text, column_name text | text | plpgsql |  | 0 |
| `get_abc_analysis` | p_tenant_id uuid, p_hotel_id uuid | TABLE(item_id uuid, item_code text, item | plpgsql | ✓ | 1 |
| `get_all_warehouse_stock_summary` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid | TABLE(warehouse_id uuid, warehouse_name  | plpgsql | ✓ | 1 |
| `get_booking_chargeable_total` | p_booking_id uuid | numeric | sql | ✓ | 1 |
| `get_categories_with_stats` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid | TABLE(id uuid, name text, name_en text,  | plpgsql | ✓ | 1 |
| `get_consumption_trend` | _item_id uuid, _days integer DEFAULT 90 | TABLE(day date, qty_out numeric) | sql | ✓ | 1 |
| `get_current_room_booking` | p_room_id uuid | TABLE(id uuid, guest_name text, guest_ph | sql | ✓ | 1 |
| `get_current_user_role` | – | text | sql | ✓ | 0 |
| `get_current_user_tenant_id` | – | uuid | sql | ✓ | 0 |
| `get_dashboard_stats` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `get_dead_stock_report` | _tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid, _days_threshold integer DEFA | TABLE(item_id uuid, item_code text, item | sql | ✓ | 1 |
| `get_distribution_order_detail` | p_order_id uuid | jsonb | plpgsql | ✓ | 2 |
| `get_distribution_orders_count` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL | integer | plpgsql | ✓ | 1 |
| `get_distribution_orders_filtered` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL | TABLE(id uuid, order_code text, status t | plpgsql | ✓ | 2 |
| `get_effective_permissions` | _user_id uuid | TABLE(module text, action text, source t | sql | ✓ | 1 |
| `get_financial_report` | p_tenant_id uuid, p_hotel_id uuid, p_start_date date, p_end_date date | jsonb | plpgsql | ✓ | 1 |
| `get_floor_plan` | p_hotel_id uuid | jsonb | plpgsql | ✓ | 1 |
| `get_hotel_performance_stats` | p_tenant_id uuid, p_hotel_id uuid, p_from_date date, p_to_date date | jsonb | plpgsql | ✓ | 1 |
| `get_hotels_breakdown_stats` | p_tenant_id uuid | TABLE(hotel_id uuid, hotel_name text, ho | plpgsql | ✓ | 1 |
| `get_hotels_performance_comparison` | p_tenant_id uuid, p_from_date date, p_to_date date | TABLE(hotel_id uuid, hotel_name text, ho | plpgsql | ✓ | 1 |
| `get_inventory_dashboard_stats` | p_tenant_id uuid, p_hotel_id uuid | jsonb | plpgsql | ✓ | 1 |
| `get_inventory_report` | p_tenant_id uuid, p_hotel_id uuid, p_start_date date, p_end_date date | jsonb | plpgsql | ✓ | 1 |
| `get_inventory_transactions_filtered` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_transaction_type text DE | TABLE(id uuid, transaction_code text, tr | plpgsql | ✓ | 1 |
| `get_inventory_value_over_time` | p_tenant_id uuid, p_hotel_id uuid, p_months integer DEFAULT 12 | TABLE(month date, stock_value numeric, v | plpgsql | ✓ | 1 |
| `get_item_detail` | p_item_id uuid | jsonb | plpgsql | ✓ | 0 |
| `get_items_filtered` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT | TABLE(id uuid, code text, name text, nam | plpgsql | ✓ | 2 |
| `get_last_room_check` | _room_id uuid | TABLE(id uuid, check_type text, checked_ | sql | ✓ | 1 |
| `get_laundry_batch_detail` | p_batch_id uuid | jsonb | plpgsql | ✓ | 1 |
| `get_laundry_batches_filtered` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_vendor_id uuid DEFAULT N | TABLE(id uuid, batch_code text, vendor_i | plpgsql | ✓ | 1 |
| `get_laundry_dashboard_stats` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `get_laundry_report` | p_tenant_id uuid, p_hotel_id uuid, p_start_date date, p_end_date date | jsonb | plpgsql | ✓ | 1 |
| `get_low_stock_by_warehouses` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50 | TABLE(warehouse_id uuid, warehouse_name  | plpgsql | ✓ | 1 |
| `get_low_stock_items` | p_tenant_id uuid, p_hotel_id uuid, p_limit integer DEFAULT 50 | TABLE(id uuid, code text, name text, cat | plpgsql | ✓ | 2 |
| `get_maintenance_dashboard` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `get_maintenance_report` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT  | jsonb | plpgsql | ✓ | 1 |
| `get_missing_items_for_rooms` | p_room_ids uuid[] | TABLE(room_id uuid, room_number text, it | plpgsql | ✓ | 0 |
| `get_missing_items_from_room_detail` | p_room_ids uuid[] | TABLE(room_id uuid, room_number text, it | plpgsql | ✓ | 1 |
| `get_monthly_expenses` | p_tenant_id uuid, p_months integer DEFAULT 12 | TABLE(month text, purchase bigint, laund | plpgsql | ✓ | 1 |
| `get_monthly_laundry_expenses` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_year integer DEFAULT (EX | TABLE(month text, total_batches bigint,  | plpgsql | ✓ | 1 |
| `get_pending_tenants` | – | TABLE(tenant_id uuid, tenant_name text,  | plpgsql | ✓ | 1 |
| `get_qc_daily_trend` | _tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid, _days integer DEFAULT 30 | TABLE(day date, total_tasks bigint, rewo | sql |  | 0 |
| `get_qc_floor_stats` | _tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid, _days integer DEFAULT 30 | TABLE(hotel_id uuid, floor integer, tota | sql |  | 0 |
| `get_qc_staff_stats` | _tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid, _days integer DEFAULT 30 | TABLE(user_id uuid, full_name text, hote | sql |  | 0 |
| `get_recent_activities` | p_tenant_id uuid, p_limit integer DEFAULT 10, p_hotel_id uuid DEFAULT NULL::uuid | TABLE(id uuid, type text, description te | plpgsql | ✓ | 1 |
| `get_room_checks_report` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT  | jsonb | plpgsql | ✓ | 1 |
| `get_room_detail` | p_room_id uuid | jsonb | plpgsql | ✓ | 0 |
| `get_room_distribution_history` | p_room_id uuid | TABLE(order_id uuid, order_code text, or | plpgsql | ✓ | 0 |
| `get_room_items_with_standards` | p_room_id uuid | TABLE(id uuid, room_id uuid, item_id uui | plpgsql | ✓ | 2 |
| `get_room_standards` | p_hotel_id uuid, p_room_type text | TABLE(id uuid, item_id uuid, item_code t | plpgsql | ✓ | 1 |
| `get_rooms_filtered` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_floor integer DEFAULT NU | TABLE(id uuid, tenant_id uuid, hotel_id  | plpgsql | ✓ | 2 |
| `get_rooms_report_stats` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT  | jsonb | plpgsql | ✓ | 1 |
| `get_stale_sessions_for_reminder` | – | TABLE(session_id uuid, room_id uuid, use | sql | ✓ | 0 |
| `get_stock_adjustments_filtered` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL | TABLE(id uuid, adjustment_code text, adj | plpgsql | ✓ | 1 |
| `get_stock_audit_report` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT  | jsonb | plpgsql | ✓ | 1 |
| `get_super_admin_dashboard_stats` | – | jsonb | plpgsql | ✓ | 1 |
| `get_tenant_billing_summary` | p_tenant_id uuid | jsonb | plpgsql | ✓ | 1 |
| `get_top_items` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10 | TABLE(id uuid, code text, name text, thu | plpgsql | ✓ | 1 |
| `get_turnover_analysis` | p_tenant_id uuid, p_hotel_id uuid, p_months integer DEFAULT 3 | TABLE(item_id uuid, item_code text, item | plpgsql | ✓ | 1 |
| `get_user_hotels` | p_user_id uuid | TABLE(id uuid, code text, name text, cit | plpgsql | ✓ | 0 |
| `get_user_level` | _user_id uuid | text | sql | ✓ | 0 |
| `get_user_levels` | – | TABLE(id uuid, code text, name text, hie | sql | ✓ | 1 |
| `get_user_permissions` | _user_id uuid | TABLE(code text, name text, module text, | sql | ✓ | 2 |
| `get_user_permissions_summary` | p_user_id uuid | TABLE(module text, can_view boolean, can | sql | ✓ | 3 |
| `get_user_primary_role` | _user_id uuid | app_role | sql | ✓ | 0 |
| `get_user_subordinates` | p_user_id uuid | TABLE(id uuid, full_name text, email tex | plpgsql | ✓ | 1 |
| `get_users_by_hotel` | p_tenant_id uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NUL | SETOF users | plpgsql | ✓ | 1 |
| `get_vendor_performance` | p_vendor_id uuid, p_days integer DEFAULT 30 | jsonb | plpgsql | ✓ | 1 |
| `get_warehouse_stock_summary` | p_warehouse_id uuid | TABLE(item_id uuid, item_name text, item | plpgsql | ✓ | 1 |
| `get_workflow_analytics` | p_workflow_id uuid, p_period text DEFAULT 'month'::text | jsonb | plpgsql | ✓ | 0 |
| `groups_are` | name[], text | text | sql |  | 0 |
| `handle_item_image_primary` | – | trigger | plpgsql |  | 0 |
| `handle_new_user` | – | trigger | plpgsql | ✓ | 0 |
| `handle_successful_payment` | p_transaction_id uuid | void | plpgsql |  | 0 |
| `handover_batch` | p_batch_id uuid, p_actor_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `handover_stop_create_next_route` | p_room_order_id uuid, p_next_shift_code text, p_next_assignee_id uuid DEFAULT NU | jsonb | plpgsql | ✓ | 1 |
| `has_cast` | name, name, name | text | sql |  | 0 |
| `has_check` | name | text | sql |  | 0 |
| `has_column` | name, name, name, text | text | sql |  | 0 |
| `has_composite` | name, name, text | text | sql |  | 0 |
| `has_domain` | name, name, text | text | sql |  | 0 |
| `has_enum` | name, name, text | text | sql |  | 0 |
| `has_extension` | name, text | text | sql |  | 0 |
| `has_fk` | name, text | text | sql |  | 0 |
| `has_foreign_table` | name, name | text | sql |  | 0 |
| `has_function` | name, name | text | sql |  | 0 |
| `has_group` | name, text | text | sql |  | 0 |
| `has_index` | name, name, text | text | sql |  | 0 |
| `has_inherited_tables` | name, text | text | sql |  | 0 |
| `has_language` | name, text | text | sql |  | 0 |
| `has_leftop` | name, name, name, text | text | sql |  | 0 |
| `has_materialized_view` | name | text | sql |  | 0 |
| `has_opclass` | name, name | text | sql |  | 0 |
| `has_operator` | name, name, name, text | text | sql |  | 0 |
| `has_permission` | _user_id uuid, _permission_code text | boolean | sql | ✓ | 0 |
| `has_pk` | name, name, text | text | sql |  | 0 |
| `has_relation` | name | text | sql |  | 0 |
| `has_rightop` | name, name, name, name | text | sql |  | 0 |
| `has_role` | name, text | text | sql |  | 0 |
| `has_rule` | name, name, name, text | text | sql |  | 0 |
| `has_schema` | name, text | text | sql |  | 0 |
| `has_sequence` | name, text | text | sql |  | 0 |
| `has_table` | name, name | text | sql |  | 0 |
| `has_tablespace` | name, text | text | sql |  | 0 |
| `has_trigger` | name, name, name | text | sql |  | 0 |
| `has_type` | name, text | text | sql |  | 0 |
| `has_unique` | text, text | text | sql |  | 0 |
| `has_user` | name | text | sql |  | 0 |
| `has_user_level` | _user_id uuid, _level_code text | boolean | sql | ✓ | 0 |
| `has_user_permission` | p_user_id uuid, p_module text, p_action text | boolean | plpgsql | ✓ | 3 |
| `has_view` | name, text | text | sql |  | 0 |
| `hasnt_cast` | name, name | text | sql |  | 0 |
| `hasnt_column` | name, name, name, text | text | sql |  | 0 |
| `hasnt_composite` | name | text | sql |  | 0 |
| `hasnt_domain` | name | text | sql |  | 0 |
| `hasnt_enum` | name, text | text | sql |  | 0 |
| `hasnt_extension` | name, text | text | sql |  | 0 |
| `hasnt_fk` | name, name, text | text | sql |  | 0 |
| `hasnt_foreign_table` | name, text | text | sql |  | 0 |
| `hasnt_function` | name, name, name[], text | text | sql |  | 0 |
| `hasnt_group` | name | text | sql |  | 0 |
| `hasnt_index` | name, name, text | text | sql |  | 0 |
| `hasnt_inherited_tables` | name | text | sql |  | 0 |
| `hasnt_language` | name | text | sql |  | 0 |
| `hasnt_leftop` | name, name, text | text | sql |  | 0 |
| `hasnt_materialized_view` | name, name, text | text | sql |  | 0 |
| `hasnt_opclass` | name, name | text | sql |  | 0 |
| `hasnt_operator` | name, name, name, name | text | sql |  | 0 |
| `hasnt_pk` | name | text | sql |  | 0 |
| `hasnt_relation` | name | text | sql |  | 0 |
| `hasnt_rightop` | name, name, text | text | sql |  | 0 |
| `hasnt_role` | name, text | text | sql |  | 0 |
| `hasnt_rule` | name, name, text | text | sql |  | 0 |
| `hasnt_schema` | name, text | text | sql |  | 0 |
| `hasnt_sequence` | name, name, text | text | sql |  | 0 |
| `hasnt_table` | name, text | text | sql |  | 0 |
| `hasnt_tablespace` | name, text | text | sql |  | 0 |
| `hasnt_trigger` | name, name | text | sql |  | 0 |
| `hasnt_type` | name, name, text | text | sql |  | 0 |
| `hasnt_user` | name | text | sql |  | 0 |
| `hasnt_view` | name | text | sql |  | 0 |
| `hotels_generate_code` | – | trigger | plpgsql |  | 0 |
| `ialike` | anyelement, text | text | sql |  | 0 |
| `ignore_reorder_suggestion` | _suggestion_id uuid, _reason text DEFAULT NULL::text, _ignore_days integer DEFAU | jsonb | plpgsql | ✓ | 1 |
| `imatches` | anyelement, text | text | sql |  | 0 |
| `in_todo` | – | boolean | plpgsql |  | 0 |
| `increment_quantity_in_laundry` | p_item_id uuid, p_quantity integer | void | plpgsql | ✓ | 0 |
| `increment_staff_stat` | p_user_id uuid, p_hotel_id uuid, p_stat_type text, p_increment integer DEFAULT 1 | void | plpgsql | ✓ | 0 |
| `increment_workflow_stats` | p_workflow_id uuid, p_success boolean | void | plpgsql | ✓ | 0 |
| `index_is_primary` | name, name | text | plpgsql |  | 0 |
| `index_is_type` | name, name, name | text | plpgsql |  | 0 |
| `index_is_unique` | name, name, name | text | sql |  | 0 |
| `index_owner_is` | name, name, name, name, text | text | plpgsql |  | 0 |
| `indexes_are` | name, name, name[] | text | sql |  | 0 |
| `initialize_warehouse_stock` | p_warehouse_id uuid, p_hotel_id uuid, p_tenant_id uuid | integer | plpgsql | ✓ | 0 |
| `inventory_transactions_generate_code` | – | trigger | plpgsql |  | 0 |
| `invoices_generate_number` | – | trigger | plpgsql |  | 0 |
| `is` | anyelement, anyelement | text | sql |  | 0 |
| `is_aggregate` | name | text | sql |  | 0 |
| `is_ancestor_of` | name, name, name, name, integer, text | text | sql |  | 0 |
| `is_clustered` | name | text | plpgsql |  | 0 |
| `is_definer` | name | text | sql |  | 0 |
| `is_descendent_of` | name, name, name, name, integer, text | text | sql |  | 0 |
| `is_distribution_leader` | _user_id uuid | boolean | sql | ✓ | 0 |
| `is_empty` | text, text | text | plpgsql |  | 0 |
| `is_indexed` | name, name[], text | text | sql |  | 0 |
| `is_level_higher_or_equal` | _user_id uuid, _min_level_code text | boolean | sql | ✓ | 0 |
| `is_manager` | – | boolean | sql | ✓ | 0 |
| `is_manager_or_above` | _user uuid | boolean | sql | ✓ | 0 |
| `is_member_of` | name, name[] | text | sql |  | 0 |
| `is_normal_function` | name, name, name[], text | text | sql |  | 0 |
| `is_owner_user` | – | boolean | sql | ✓ | 0 |
| `is_partition_of` | name, name, text | text | sql |  | 0 |
| `is_partitioned` | name, name, text | text | sql |  | 0 |
| `is_procedure` | name, name[], text | text | sql |  | 0 |
| `is_qc_manager` | _user_id uuid | boolean | sql | ✓ | 0 |
| `is_route_assignee` | _user_id uuid, _order_id uuid | boolean | sql | ✓ | 0 |
| `is_storekeeper` | _user_id uuid | boolean | sql | ✓ | 0 |
| `is_strict` | name, name, name[] | text | sql |  | 0 |
| `is_super_admin` | p_user_id uuid | boolean | sql | ✓ | 0 |
| `is_superuser` | name | text | sql |  | 0 |
| `is_tenant_owner` | – | boolean | sql | ✓ | 0 |
| `is_tenant_read_only` | p_tenant_id uuid | boolean | sql | ✓ | 0 |
| `is_window` | name, name, text | text | sql |  | 0 |
| `isa_ok` | anyelement, regtype | text | sql |  | 0 |
| `isnt` | anyelement, anyelement | text | sql |  | 0 |
| `isnt_aggregate` | name, name[] | text | sql |  | 0 |
| `isnt_ancestor_of` | name, name | text | sql |  | 0 |
| `isnt_definer` | name, text | text | sql |  | 0 |
| `isnt_descendent_of` | name, name, name, name, text | text | sql |  | 0 |
| `isnt_empty` | text, text | text | plpgsql |  | 0 |
| `isnt_member_of` | name, name[] | text | sql |  | 0 |
| `isnt_normal_function` | name, name, text | text | sql |  | 0 |
| `isnt_partitioned` | name, name | text | sql |  | 0 |
| `isnt_procedure` | name, name[], text | text | sql |  | 0 |
| `isnt_strict` | name, name | text | sql |  | 0 |
| `isnt_superuser` | name | text | sql |  | 0 |
| `isnt_window` | name, name, text | text | sql |  | 0 |
| `items_generate_code` | – | trigger | plpgsql |  | 0 |
| `items_generate_qr` | – | trigger | plpgsql |  | 0 |
| `language_is_trusted` | name | text | sql |  | 0 |
| `language_owner_is` | name, name | text | sql |  | 0 |
| `language_privs_are` | name, name, name[] | text | sql |  | 0 |
| `languages_are` | name[], text | text | sql |  | 0 |
| `laundry_batch_items_update_inventory` | – | trigger | plpgsql | ✓ | 0 |
| `laundry_batches_generate_code` | – | trigger | plpgsql |  | 0 |
| `laundry_vendors_generate_code` | – | trigger | plpgsql |  | 0 |
| `lift_expired_dnd_oos` | – | jsonb | plpgsql | ✓ | 0 |
| `lives_ok` | text, text | text | plpgsql |  | 0 |
| `log_activity` | p_tenant_id uuid, p_user_id uuid, p_action text, p_entity_type text, p_entity_id | void | plpgsql | ✓ | 0 |
| `log_shift_history` | – | trigger | plpgsql | ✓ | 0 |
| `log_state_transition` | p_tenant_id uuid, p_hotel_id uuid, p_table_name text, p_record_id uuid, p_action | bigint | plpgsql | ✓ | 0 |
| `maintenance_requests_generate_code` | – | trigger | plpgsql |  | 0 |
| `manager_override_charge` | p_charge_id uuid, p_decision text, p_override_reason text | jsonb | plpgsql | ✓ | 1 |
| `mark_batch_partially_received` | _batch_id uuid, _items jsonb | jsonb | plpgsql | ✓ | 1 |
| `mark_batches_compensation_needed` | – | jsonb | plpgsql | ✓ | 0 |
| `mark_cannot_access` | p_room_order_id uuid, p_exception_type text, p_exception_reason text DEFAULT NUL | jsonb | plpgsql | ✓ | 1 |
| `mark_primary_owner` | – | trigger | plpgsql |  | 0 |
| `matches` | anyelement, text | text | sql |  | 0 |
| `materialized_view_owner_is` | name, name, name | text | sql |  | 0 |
| `materialized_views_are` | name[], text | text | sql |  | 0 |
| `no_plan` | – | SETOF boolean | plpgsql |  | 0 |
| `notify_task_rejected` | – | trigger | plpgsql | ✓ | 0 |
| `num_failed` | – | integer | sql |  | 0 |
| `ok` | boolean, text | text | plpgsql |  | 0 |
| `on_tenant_created` | – | trigger | plpgsql | ✓ | 0 |
| `opclass_owner_is` | name, name | text | sql |  | 0 |
| `opclasses_are` | name, name[], text | text | sql |  | 0 |
| `operators_are` | text[], text | text | sql |  | 0 |
| `os_name` | – | text | sql |  | 0 |
| `outbox_next_retry_at` | _retry_count integer | timestamp with time zone | sql |  | 0 |
| `partitions_are` | name, name, name[] | text | sql |  | 0 |
| `pass` | text | text | sql |  | 0 |
| `perform_checkin` | p_booking_id uuid, p_room_id uuid, p_early_checkin_charge numeric DEFAULT 0 | jsonb | plpgsql | ✓ | 3 |
| `perform_checkout` | p_booking_id uuid, p_room_id uuid, p_late_checkout_charge numeric DEFAULT 0, p_s | jsonb | plpgsql | ✓ | 4 |
| `perform_quick_room_check` | _room_id uuid, _check_type text DEFAULT 'daily'::text, _notes text DEFAULT NULL: | jsonb | plpgsql | ✓ | 1 |
| `performs_ok` | text, numeric | text | sql |  | 0 |
| `performs_within` | text, numeric, numeric, text | text | sql |  | 0 |
| `pg_version` | – | text | sql |  | 0 |
| `pg_version_num` | – | integer | sql |  | 0 |
| `pgtap_version` | – | numeric | sql |  | 0 |
| `plan` | integer | text | plpgsql |  | 0 |
| `policies_are` | name, name[] | text | sql |  | 0 |
| `policy_cmd_is` | name, name, text | text | sql |  | 0 |
| `policy_roles_are` | name, name, name[], text | text | sql |  | 0 |
| `prevent_booking_overlap` | – | trigger | plpgsql |  | 0 |
| `preview_asset_group_mapping` | _tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid | TABLE(item_id uuid, item_code text, item | plpgsql | ✓ | 1 |
| `process_expired_subscriptions` | – | void | plpgsql | ✓ | 0 |
| `process_room_check_issue_outbox` | _limit integer DEFAULT 50 | jsonb | plpgsql | ✓ | 0 |
| `purchase_order_items_receive` | – | trigger | plpgsql |  | 0 |
| `purchase_orders_generate_code` | – | trigger | plpgsql |  | 0 |
| `qc_approve_task` | _task_id uuid, _score_override integer DEFAULT NULL::integer, _notes text DEFAUL | jsonb | plpgsql | ✓ | 0 |
| `qc_escalate_overdue` | – | integer | plpgsql | ✓ | 0 |
| `qc_force_approve` | _task_id uuid, _reason text | jsonb | plpgsql | ✓ | 0 |
| `qc_reject_task` | _task_id uuid, _reason text, _categories text[] DEFAULT '{}'::text[] | jsonb | plpgsql | ✓ | 0 |
| `queue_email_notification` | p_tenant_id uuid, p_user_id uuid, p_to_email text, p_subject text, p_body_html t | uuid | plpgsql | ✓ | 1 |
| `reassign_subordinates` | p_old_manager_id uuid, p_new_manager_id uuid | integer | plpgsql | ✓ | 0 |
| `receive_batch` | p_batch_id uuid, p_actor_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `reconcile_room_check_outbox` | _hours integer DEFAULT 24 | jsonb | plpgsql | ✓ | 0 |
| `refresh_consumption_snapshots` | _tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `refresh_monthly_expenses` | – | void | plpgsql | ✓ | 0 |
| `reject_room_delivery` | p_distribution_order_room_id uuid, p_rejected_by uuid, p_rejection_reason text | jsonb | plpgsql | ✓ | 1 |
| `reject_task` | _task_id uuid, _reason text | housekeeping_tasks | plpgsql | ✓ | 1 |
| `reject_tenant` | p_tenant_id uuid, p_admin_id uuid, p_reason text | jsonb | plpgsql | ✓ | 1 |
| `relation_owner_is` | name, name, name, text | text | plpgsql |  | 0 |
| `reopen_room_check` | _check_id uuid, _reason text DEFAULT NULL::text | jsonb | plpgsql | ✓ | 1 |
| `resolve_qc_settings` | _tenant_id uuid, _hotel_id uuid, _task_type text | TABLE(qc_required boolean, sla_minutes i | sql | ✓ | 0 |
| `results_eq` | refcursor, refcursor | text | sql |  | 0 |
| `results_ne` | refcursor, text, text | text | plpgsql |  | 0 |
| `retry_stop` | p_room_order_id uuid, p_actor_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `return_to_stock_for_stop` | p_room_order_id uuid, p_actor_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `review_chargeable_consumptions` | p_ids uuid[], p_decision text, p_reason text DEFAULT NULL::text | TABLE(updated_count integer) | plpgsql | ✓ | 1 |
| `review_room_check_issue` | p_issue_id uuid, p_decision text, p_reason text DEFAULT NULL::text | jsonb | plpgsql | ✓ | 1 |
| `roles_are` | name[], text | text | sql |  | 0 |
| `room_items_update_inventory` | – | trigger | plpgsql |  | 0 |
| `row_eq` | text, anyelement | text | sql |  | 0 |
| `rule_is_instead` | name, name, text | text | plpgsql |  | 0 |
| `rule_is_on` | name, name, text | text | sql |  | 0 |
| `rules_are` | name, name[], text | text | sql |  | 0 |
| `run_auto_reorder_daily` | – | jsonb | plpgsql | ✓ | 0 |
| `runtests` | – | SETOF text | sql |  | 0 |
| `schedule_renewal_reminders` | – | void | plpgsql |  | 1 |
| `schema_owner_is` | name, name | text | sql |  | 0 |
| `schema_privs_are` | name, name, name[] | text | sql |  | 0 |
| `schemas_are` | name[] | text | sql |  | 0 |
| `send_draft_batch` | p_batch_id uuid, p_vendor_id uuid, p_delivery_date date, p_expected_return_date  | jsonb | plpgsql | ✓ | 1 |
| `sequence_owner_is` | name, name, name | text | sql |  | 0 |
| `sequence_privs_are` | name, name, name[] | text | sql |  | 0 |
| `sequences_are` | name[] | text | sql |  | 0 |
| `server_privs_are` | name, name, name[] | text | sql |  | 0 |
| `set_eq` | text, anyarray, text | text | sql |  | 0 |
| `set_has` | text, text, text | text | sql |  | 0 |
| `set_hasnt` | text, text, text | text | sql |  | 0 |
| `set_ne` | text, anyarray | text | sql |  | 0 |
| `set_tenant_read_only` | p_tenant_id uuid, p_reason text | void | plpgsql | ✓ | 0 |
| `settle_batch_compensation` | _batch_id uuid | jsonb | plpgsql | ✓ | 1 |
| `setup_new_tenant` | p_user_id uuid, p_tenant_name text, p_tenant_email text, p_tenant_phone text, p_ | jsonb | plpgsql | ✓ | 0 |
| `setup_room_initial` | p_room_id uuid, p_reset_quantities boolean DEFAULT false | jsonb | plpgsql | ✓ | 1 |
| `skip` | why text, how_many integer | text | plpgsql |  | 0 |
| `stock_adjustment_items_apply` | – | trigger | plpgsql |  | 0 |
| `stock_adjustments_generate_code` | – | trigger | plpgsql |  | 0 |
| `submit_room_check_for_qc` | _task_id uuid, _room_check_id uuid | jsonb | plpgsql | ✓ | 0 |
| `submit_room_check_lean` | _room_id uuid, _check_type text, _started_at timestamp with time zone, _notes te | jsonb | plpgsql | ✓ | 1 |
| `sync_categories_for_hotel` | p_tenant_id uuid, p_hotel_id uuid | jsonb | plpgsql | ✓ | 1 |
| `table_owner_is` | name, name, text | text | plpgsql |  | 0 |
| `table_privs_are` | name, name, name, name[] | text | sql |  | 0 |
| `tables_are` | name[], text | text | sql |  | 0 |
| `tablespace_owner_is` | name, name | text | sql |  | 0 |
| `tablespace_privs_are` | name, name, name[] | text | sql |  | 0 |
| `tablespaces_are` | name[] | text | sql |  | 0 |
| `tg_inventory_out_update_reorder` | – | trigger | plpgsql | ✓ | 0 |
| `tg_reorder_suggestions_updated_at` | – | trigger | plpgsql | ✓ | 0 |
| `throws_ilike` | text, text | text | sql |  | 0 |
| `throws_imatching` | text, text | text | sql |  | 0 |
| `throws_like` | text, text | text | sql |  | 0 |
| `throws_matching` | text, text | text | sql |  | 0 |
| `throws_ok` | text, integer | text | sql |  | 0 |
| `todo` | how_many integer, why text | SETOF boolean | plpgsql |  | 0 |
| `todo_end` | – | SETOF boolean | plpgsql |  | 0 |
| `todo_start` | – | SETOF boolean | plpgsql |  | 0 |
| `touch_batch_inventory` | – | trigger | plpgsql |  | 0 |
| `transition_booking_status` | _booking_id uuid, _to_status text, _reason text DEFAULT NULL::text, _amount_owed | room_bookings | plpgsql | ✓ | 1 |
| `transition_laundry_batch_status` | _batch_id uuid, _to text, _reason text DEFAULT NULL::text | jsonb | plpgsql | ✓ | 0 |
| `transition_room_status` | _room_id uuid, _to_status text, _reason text DEFAULT NULL::text, _dnd_until time | jsonb | plpgsql | ✓ | 1 |
| `transition_task_status` | _task_id uuid, _to_status text, _reason text DEFAULT NULL::text, _force boolean  | housekeeping_tasks | plpgsql | ✓ | 1 |
| `trg_hotel_policy_history` | – | trigger | plpgsql | ✓ | 0 |
| `trg_laundry_batch_snapshot_policy` | – | trigger | plpgsql | ✓ | 0 |
| `trg_rci_set_charge_status` | – | trigger | plpgsql | ✓ | 0 |
| `trg_room_check_issues_outbox_fanout` | – | trigger | plpgsql | ✓ | 0 |
| `trigger_check_tenant_quota` | – | trigger | plpgsql | ✓ | 0 |
| `trigger_is` | name, name, name, name, name, text | text | plpgsql |  | 0 |
| `trigger_update_laundry_stats` | – | trigger | plpgsql |  | 0 |
| `trigger_update_maintenance_stats` | – | trigger | plpgsql |  | 0 |
| `triggers_are` | name, name[], text | text | sql |  | 0 |
| `type_owner_is` | name, name, text | text | plpgsql |  | 0 |
| `types_are` | name[] | text | sql |  | 0 |
| `unalike` | anyelement, text, text | text | sql |  | 0 |
| `undo_quick_room_check` | _check_id uuid, _reason text DEFAULT NULL::text | jsonb | plpgsql | ✓ | 1 |
| `undo_room_delivery_confirmation` | p_distribution_order_room_id uuid, p_performed_by uuid | jsonb | plpgsql | ✓ | 1 |
| `unialike` | anyelement, text | text | sql |  | 0 |
| `update_adjustment_summary` | – | trigger | plpgsql |  | 0 |
| `update_booking_amount_paid` | p_booking_id uuid, p_amount_to_add numeric, p_total_amount numeric | jsonb | plpgsql | ✓ | 2 |
| `update_distribution_order` | p_order_id uuid, p_assigned_to uuid DEFAULT NULL::uuid, p_notes text DEFAULT NUL | jsonb | plpgsql | ✓ | 1 |
| `update_distribution_order_status` | – | trigger | plpgsql |  | 0 |
| `update_guest_stats_on_checkout` | – | trigger | plpgsql | ✓ | 0 |
| `update_purchase_order_totals` | – | trigger | plpgsql |  | 0 |
| `update_room_pricing_rules_updated_at` | – | trigger | plpgsql |  | 0 |
| `update_room_status_safe` | p_room_id uuid, p_new_status text, p_expected_updated_at timestamp with time zon | jsonb | plpgsql | ✓ | 0 |
| `update_staff_status_from_room_check` | – | trigger | plpgsql | ✓ | 0 |
| `update_tenant_usage` | p_tenant_id uuid | void | plpgsql | ✓ | 3 |
| `update_updated_at_column` | – | trigger | plpgsql |  | 0 |
| `update_vendor_stats` | – | trigger | plpgsql |  | 0 |
| `update_workflow_stats` | – | trigger | plpgsql | ✓ | 0 |
| `user_has_hotel_access` | p_user_id uuid, p_hotel_id uuid | boolean | sql | ✓ | 0 |
| `user_has_subordinates` | p_user_id uuid | boolean | sql |  | 1 |
| `users_are` | name[], text | text | sql |  | 0 |
| `validate_booking_dates` | p_room_id uuid, p_check_in date, p_check_out date, p_exclude_booking_id uuid DEF | jsonb | plpgsql | ✓ | 2 |
| `validate_chargeable_approval_status` | – | trigger | plpgsql |  | 0 |
| `validate_hourly_against_daily` | p_room_id uuid, p_booking_date date, p_exclude_booking_id uuid DEFAULT NULL::uui | jsonb | plpgsql | ✓ | 1 |
| `validate_hourly_booking` | p_room_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with | jsonb | plpgsql | ✓ | 1 |
| `validate_item_category_hotel` | – | trigger | plpgsql | ✓ | 0 |
| `validate_plan_change` | p_tenant_id uuid, p_new_plan_id uuid | jsonb | plpgsql | ✓ | 1 |
| `validate_room_check_context` | p_room_id uuid, p_check_type text, p_task_id uuid DEFAULT NULL::uuid | jsonb | plpgsql | ✓ | 1 |
| `validate_room_check_issue_entries` | – | trigger | plpgsql |  | 0 |
| `validate_room_item_hotel` | – | trigger | plpgsql | ✓ | 0 |
| `vendors_generate_code` | – | trigger | plpgsql |  | 0 |
| `view_owner_is` | name, name, text | text | plpgsql |  | 0 |
| `views_are` | name, name[], text | text | sql |  | 0 |
| `volatility_is` | name, text | text | sql |  | 0 |
| `works_at_same_hotel` | target_user_id uuid | boolean | sql | ✓ | 0 |

## Chi tiết caller

### `add_laundry_to_draft_batch`

- `src/hooks/useLaundryRequests.ts`
- `src/hooks/useRoomChecks.ts`

### `apply_asset_group_mapping`

- `src/hooks/useAssetGroupMapping.ts`

### `apply_promo_code`

- `src/hooks/super-admin/usePromoCodes.ts`

### `apply_room_standards`

- `src/hooks/useBulkRoomActions.ts`
- `src/hooks/useRoomStandards.ts`

### `approve_reorder_suggestions`

- `src/hooks/useReorderSuggestions.ts`

### `approve_task`

- `src/hooks/useTaskQc.ts`

### `approve_tenant`

- `src/hooks/super-admin/useTenantApproval.ts`

### `atomic_item_consumed`

- `src/hooks/useRoomChecks.ts`

### `atomic_item_lost`

- `src/hooks/useRoomChecks.ts`

### `atomic_item_to_laundry`

- `src/hooks/useRoomChecks.ts`

### `batch_confirm_room_deliveries`

- `src/hooks/useRoomDistributionHistory.ts`

### `bulk_delete_items`

- `src/hooks/useItems.ts`

### `calculate_staff_statistics`

- `src/hooks/useStaffStatistics.ts`

### `calculate_tenant_storage`

- `src/hooks/useTenantUsage.ts`

### `cancel_booking`

- `src/hooks/useBookingActions.ts`

### `cancel_distribution_order`

- `src/hooks/useDistributionOrders.ts`

### `check_expiring_subscriptions`

- `src/hooks/useEmailNotifications.ts`

### `check_tenant_can_add`

- `src/hooks/useTenantUsage.ts`

### `close_route_if_complete`

- `src/hooks/useRouteBatch.ts`

### `complete_registration`

- `src/pages/auth/Onboarding.tsx`
- `src/pages/items/CategoriesPage.tsx`

### `complete_room_delivery`

- `src/hooks/useDistributionOrders.ts`

### `complete_task`

- `src/hooks/useHousekeepingTasks.ts`
- `src/hooks/useTaskQc.ts`

### `compute_reorder_suggestions`

- `src/hooks/useReorderSuggestions.ts`

### `confirm_delivery_from_room_check`

- `src/hooks/usePendingDeliveries.ts`

### `confirm_receive_order`

- `src/hooks/useRouteBatch.ts`

### `confirm_room_delivery`

- `src/hooks/useRoomDistributionHistory.ts`

### `confirm_warehouse_delivery`

- `src/hooks/useDistributionOrders.ts`

### `create_distribution_order`

- `src/hooks/useCreateDistributionFromSupplement.ts`
- `src/hooks/useCreateDistributionFromSupplements.ts`
- `src/hooks/useDistributionOrders.ts`

### `create_inbound_transaction`

- `src/hooks/useInventoryTransactions.ts`
- `src/hooks/usePurchaseOrders.ts`

### `create_laundry_batch_with_items`

- `src/hooks/useLaundryBatches.ts`

### `create_laundry_loss_transaction`

- `src/hooks/useLaundryBatches.ts`

### `create_laundry_return_transaction`

- `src/hooks/useLaundryBatches.ts`

### `create_new_linen_batch`

- `src/hooks/useLaundryCompensation.ts`

### `create_notification_for_user`

- `src/hooks/useNotificationTriggers.ts`

### `create_outbound_transaction`

- `src/hooks/useInventoryTransactions.ts`
- `src/hooks/useRoomSupplements.ts`
- `src/hooks/useSupplementRequests.ts`

### `create_stock_adjustment`

- `src/hooks/useStockAdjustments.ts`

### `create_warehouse_transfer`

- `src/hooks/useWarehouseTransfer.ts`

### `delete_inventory_transaction`

- `src/hooks/useInventoryTransactions.ts`

### `deliver_stop`

- `src/hooks/useRouteBatch.ts`

### `generate_guest_invoice_number`

- `src/hooks/useGuestInvoices.ts`
- `src/lib/invoiceHelpers.ts`

### `generate_laundry_request_code`

- `src/hooks/useLaundryRequests.ts`
- `src/hooks/useRoomChecks.ts`

### `generate_lost_found_item_code`

- `src/pages/lost-found/LostFoundPage.tsx`

### `generate_supplement_request_code`

- `src/hooks/useRoomChecks.ts`
- `src/hooks/useSupplementRequests.ts`

### `get_abc_analysis`

- `src/hooks/useReports.ts`

### `get_all_warehouse_stock_summary`

- `src/hooks/useWarehouseReport.ts`

### `get_booking_chargeable_total`

- `src/hooks/useChargeableConsumptions.ts`

### `get_categories_with_stats`

- `src/hooks/useCategories.ts`

### `get_consumption_trend`

- `src/hooks/useConsumptionAnalytics.ts`

### `get_current_room_booking`

- `src/hooks/useRoomBooking.ts`

### `get_dashboard_stats`

- `src/hooks/useDashboardStats.ts`

### `get_dead_stock_report`

- `src/hooks/useDeadStockReport.ts`

### `get_distribution_order_detail`

- `src/hooks/useDistributionOrders.ts`
- `src/hooks/useRouteBatch.ts`

### `get_distribution_orders_count`

- `src/hooks/useRouteFilters.ts`

### `get_distribution_orders_filtered`

- `src/hooks/useDistributionOrders.ts`
- `src/hooks/useRouteFilters.ts`

### `get_effective_permissions`

- `src/hooks/useEffectivePermissions.ts`

### `get_financial_report`

- `src/hooks/useReports.ts`

### `get_floor_plan`

- `src/hooks/useFloorPlan.ts`

### `get_hotel_performance_stats`

- `src/hooks/useHotelPerformance.ts`

### `get_hotels_breakdown_stats`

- `src/hooks/useDashboardStats.ts`

### `get_hotels_performance_comparison`

- `src/hooks/useHotelPerformance.ts`

### `get_inventory_dashboard_stats`

- `src/hooks/useInventoryDashboard.ts`

### `get_inventory_report`

- `src/hooks/useReports.ts`

### `get_inventory_transactions_filtered`

- `src/hooks/useInventoryTransactions.ts`

### `get_inventory_value_over_time`

- `src/hooks/useInventoryDashboard.ts`

### `get_items_filtered`

- `src/components/items/ItemFilters.tsx`
- `src/hooks/useItems.ts`

### `get_last_room_check`

- `src/hooks/useQuickRoomCheck.ts`

### `get_laundry_batch_detail`

- `src/hooks/useLaundryBatches.ts`

### `get_laundry_batches_filtered`

- `src/hooks/useLaundryBatches.ts`

### `get_laundry_dashboard_stats`

- `src/hooks/useLaundryDashboard.ts`

### `get_laundry_report`

- `src/hooks/useReports.ts`

### `get_low_stock_by_warehouses`

- `src/hooks/useWarehouseReport.ts`

### `get_low_stock_items`

- `src/hooks/useInventoryDashboard.ts`
- `src/hooks/useReports.ts`

### `get_maintenance_dashboard`

- `src/hooks/useMaintenanceDashboard.ts`

### `get_maintenance_report`

- `src/hooks/useMaintenanceReport.ts`

### `get_missing_items_from_room_detail`

- `src/components/distribution/hooks/useDistributionForm.ts`

### `get_monthly_expenses`

- `src/hooks/useMonthlyExpenses.ts`

### `get_monthly_laundry_expenses`

- `src/hooks/useLaundryDashboard.ts`

### `get_pending_tenants`

- `src/hooks/super-admin/useTenantApproval.ts`

### `get_recent_activities`

- `src/hooks/useRecentActivities.ts`

### `get_room_checks_report`

- `src/hooks/useRoomsReportData.ts`

### `get_room_items_with_standards`

- `src/hooks/useRoomSupplements.ts`
- `src/hooks/useRooms.ts`

### `get_room_standards`

- `src/hooks/useRoomStandards.ts`

### `get_rooms_filtered`

- `src/hooks/useRoomSupplements.ts`
- `src/hooks/useRooms.ts`

### `get_rooms_report_stats`

- `src/hooks/useRoomsReportData.ts`

### `get_stock_adjustments_filtered`

- `src/hooks/useStockAdjustments.ts`

### `get_stock_audit_report`

- `src/hooks/useStockAuditReport.ts`

### `get_super_admin_dashboard_stats`

- `src/hooks/useSuperAdminStats.ts`

### `get_tenant_billing_summary`

- `src/hooks/super-admin/useTenantBilling.ts`

### `get_top_items`

- `src/hooks/useTopItems.ts`

### `get_turnover_analysis`

- `src/hooks/useReports.ts`

### `get_user_levels`

- `src/hooks/useUserLevels.ts`

### `get_user_permissions`

- `src/hooks/usePermissions.ts`
- `src/hooks/useUserPermissions.ts`

### `get_user_permissions_summary`

- `src/hooks/useUserModulePermissions.ts`
- `src/hooks/useUserPermissionConfiguration.ts`
- `src/hooks/useUserPermissions.ts`

### `get_user_subordinates`

- `src/hooks/useSubordinates.ts`

### `get_users_by_hotel`

- `src/hooks/useUsers.ts`

### `get_vendor_performance`

- `src/hooks/useLaundryVendors.ts`

### `get_warehouse_stock_summary`

- `src/hooks/useWarehouseStock.ts`

### `handover_batch`

- `src/hooks/useRouteBatch.ts`

### `handover_stop_create_next_route`

- `src/hooks/useRouteBatch.ts`

### `has_user_permission`

- `src/components/auth/PermissionRoute.tsx`
- `src/hooks/usePermission.ts`
- `src/hooks/useUserPermissions.ts`

### `ignore_reorder_suggestion`

- `src/hooks/useReorderSuggestions.ts`

### `manager_override_charge`

- `src/pages/reception/PendingChargesPage.tsx`

### `mark_batch_partially_received`

- `src/hooks/useLaundryCompensation.ts`

### `mark_cannot_access`

- `src/hooks/useRouteBatch.ts`

### `perform_checkin`

- `src/components/rooms/RoomBookingDialog.tsx`
- `src/hooks/useBookingActions.ts`
- `src/pages/bookings/BookingsPage.tsx`

### `perform_checkout`

- `src/components/bookings/GroupCheckoutDialog.tsx`
- `src/components/rooms/RoomBookingDialog.tsx`
- `src/hooks/useBookingActions.ts`
- `src/pages/bookings/BookingsPage.tsx`

### `perform_quick_room_check`

- `src/hooks/useQuickRoomCheck.ts`

### `preview_asset_group_mapping`

- `src/hooks/useAssetGroupMapping.ts`

### `queue_email_notification`

- `src/hooks/useEmailNotifications.ts`

### `receive_batch`

- `src/hooks/useRouteBatch.ts`

### `refresh_consumption_snapshots`

- `src/hooks/useConsumptionAnalytics.ts`

### `reject_room_delivery`

- `src/hooks/useRoomDistributionHistory.ts`

### `reject_task`

- `src/hooks/useTaskQc.ts`

### `reject_tenant`

- `src/hooks/super-admin/useTenantApproval.ts`

### `reopen_room_check`

- `src/hooks/useRoomCheckLean.ts`

### `retry_stop`

- `src/hooks/useRouteBatch.ts`

### `return_to_stock_for_stop`

- `src/hooks/useRouteBatch.ts`

### `review_chargeable_consumptions`

- `src/pages/reception/PendingChargesPage.tsx`

### `review_room_check_issue`

- `src/pages/housekeeping/IssuesReviewPage.tsx`

### `schedule_renewal_reminders`

- `src/hooks/super-admin/useRenewalReminders.ts`

### `send_draft_batch`

- `src/hooks/useSendDraftBatch.ts`

### `settle_batch_compensation`

- `src/hooks/useLaundryCompensation.ts`

### `setup_room_initial`

- `src/hooks/useSetupRoom.ts`

### `submit_room_check_lean`

- `src/hooks/useRoomCheckLean.ts`

### `sync_categories_for_hotel`

- `src/hooks/useSyncCategories.ts`

### `transition_booking_status`

- `src/hooks/useBookingFlagTransition.ts`

### `transition_room_status`

- `src/hooks/useRoomTransition.ts`

### `transition_task_status`

- `src/hooks/useTaskTransition.ts`

### `undo_quick_room_check`

- `src/hooks/useUndoQuickRoomCheck.ts`

### `undo_room_delivery_confirmation`

- `src/hooks/useRoomDistributionHistory.ts`

### `update_booking_amount_paid`

- `src/components/bookings/GroupPaymentDialog.tsx`
- `src/hooks/useBookingPayments.ts`

### `update_distribution_order`

- `src/hooks/useDistributionOrders.ts`

### `update_tenant_usage`

- `src/components/super-admin/tenants/ChangePlanDialog.tsx`
- `src/hooks/useSubscription.ts`
- `src/hooks/useTenantUsage.ts`

### `user_has_subordinates`

- `src/hooks/useSubordinates.ts`

### `validate_booking_dates`

- `src/components/bookings/ExtendBookingDialog.tsx`
- `src/components/bookings/booking-wizard/hooks/useBookingForm.ts`

### `validate_hourly_against_daily`

- `src/components/bookings/booking-wizard/hooks/useBookingForm.ts`

### `validate_hourly_booking`

- `src/components/bookings/booking-wizard/hooks/useBookingForm.ts`

### `validate_plan_change`

- `src/hooks/useValidatePlanChange.ts`

### `validate_room_check_context`

- `src/hooks/useRoomCheckGuard.ts`


## RPC không có caller frontend (cần kiểm tra)

- `_add`(text, integer, text)
- `_alike`(boolean, anyelement, text, text)
- `_ancestor_of`(name, name, name, name, integer)
- `_are`(text, name[], name[], text)
- `_areni`(text, text[], text[], text)
- `_array_to_sorted_string`(name[], text)
- `_assets_are`(text, text[], text[], text)
- `_cast_exists`(name, name, name)
- `_cdi`(name, name, anyelement)
- `_cexists`(name, name)
- `_ckeys`(name, name, character)
- `_cleanup`()
- `_cmp_types`(oid, name)
- `_col_is_null`(name, name, text, boolean)
- `_constraint`(name, character, name[], text, text)
- `_contract_on`(text)
- `_currtest`()
- `_db_privs`()
- `_def_is`(text, text, anyelement, text)
- `_definer`(name, name[])
- `_dexists`(name)
- `_do_ne`(text, text, text, text)
- `_docomp`(text, text, text, text)
- `_error_diag`(text, text, text, text, text, text, text, text, text, text)
- `_expand_context`(character)
- `_expand_on`(character)
- `_expand_vol`(character)
- `_ext_exists`(name)
- `_extensions`(name)
- `_extras`(character[], name, name[])
- `_finish`(integer, integer, integer, boolean DEFAULT NULL::boolean)
- `_fkexists`(name, name, name[])
- `_fprivs_are`(text, name, name[], text)
- `_func_compare`(name, name, anyelement, anyelement, text)
- `_funkargs`(name[])
- `_get`(text)
- `_get_ac_privs`(name, text)
- `_get_col_ns_type`(name, name, name)
- `_get_col_privs`(name, text, name)
- `_get_col_type`(name, name)
- `_get_context`(name, name)
- `_get_db_owner`(name)
- `_get_db_privs`(name, text)
- `_get_dtype`(name)
- `_get_fdw_privs`(name, text)
- `_get_func_owner`(name, name, name[])
- `_get_func_privs`(text, text)
- `_get_index_owner`(name, name)
- `_get_lang_privs`(name, text)
- `_get_language_owner`(name)
- `_get_latest`(text, integer)
- `_get_note`(integer)
- `_get_opclass_owner`(name, name)
- `_get_rel_owner`(name)
- `_get_schema_owner`(name)
- `_get_schema_privs`(name, text)
- `_get_sequence_privs`(name, text)
- `_get_server_privs`(name, text)
- `_get_table_privs`(name, text)
- `_get_tablespace_owner`(name)
- `_get_tablespaceprivs`(name, text)
- `_get_type_owner`(name, name)
- `_got_func`(name, name[])
- `_grolist`(name)
- `_has_def`(name, name, name)
- `_has_group`(name)
- `_has_role`(name)
- `_has_type`(name, name, character[])
- `_has_user`(name)
- `_hasc`(name, name, character)
- `_have_index`(name, name)
- `_ident_array_to_sorted_string`(name[], text)
- `_ident_array_to_string`(name[], text)
- `_ikeys`(name, name, name)
- `_inherited`(name, name)
- `_is_indexed`(name, name, text[])
- `_is_instead`(name, name, name)
- `_is_schema`(name)
- `_is_super`(name)
- `_is_trusted`(name)
- `_is_verbose`()
- `_keys`(name, character)
- `_lang`(name, name)
- `_missing`(character, name[])
- `_nosuch`(name, name, name[])
- `_op_exists`(name, name, name)
- `_opc_exists`(name)
- `_partof`(name, name)
- `_parts`(name, name)
- `_pg_sv_column_array`(oid, smallint[])
- `_pg_sv_table_accessible`(oid, oid)
- `_pg_sv_type_array`(oid[])
- `_prokind`(p_oid oid)
- `_query`(text)
- `_quote_ident_like`(text, text)
- `_refine_vol`(text)
- `_relcomp`(text, text, text, text)
- `_relexists`(name, name)
- `_relne`(text, text, text, text)
- `_returns`(name, name)
- `_rexists`(character[], name)
- `_rule_on`(name, name)
- `_runem`(text[], boolean)
- `_runner`(text[], text[], text[], text[], text[])
- `_set`(integer, integer)
- `_strict`(name, name, name[])
- `_table_privs`()
- `_temptable`(text, text)
- `_temptypes`(text)
- `_time_trials`(text, integer, numeric)
- `_tlike`(boolean, text, text, text)
- `_todo`()
- `_trig`(name, name)
- `_type_func`("char", name, name[])
- `_types_are`(name[], text, character[])
- `_unalike`(boolean, anyelement, text, text)
- `_vol`(name)
- `add_result`(boolean, boolean, text, text, text)
- `alike`(anyelement, text)
- `allocate_linen_fifo`(_item_id uuid, _quantity integer)
- `any_column_privs_are`(name, name, name[])
- `assign_default_permissions_to_role`(p_tenant_id uuid, p_role_code text, p_permission_codes text[)
- `auto_apply_read_only_after_grace`()
- `auto_assign_batch_number`()
- `auto_classify_item_type`()
- `auto_create_batch_records`()
- `auto_offline_inactive_staff`()
- `auto_update_order_floor`()
- `bag_eq`(text, text, text)
- `bag_has`(text, text, text)
- `bag_hasnt`(text, text, text)
- `bag_ne`(text, text)
- `calculate_grace_period_end`()
- `calculate_payment_status`()
- `can`(name, name[], text)
- `can_create_user`(p_creator_id uuid, p_new_user_level text, p_tenant_id uuid)
- `can_manage_user`(p_manager_id uuid, p_target_user_id uuid)
- `can_perform_quick_check`(_room_id uuid)
- `cast_context_is`(name, name, text)
- `casts_are`(text[], text)
- `check_and_update_batch_status`(p_batch_id uuid)
- `check_and_update_order_status`(p_order_id uuid)
- `check_created_by_required`()
- `check_duplicate_room_check`()
- `check_rate_limit`(_bucket_key text, _max_hits integer, _window_seconds integer)
- `check_test`(text, boolean, text, text, text)
- `cleanup_expired_otps`()
- `cleanup_old_check_sessions`()
- `cleanup_orphaned_auth_users`()
- `cleanup_rate_limit_hits`()
- `cleanup_stale_check_sessions`()
- `clear_tenant_read_only`(p_tenant_id uuid, p_reason text DEFAULT NULL::text)
- `cmp_ok`(anyelement, text, anyelement, text)
- `col_default_is`(name, name, name, anyelement, text)
- `col_has_check`(name, name[], text)
- `col_has_default`(name, name, name, text)
- `col_hasnt_default`(name, name, text)
- `col_is_fk`(name, name[])
- `col_is_null`(table_name name, column_name name, description text DEFAULT )
- `col_is_pk`(name, name, text)
- `col_is_unique`(name, name, text)
- `col_isnt_fk`(name, name[], text)
- `col_isnt_pk`(name, name[], text)
- `col_not_null`(schema_name name, table_name name, column_name name, descrip)
- `col_type_is`(name, name, name, name, text, text)
- `collect_tap`(character varying[])
- `column_privs_are`(name, name, name, name[], text)
- `columns_are`(name, name, name[], text)
- `composite_owner_is`(name, name, name)
- `compute_auto_reorder_suggestions`(_tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid)
- `create_default_categories`(p_tenant_id uuid)
- `create_default_tenant_roles`(p_tenant_id uuid)
- `create_default_warehouse_for_hotel`(p_hotel_id uuid, p_tenant_id uuid)
- `create_notification`(p_user_id uuid, p_tenant_id uuid, p_title text, p_body text,)
- `create_staff_status_for_new_user`()
- `create_super_admin`(p_email text, p_full_name text DEFAULT 'Super Admin'::text)
- `database_privs_are`(name, name, name[], text)
- `db_owner_is`(name, name, text)
- `diag`(VARIADIC anyarray)
- `diag_test_name`(text)
- `display_oper`(name, oid)
- `do_tap`()
- `doesnt_imatch`(anyelement, text)
- `doesnt_match`(anyelement, text, text)
- `domain_type_is`(text, text, text)
- `domain_type_isnt`(text, text)
- `domains_are`(name, name[], text)
- `enforce_read_only_mutation`()
- `enforce_room_check_photos`()
- `ensure_single_default_warehouse`()
- `enum_has_labels`(name, name, name[], text)
- `enums_are`(name, name[])
- `extensions_are`(name[], text)
- `fail`(text)
- `fdw_privs_are`(name, name, name[], text)
- `findfuncs`(text)
- `finish`(exception_on_failure boolean DEFAULT NULL::boolean)
- `fk_ok`(name, name, name, name, name, name, text)
- `fn_can_user_transition_room`(_user_id uuid, _from text, _to text)
- `fn_is_valid_room_transition`(_from text, _to text)
- `fn_is_valid_task_transition`(_from text, _to text)
- `fn_room_status_alias`(_status text)
- `fn_sync_room_legacy_status`()
- `fn_sync_room_legacy_status_ins`()
- `fn_sync_room_status_on_booking_flag`()
- `fn_write_audit_log`()
- `foreign_table_owner_is`(name, name, text)
- `foreign_tables_are`(name, name[])
- `function_lang_is`(name, name, name, text)
- `function_owner_is`(name, name[], name)
- `function_privs_are`(name, name[], name, name[], text)
- `function_returns`(name, name[], text)
- `functions_are`(name, name[], text)
- `generate_invoice_number`()
- `generate_unique_code`(prefix text, table_name text, column_name text)
- `get_current_user_role`()
- `get_current_user_tenant_id`()
- `get_item_detail`(p_item_id uuid)
- `get_missing_items_for_rooms`(p_room_ids uuid[])
- `get_qc_daily_trend`(_tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid, _days in)
- `get_qc_floor_stats`(_tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid, _days in)
- `get_qc_staff_stats`(_tenant_id uuid, _hotel_id uuid DEFAULT NULL::uuid, _days in)
- `get_room_detail`(p_room_id uuid)
- `get_room_distribution_history`(p_room_id uuid)
- `get_stale_sessions_for_reminder`()
- `get_user_hotels`(p_user_id uuid)
- `get_user_level`(_user_id uuid)
- `get_user_primary_role`(_user_id uuid)
- `get_workflow_analytics`(p_workflow_id uuid, p_period text DEFAULT 'month'::text)
- `groups_are`(name[], text)
- `handle_item_image_primary`()
- `handle_new_user`()
- `handle_successful_payment`(p_transaction_id uuid)
- `has_cast`(name, name, name)
- `has_check`(name)
- `has_column`(name, name, name, text)
- `has_composite`(name, name, text)
- `has_domain`(name, name, text)
- `has_enum`(name, name, text)
- `has_extension`(name, text)
- `has_fk`(name, text)
- `has_foreign_table`(name, name)
- `has_function`(name, name)
- `has_group`(name, text)
- `has_index`(name, name, text)
- `has_inherited_tables`(name, text)
- `has_language`(name, text)
- `has_leftop`(name, name, name, text)
- `has_materialized_view`(name)
- `has_opclass`(name, name)
- `has_operator`(name, name, name, text)
- `has_permission`(_user_id uuid, _permission_code text)
- `has_pk`(name, name, text)
- `has_relation`(name)
- `has_rightop`(name, name, name, name)
- `has_role`(name, text)
- `has_rule`(name, name, name, text)
- `has_schema`(name, text)
- `has_sequence`(name, text)
- `has_table`(name, name)
- `has_tablespace`(name, text)
- `has_trigger`(name, name, name)
- `has_type`(name, text)
- `has_unique`(text, text)
- `has_user`(name)
- `has_user_level`(_user_id uuid, _level_code text)
- `has_view`(name, text)
- `hasnt_cast`(name, name)
- `hasnt_column`(name, name, name, text)
- `hasnt_composite`(name)
- `hasnt_domain`(name)
- `hasnt_enum`(name, text)
- `hasnt_extension`(name, text)
- `hasnt_fk`(name, name, text)
- `hasnt_foreign_table`(name, text)
- `hasnt_function`(name, name, name[], text)
- `hasnt_group`(name)
- `hasnt_index`(name, name, text)
- `hasnt_inherited_tables`(name)
- `hasnt_language`(name)
- `hasnt_leftop`(name, name, text)
- `hasnt_materialized_view`(name, name, text)
- `hasnt_opclass`(name, name)
- `hasnt_operator`(name, name, name, name)
- `hasnt_pk`(name)
- `hasnt_relation`(name)
- `hasnt_rightop`(name, name, text)
- `hasnt_role`(name, text)
- `hasnt_rule`(name, name, text)
- `hasnt_schema`(name, text)
- `hasnt_sequence`(name, name, text)
- `hasnt_table`(name, text)
- `hasnt_tablespace`(name, text)
- `hasnt_trigger`(name, name)
- `hasnt_type`(name, name, text)
- `hasnt_user`(name)
- `hasnt_view`(name)
- `hotels_generate_code`()
- `ialike`(anyelement, text)
- `imatches`(anyelement, text)
- `in_todo`()
- `increment_quantity_in_laundry`(p_item_id uuid, p_quantity integer)
- `increment_staff_stat`(p_user_id uuid, p_hotel_id uuid, p_stat_type text, p_increme)
- `increment_workflow_stats`(p_workflow_id uuid, p_success boolean)
- `index_is_primary`(name, name)
- `index_is_type`(name, name, name)
- `index_is_unique`(name, name, name)
- `index_owner_is`(name, name, name, name, text)
- `indexes_are`(name, name, name[])
- `initialize_warehouse_stock`(p_warehouse_id uuid, p_hotel_id uuid, p_tenant_id uuid)
- `inventory_transactions_generate_code`()
- `invoices_generate_number`()
- `is`(anyelement, anyelement)
- `is_aggregate`(name)
- `is_ancestor_of`(name, name, name, name, integer, text)
- `is_clustered`(name)
- `is_definer`(name)
- `is_descendent_of`(name, name, name, name, integer, text)
- `is_distribution_leader`(_user_id uuid)
- `is_empty`(text, text)
- `is_indexed`(name, name[], text)
- `is_level_higher_or_equal`(_user_id uuid, _min_level_code text)
- `is_manager`()
- `is_manager_or_above`(_user uuid)
- `is_member_of`(name, name[])
- `is_normal_function`(name, name, name[], text)
- `is_owner_user`()
- `is_partition_of`(name, name, text)
- `is_partitioned`(name, name, text)
- `is_procedure`(name, name[], text)
- `is_qc_manager`(_user_id uuid)
- `is_route_assignee`(_user_id uuid, _order_id uuid)
- `is_storekeeper`(_user_id uuid)
- `is_strict`(name, name, name[])
- `is_super_admin`(p_user_id uuid)
- `is_superuser`(name)
- `is_tenant_owner`()
- `is_tenant_read_only`(p_tenant_id uuid)
- `is_window`(name, name, text)
- `isa_ok`(anyelement, regtype)
- `isnt`(anyelement, anyelement)
- `isnt_aggregate`(name, name[])
- `isnt_ancestor_of`(name, name)
- `isnt_definer`(name, text)
- `isnt_descendent_of`(name, name, name, name, text)
- `isnt_empty`(text, text)
- `isnt_member_of`(name, name[])
- `isnt_normal_function`(name, name, text)
- `isnt_partitioned`(name, name)
- `isnt_procedure`(name, name[], text)
- `isnt_strict`(name, name)
- `isnt_superuser`(name)
- `isnt_window`(name, name, text)
- `items_generate_code`()
- `items_generate_qr`()
- `language_is_trusted`(name)
- `language_owner_is`(name, name)
- `language_privs_are`(name, name, name[])
- `languages_are`(name[], text)
- `laundry_batch_items_update_inventory`()
- `laundry_batches_generate_code`()
- `laundry_vendors_generate_code`()
- `lift_expired_dnd_oos`()
- `lives_ok`(text, text)
- `log_activity`(p_tenant_id uuid, p_user_id uuid, p_action text, p_entity_ty)
- `log_shift_history`()
- `log_state_transition`(p_tenant_id uuid, p_hotel_id uuid, p_table_name text, p_reco)
- `maintenance_requests_generate_code`()
- `mark_batches_compensation_needed`()
- `mark_primary_owner`()
- `matches`(anyelement, text)
- `materialized_view_owner_is`(name, name, name)
- `materialized_views_are`(name[], text)
- `no_plan`()
- `notify_task_rejected`()
- `num_failed`()
- `ok`(boolean, text)
- `on_tenant_created`()
- `opclass_owner_is`(name, name)
- `opclasses_are`(name, name[], text)
- `operators_are`(text[], text)
- `os_name`()
- `outbox_next_retry_at`(_retry_count integer)
- `partitions_are`(name, name, name[])
- `pass`(text)
- `performs_ok`(text, numeric)
- `performs_within`(text, numeric, numeric, text)
- `pg_version`()
- `pg_version_num`()
- `pgtap_version`()
- `plan`(integer)
- `policies_are`(name, name[])
- `policy_cmd_is`(name, name, text)
- `policy_roles_are`(name, name, name[], text)
- `prevent_booking_overlap`()
- `process_expired_subscriptions`()
- `process_room_check_issue_outbox`(_limit integer DEFAULT 50)
- `purchase_order_items_receive`()
- `purchase_orders_generate_code`()
- `qc_approve_task`(_task_id uuid, _score_override integer DEFAULT NULL::integer)
- `qc_escalate_overdue`()
- `qc_force_approve`(_task_id uuid, _reason text)
- `qc_reject_task`(_task_id uuid, _reason text, _categories text[] DEFAULT '{}')
- `reassign_subordinates`(p_old_manager_id uuid, p_new_manager_id uuid)
- `reconcile_room_check_outbox`(_hours integer DEFAULT 24)
- `refresh_monthly_expenses`()
- `relation_owner_is`(name, name, name, text)
- `resolve_qc_settings`(_tenant_id uuid, _hotel_id uuid, _task_type text)
- `results_eq`(refcursor, refcursor)
- `results_ne`(refcursor, text, text)
- `roles_are`(name[], text)
- `room_items_update_inventory`()
- `row_eq`(text, anyelement)
- `rule_is_instead`(name, name, text)
- `rule_is_on`(name, name, text)
- `rules_are`(name, name[], text)
- `run_auto_reorder_daily`()
- `runtests`()
- `schema_owner_is`(name, name)
- `schema_privs_are`(name, name, name[])
- `schemas_are`(name[])
- `sequence_owner_is`(name, name, name)
- `sequence_privs_are`(name, name, name[])
- `sequences_are`(name[])
- `server_privs_are`(name, name, name[])
- `set_eq`(text, anyarray, text)
- `set_has`(text, text, text)
- `set_hasnt`(text, text, text)
- `set_ne`(text, anyarray)
- `set_tenant_read_only`(p_tenant_id uuid, p_reason text)
- `setup_new_tenant`(p_user_id uuid, p_tenant_name text, p_tenant_email text, p_t)
- `skip`(why text, how_many integer)
- `stock_adjustment_items_apply`()
- `stock_adjustments_generate_code`()
- `submit_room_check_for_qc`(_task_id uuid, _room_check_id uuid)
- `table_owner_is`(name, name, text)
- `table_privs_are`(name, name, name, name[])
- `tables_are`(name[], text)
- `tablespace_owner_is`(name, name)
- `tablespace_privs_are`(name, name, name[])
- `tablespaces_are`(name[])
- `tg_inventory_out_update_reorder`()
- `tg_reorder_suggestions_updated_at`()
- `throws_ilike`(text, text)
- `throws_imatching`(text, text)
- `throws_like`(text, text)
- `throws_matching`(text, text)
- `throws_ok`(text, integer)
- `todo`(how_many integer, why text)
- `todo_end`()
- `todo_start`()
- `touch_batch_inventory`()
- `transition_laundry_batch_status`(_batch_id uuid, _to text, _reason text DEFAULT NULL::text)
- `trg_hotel_policy_history`()
- `trg_laundry_batch_snapshot_policy`()
- `trg_rci_set_charge_status`()
- `trg_room_check_issues_outbox_fanout`()
- `trigger_check_tenant_quota`()
- `trigger_is`(name, name, name, name, name, text)
- `trigger_update_laundry_stats`()
- `trigger_update_maintenance_stats`()
- `triggers_are`(name, name[], text)
- `type_owner_is`(name, name, text)
- `types_are`(name[])
- `unalike`(anyelement, text, text)
- `unialike`(anyelement, text)
- `update_adjustment_summary`()
- `update_distribution_order_status`()
- `update_guest_stats_on_checkout`()
- `update_purchase_order_totals`()
- `update_room_pricing_rules_updated_at`()
- `update_room_status_safe`(p_room_id uuid, p_new_status text, p_expected_updated_at tim)
- `update_staff_status_from_room_check`()
- `update_updated_at_column`()
- `update_vendor_stats`()
- `update_workflow_stats`()
- `user_has_hotel_access`(p_user_id uuid, p_hotel_id uuid)
- `users_are`(name[], text)
- `validate_chargeable_approval_status`()
- `validate_item_category_hotel`()
- `validate_room_check_issue_entries`()
- `validate_room_item_hotel`()
- `vendors_generate_code`()
- `view_owner_is`(name, name, text)
- `views_are`(name, name[], text)
- `volatility_is`(name, text)
- `works_at_same_hotel`(target_user_id uuid)
