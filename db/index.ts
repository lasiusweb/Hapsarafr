
import { appSchema, tableSchema } from '@nozbe/watermelondb';
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children, relation, json, action } from '@nozbe/watermelondb/decorators';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'farmers',
      columns: [
        { name: 'full_name', type: 'string' },
        { name: 'father_husband_name', type: 'string' },
        { name: 'aadhaar_number', type: 'string' },
        { name: 'mobile_number', type: 'string' },
        { name: 'gender', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'district', type: 'string' },
        { name: 'mandal', type: 'string' },
        { name: 'village', type: 'string' },
        { name: 'photo', type: 'string', isOptional: true },
        { name: 'bank_account_number', type: 'string', isOptional: true },
        { name: 'ifsc_code', type: 'string', isOptional: true },
        { name: 'account_verified', type: 'boolean' },
        { name: 'approved_extent', type: 'number', isOptional: true },
        { name: 'applied_extent', type: 'number', isOptional: true },
        { name: 'number_of_plants', type: 'number', isOptional: true },
        { name: 'method_of_plantation', type: 'string', isOptional: true },
        { name: 'plant_type', type: 'string', isOptional: true },
        { name: 'plantation_date', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'registration_date', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'gov_application_id', type: 'string', isOptional: true },
        { name: 'gov_farmer_id', type: 'string', isOptional: true },
        { name: 'ppb_rofr_id', type: 'string', isOptional: true },
        { name: 'is_in_ne_region', type: 'boolean', isOptional: true },
        { name: 'proposed_year', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'created_by', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'primary_crop', type: 'string', isOptional: true },
        { name: 'mlrd_plants', type: 'number', isOptional: true },
        { name: 'full_cost_plants', type: 'number', isOptional: true },
        { name: 'aso_id', type: 'string', isOptional: true },
        { name: 'hap_id', type: 'string', isOptional: true },
        { name: 'trust_score', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
        name: 'farm_plots',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'farmer_id', type: 'string' },
            { name: 'acreage', type: 'number' },
            { name: 'soil_type', type: 'string', isOptional: true },
            { name: 'number_of_plants', type: 'number', isOptional: true },
            { name: 'method_of_plantation', type: 'string', isOptional: true },
            { name: 'plantation_date', type: 'string', isOptional: true },
            { name: 'plant_type', type: 'string', isOptional: true },
            { name: 'geojson', type: 'string', isOptional: true },
            { name: 'is_replanting', type: 'boolean', isOptional: true },
            { name: 'tenant_id', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
        ]
    }),
    tableSchema({ name: 'users', columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'avatar', type: 'string', isOptional: true },
        { name: 'group_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'is_verified', type: 'boolean', isOptional: true },
    ] }),
    tableSchema({ name: 'tenants', columns: [
        { name: 'name', type: 'string' },
        { name: 'credit_balance', type: 'number' },
        { name: 'subscription_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'features_json', type: 'string', isOptional: true },
        { name: 'tier', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'groups', columns: [
        { name: 'name', type: 'string' },
        { name: 'permissions_str', type: 'string' },
        { name: 'tenant_id', type: 'string' },
    ] }),
    tableSchema({ name: 'districts', columns: [
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
    ] }),
    tableSchema({ name: 'mandals', columns: [
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'district_id', type: 'string' },
    ] }),
    tableSchema({ name: 'villages', columns: [
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'mandal_id', type: 'string' },
    ] }),
    tableSchema({ name: 'territories', columns: [
        { name: 'tenant_id', type: 'string' },
        { name: 'administrative_level', type: 'string' },
        { name: 'administrative_code', type: 'string' },
        { name: 'service_type', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'credit_ledger', columns: [
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'vendor_id', type: 'string', isOptional: true },
        { name: 'transaction_type', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'service_event_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
    ] }),
    tableSchema({ name: 'service_consumption_logs', columns: [
        { name: 'tenant_id', type: 'string' },
        { name: 'service_name', type: 'string' },
        { name: 'credit_cost', type: 'number' },
        { name: 'metadata_json', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
    ] }),
    tableSchema({ name: 'orders', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'dealer_id', type: 'string' },
        { name: 'order_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'total_amount', type: 'number' },
        { name: 'payment_method', type: 'string' },
        { name: 'delivery_address', type: 'string' },
        { name: 'delivery_instructions', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'order_items', columns: [
        { name: 'order_id', type: 'string' },
        { name: 'vendor_product_id', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'price_per_unit', type: 'number' },
    ] }),
    tableSchema({ name: 'activity_logs', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'activity_type', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'metadata_json', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'created_by', type: 'string' },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'subsidy_payments', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'payment_date', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'utr_number', type: 'string' },
        { name: 'payment_stage', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'assistance_applications', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'scheme_id', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
    ] }),
    tableSchema({ name: 'crop_assignments', columns: [
        { name: 'farm_plot_id', type: 'string' },
        { name: 'crop_id', type: 'string' },
        { name: 'season', type: 'string' },
        { name: 'year', type: 'number' },
        { name: 'is_primary_crop', type: 'boolean' },
    ] }),
    tableSchema({ name: 'crops', columns: [
        { name: 'name', type: 'string' },
        { name: 'is_perennial', type: 'boolean' },
        { name: 'default_unit', type: 'string' },
        { name: 'verification_status', type: 'string' },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'interactions', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'personnel_id', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'outcome', type: 'string' },
        { name: 'notes', type: 'string' },
        { name: 'date', type: 'string' },
        { name: 'photo_url', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'pending_uploads', columns: [
        { name: 'file_path', type: 'string' },
        { name: 'related_record_id', type: 'string' },
        { name: 'related_table', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'blob_data', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
    ] }),
    tableSchema({ name: 'resources', columns: [
        { name: 'name', type: 'string' },
        { name: 'unit', type: 'string' },
        { name: 'cost', type: 'number', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'resource_distributions', columns: [
        { name: 'resource_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'distribution_date', type: 'string' },
        { name: 'created_by', type: 'string' },
    ] }),
    tableSchema({ name: 'custom_field_definitions', columns: [
        { name: 'model_name', type: 'string' },
        { name: 'field_name', type: 'string' },
        { name: 'field_label', type: 'string' },
        { name: 'field_type', type: 'string' },
        { name: 'options_json', type: 'string', isOptional: true },
        { name: 'is_required', type: 'boolean' },
        { name: 'sort_order', type: 'number' },
    ] }),
    tableSchema({ name: 'tasks', columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'priority', type: 'string' },
        { name: 'due_date', type: 'string', isOptional: true },
        { name: 'assignee_id', type: 'string', isOptional: true },
        { name: 'farmer_id', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'source', type: 'string', isOptional: true },
        { name: 'directive_assignment_id', type: 'string', isOptional: true },
        { name: 'completion_evidence_json', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'harvests', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'harvest_date', type: 'string' },
        { name: 'gross_weight', type: 'number' },
        { name: 'tare_weight', type: 'number' },
        { name: 'net_weight', type: 'number' },
        { name: 'assessed_by_id', type: 'string' },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'quality_assessments', columns: [
        { name: 'harvest_id', type: 'string' },
        { name: 'overall_grade', type: 'string' },
        { name: 'price_adjustment', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'appeal_status', type: 'string' },
        { name: 'assessment_date', type: 'string' },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'quality_metrics', columns: [
        { name: 'assessment_id', type: 'string' },
        { name: 'metric_name', type: 'string' },
        { name: 'metric_value', type: 'string' },
    ] }),
    tableSchema({ name: 'processing_batches', columns: [
        { name: 'harvest_id', type: 'string' },
        { name: 'batch_code', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'processing_steps', columns: [
        { name: 'batch_id', type: 'string' },
        { name: 'step_name', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'operator_id', type: 'string' },
        { name: 'equipment_id', type: 'string', isOptional: true },
        { name: 'parameters', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'equipment', columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'last_maintenance_date', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'manual_ledger_entries', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'date', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'type', type: 'string' },
    ] }),
    tableSchema({ name: 'equipment_leases', columns: [
        { name: 'equipment_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string' },
        { name: 'payment_status', type: 'string' },
    ] }),
    tableSchema({ name: 'planting_records', columns: [
        { name: 'plot_id', type: 'string' },
        { name: 'seed_source', type: 'string' },
        { name: 'planting_date', type: 'string' },
        { name: 'genetic_variety', type: 'string' },
        { name: 'number_of_plants', type: 'number' },
        { name: 'care_instructions_url', type: 'string', isOptional: true },
        { name: 'qr_code_data', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'agronomic_inputs', columns: [
        { name: 'farm_plot_id', type: 'string' },
        { name: 'input_date', type: 'string' },
        { name: 'input_type', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit', type: 'string' },
    ] }),
    tableSchema({ name: 'farmer_dealer_consents', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'is_active', type: 'boolean' },
        { name: 'permissions_json', type: 'string', isOptional: true },
        { name: 'consent_date', type: 'string' },
        { name: 'expiry_date', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'territory_disputes', columns: [
        { name: 'requesting_tenant_id', type: 'string' },
        { name: 'contested_tenant_id', type: 'string' },
        { name: 'administrative_code', type: 'string' },
        { name: 'reason', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'visit_requests', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'reason', type: 'string' },
        { name: 'preferred_date', type: 'string' },
        { name: 'assignee_id', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'scheduled_date', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string' },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'priority_score', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'resolution_notes', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'commodity_listings', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'crop_name', type: 'string' },
        { name: 'quality_grade', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'ask_price', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'farm_plot_id', type: 'string' },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
    ] }),
    tableSchema({ name: 'commodity_offers', columns: [
        { name: 'listing_id', type: 'string' },
        { name: 'buyer_name', type: 'string' },
        { name: 'buyer_contact', type: 'string' },
        { name: 'offer_price', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
    ] }),
    tableSchema({ name: 'dealer_inventory_signals', columns: [
        { name: 'dealer_id', type: 'string' },
        { name: 'product_id', type: 'string' },
        { name: 'stock_quantity', type: 'number' },
        { name: 'is_available', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'reorder_level', type: 'number', isOptional: true },
    ] }),
    tableSchema({ name: 'wallets', columns: [
        { name: 'farmer_id', type: 'string', isOptional: true },
        { name: 'vendor_id', type: 'string', isOptional: true },
        { name: 'balance', type: 'number' },
    ] }),
    tableSchema({ name: 'wallet_transactions', columns: [
        { name: 'wallet_id', type: 'string' },
        { name: 'transaction_type', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'source', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'metadata_json', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
    ] }),
    tableSchema({ name: 'free_tier_usages', columns: [
        { name: 'tenant_id', type: 'string' },
        { name: 'service_name', type: 'string' },
        { name: 'period', type: 'string' },
        { name: 'usage_count', type: 'number' },
    ] }),
    tableSchema({ name: 'vendors', columns: [
        { name: 'name', type: 'string' },
        { name: 'contact_person', type: 'string', isOptional: true },
        { name: 'mobile_number', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'rating', type: 'number' },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'seller_type', type: 'string' },
        { name: 'farmer_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
        { name: 'district', type: 'string', isOptional: true },
        { name: 'mandal', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'products', columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'category_id', type: 'string' },
        { name: 'is_quality_verified', type: 'boolean' },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'vendor_products', columns: [
        { name: 'vendor_id', type: 'string' },
        { name: 'product_id', type: 'string' },
        { name: 'price', type: 'number' },
        { name: 'stock_quantity', type: 'number' },
        { name: 'unit', type: 'string' },
    ] }),
    tableSchema({ name: 'product_categories', columns: [
        { name: 'name', type: 'string' },
        { name: 'icon_svg', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'service_points', columns: [
        { name: 'name', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'service_type', type: 'string' },
        { name: 'capacity_per_slot', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'collection_appointments', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'service_point_id', type: 'string' },
        { name: 'start_time', type: 'string' },
        { name: 'end_time', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'cancellation_reason', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'sustainability_actions', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'action_type', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'verification_photo_url', type: 'string', isOptional: true },
        { name: 'submitted_at', type: 'number' },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'farm_plot_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'sensor_readings', columns: [
        { name: 'device_id', type: 'string' },
        { name: 'farm_plot_id', type: 'string' },
        { name: 'sensor_type', type: 'string' },
        { name: 'value', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'recorded_at', type: 'string' },
        { name: 'source', type: 'string' },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'directives', columns: [
        { name: 'created_by_gov_user_id', type: 'string' },
        { name: 'administrative_code', type: 'string' },
        { name: 'task_type', type: 'string' },
        { name: 'priority', type: 'string' },
        { name: 'details_json', type: 'string' },
        { name: 'is_mandatory', type: 'boolean' },
        { name: 'due_date', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
    ] }),
    tableSchema({ name: 'directive_assignments', columns: [
        { name: 'directive_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'claimed_at', type: 'string', isOptional: true },
        { name: 'completion_details_json', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'protection_claims', columns: [
        { name: 'subscription_id', type: 'string' },
        { name: 'trigger_type', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'payout_amount', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'protection_subscriptions', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'product_id', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string' },
        { name: 'coverage_amount', type: 'number' },
        { name: 'premium_paid', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'protection_products', columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'provider_name', type: 'string' },
        { name: 'premium_basis_points', type: 'number' },
        { name: 'coverage_limit', type: 'number', isOptional: true },
    ] }),
    tableSchema({ name: 'land_listings', columns: [
        { name: 'farm_plot_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'listing_type', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'soil_organic_carbon', type: 'number', isOptional: true },
        { name: 'water_table_depth', type: 'number', isOptional: true },
        { name: 'road_access', type: 'string' },
        { name: 'avg_yield_history', type: 'number', isOptional: true },
        { name: 'hapsara_value_score', type: 'number' },
        { name: 'ask_price', type: 'number' },
        { name: 'duration_months', type: 'number', isOptional: true },
        { name: 'available_from', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
    ] }),
    tableSchema({ name: 'land_valuation_history', columns: [
        { name: 'listing_id', type: 'string' },
        { name: 'score', type: 'number' },
        { name: 'calculated_at', type: 'number' },
        { name: 'factors_json', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'seed_varieties', columns: [
        { name: 'name', type: 'string' },
        { name: 'seed_type', type: 'string' },
        { name: 'days_to_maturity', type: 'number' },
        { name: 'is_seed_saving_allowed', type: 'boolean' },
        { name: 'water_requirement', type: 'string' },
        { name: 'potential_yield', type: 'number' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'consent_level', type: 'string' },
        { name: 'owner_farmer_id', type: 'string', isOptional: true },
        { name: 'passport_hash', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'scientific_name', type: 'string', isOptional: true },
        { name: 'origin_village', type: 'string', isOptional: true },
        { name: 'oral_history_url', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'seed_performance_logs', columns: [
        { name: 'seed_variety_id', type: 'string' },
        { name: 'farm_plot_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'season', type: 'string' },
        { name: 'year', type: 'number' },
        { name: 'yield_per_acre', type: 'number' },
        { name: 'disease_resistance_score', type: 'number' },
        { name: 'drought_survival_score', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'training_modules', columns: [
        { name: 'title', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'duration_minutes', type: 'number' },
        { name: 'module_type', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'difficulty', type: 'string' },
        { name: 'sort_order', type: 'number' },
    ] }),
    tableSchema({ name: 'training_completions', columns: [
        { name: 'user_id', type: 'string' },
        { name: 'module_id', type: 'string' },
    ] }),
    tableSchema({ name: 'events', columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'event_date', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'created_by', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'event_rsvps', columns: [
        { name: 'event_id', type: 'string' },
        { name: 'user_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'tenant_partner_configs', columns: [
        { name: 'tenant_id', type: 'string' },
        { name: 'revenue_share_enabled', type: 'boolean' },
        { name: 'blocked_categories_json', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'partners', columns: [
        { name: 'name', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'trust_score', type: 'number' },
        { name: 'logo_url', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'partner_offerings', columns: [
        { name: 'partner_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'action_label', type: 'string' },
        { name: 'region_codes_json', type: 'string', isOptional: true },
        { name: 'target_soil_types_json', type: 'string', isOptional: true },
        { name: 'target_crops_json', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'partner_interactions', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'partner_id', type: 'string' },
        { name: 'offering_id', type: 'string' },
        { name: 'interaction_type', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'khata_records', columns: [
        { name: 'dealer_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'transaction_type', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'transaction_date', type: 'string' },
        { name: 'due_date', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'loan_applications', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'loan_type', type: 'string' },
        { name: 'amount_requested', type: 'number' },
        { name: 'tenure_months', type: 'number' },
        { name: 'purpose', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'credit_score_snapshot', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'iot_devices', columns: [
        { name: 'serial_number', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'battery_level', type: 'number' },
        { name: 'last_heartbeat', type: 'string' },
        { name: 'farm_plot_id', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'user_profiles', columns: [
        { name: 'user_id', type: 'string' },
        { name: 'is_mentor', type: 'boolean' },
        { name: 'expertise_tags', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'mentorships', columns: [
        { name: 'mentor_id', type: 'string' },
        { name: 'mentee_id', type: 'string' },
        { name: 'status', type: 'string' },
    ] }),
    tableSchema({ name: 'leads', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'vendor_id', type: 'string' },
        { name: 'service_category', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'withdrawal_accounts', columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'account_type', type: 'string' },
        { name: 'details', type: 'string' },
        { name: 'is_verified', type: 'boolean' },
    ] }),
    tableSchema({ name: 'harvest_logs', columns: [
        { name: 'crop_assignment_id', type: 'string' },
        { name: 'harvest_date', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string' },
    ] }),
    tableSchema({ name: 'equipment_maintenance_logs', columns: [
        { name: 'equipment_id', type: 'string' },
        { name: 'maintenance_date', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'cost', type: 'number' },
        { name: 'performed_by_id', type: 'string' },
        { name: 'tenant_id', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
    ] }),
    tableSchema({ name: 'dealers', columns: [
        { name: 'user_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'mandal', type: 'string', isOptional: true },
        { name: 'district', type: 'string', isOptional: true },
    ] }),
  ]
});

export class FarmerModel extends Model {
  static table = 'farmers';
  static associations = {
    farm_plots: { type: 'has_many', foreignKey: 'farmer_id' },
    wallet: { type: 'has_one', foreignKey: 'farmer_id' },
  } as const;

  @text('full_name') fullName!: string;
  @text('father_husband_name') fatherHusbandName!: string;
  @text('aadhaar_number') aadhaarNumber!: string;
  @text('mobile_number') mobileNumber!: string;
  @text('gender') gender!: string;
  @text('address') address!: string;
  @text('district') district!: string;
  @text('mandal') mandal!: string;
  @text('village') village!: string;
  @text('photo') photo!: string;
  @text('bank_account_number') bankAccountNumber!: string;
  @text('ifsc_code') ifscCode!: string;
  @field('account_verified') accountVerified!: boolean;
  @field('approved_extent') approvedExtent!: number;
  @field('applied_extent') appliedExtent!: number;
  @field('number_of_plants') numberOfPlants!: number;
  @text('method_of_plantation') methodOfPlantation!: string;
  @text('plant_type') plantType!: string;
  @text('plantation_date') plantationDate!: string;
  @text('status') status!: string;
  @text('registration_date') registrationDate!: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @text('gov_application_id') gov_application_id!: string;
  @text('gov_farmer_id') gov_farmer_id!: string;
  @text('ppb_rofr_id') ppbRofrId!: string;
  @field('is_in_ne_region') is_in_ne_region!: boolean;
  @text('proposed_year') proposedYear!: string;
  @text('sync_status') syncStatus!: string;
  @text('sync_status_local') syncStatusLocal!: string;
  @date('created_at') createdAt!: number;
  @date('updated_at') updatedAt!: number;
  @text('created_by') createdBy!: string;
  @text('tenant_id') tenantId!: string;
  @text('primary_crop') primary_crop!: string;
  @field('mlrd_plants') mlrdPlants!: number;
  @field('full_cost_plants') fullCostPlants!: number;
  @text('aso_id') asoId!: string;
  @text('hap_id') hapId!: string;
  // Alias for hapId to match interface
  get hap_id() { return this.hapId; }
  @field('trust_score') trustScore!: number;
  
  @children('farm_plots') farmPlots!: any;
}

export class FarmPlotModel extends Model {
  static table = 'farm_plots';
  static associations = {
      farmers: { type: 'belongs_to', key: 'farmer_id' },
  } as const;
  @text('name') name!: string;
  @text('farmer_id') farmerId!: string;
  @field('acreage') acreage!: number;
  @text('soil_type') soilType!: string;
  get soil_type() { return this.soilType; }
  @field('number_of_plants') numberOfPlants!: number;
  get number_of_plants() { return this.numberOfPlants; }
  @text('method_of_plantation') methodOfPlantation!: string;
  get method_of_plantation() { return this.methodOfPlantation; }
  @text('plantation_date') plantationDate!: string;
  get plantation_date() { return this.plantationDate; }
  @text('plant_type') plantType!: string;
  get plant_type() { return this.plantType; }
  @text('geojson') geojson!: string;
  @field('is_replanting') isReplanting!: boolean;
  @text('tenant_id') tenantId!: string;
  @date('created_at') createdAt!: number;
  @date('updated_at') updatedAt!: number;
  @relation('farmers', 'farmer_id') farmer!: any;
}

export class UserModel extends Model {
  static table = 'users';
  @text('name') name!: string;
  @text('email') email!: string;
  @text('avatar') avatar!: string;
  @text('group_id') groupId!: string;
  @text('tenant_id') tenantId!: string;
  @field('is_verified') is_verified!: boolean;
}

export class TenantModel extends Model {
  static table = 'tenants';
  @text('name') name!: string;
  @field('credit_balance') creditBalance!: number;
  // Alias for interface compatibility
  get credit_balance() { return this.creditBalance; }
  @text('subscription_status') subscriptionStatus!: string;
  @date('created_at') createdAt!: number;
  @text('features_json') featuresJson!: string;
  get features(): string[] {
      try {
          return JSON.parse(this.featuresJson || '[]');
      } catch {
          return [];
      }
  }
  @text('tier') tier!: string;
}

export class GroupModel extends Model {
  static table = 'groups';
  @text('name') name!: string;
  @text('permissions_str') permissionsStr!: string;
  @text('tenant_id') tenantId!: string;
  get permissions(): string[] {
      try {
          return JSON.parse(this.permissionsStr || '[]');
      } catch {
          return [];
      }
  }
}

export class DistrictModel extends Model {
    static table = 'districts';
    @text('code') code!: string;
    @text('name') name!: string;
}

export class MandalModel extends Model {
    static table = 'mandals';
    @text('code') code!: string;
    @text('name') name!: string;
    @text('district_id') districtId!: string;
    @relation('districts', 'district_id') district!: any;
}

export class VillageModel extends Model {
    static table = 'villages';
    @text('code') code!: string;
    @text('name') name!: string;
    @text('mandal_id') mandalId!: string;
    @relation('mandals', 'mandal_id') mandal!: any;
}

export class TerritoryModel extends Model {
    static table = 'territories';
    @text('tenant_id') tenantId!: string;
    @text('administrative_level') administrativeLevel!: string;
    @text('administrative_code') administrativeCode!: string;
    @text('service_type') serviceType!: string;
}

export class CreditLedgerEntryModel extends Model {
    static table = 'credit_ledger';
    @text('tenant_id') tenantId!: string;
    @text('vendor_id') vendorId!: string;
    @text('transaction_type') transactionType!: string;
    @field('amount') amount!: number;
    @text('service_event_id') serviceEventId!: string;
    @date('created_at') createdAt!: number;
}

export class ServiceConsumptionLogModel extends Model {
    static table = 'service_consumption_logs';
    @text('tenant_id') tenantId!: string;
    @text('service_name') serviceName!: string;
    @field('credit_cost') creditCost!: number;
    @text('metadata_json') metadataJson!: string;
    @date('created_at') createdAt!: number;
}

export class OrderModel extends Model {
    static table = 'orders';
    @text('farmer_id') farmerId!: string;
    @text('dealer_id') dealerId!: string;
    @text('order_date') orderDate!: string;
    @text('status') status!: string;
    @field('total_amount') totalAmount!: number;
    @text('payment_method') paymentMethod!: string;
    @text('delivery_address') deliveryAddress!: string;
    @text('delivery_instructions') deliveryInstructions!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class OrderItemModel extends Model {
    static table = 'order_items';
    @text('order_id') orderId!: string;
    @text('vendor_product_id') vendorProductId!: string;
    @field('quantity') quantity!: number;
    @field('price_per_unit') pricePerUnit!: number;
}

export class ActivityLogModel extends Model {
    static table = 'activity_logs';
    @text('farmer_id') farmerId!: string;
    @text('activity_type') activityType!: string;
    @text('description') description!: string;
    @text('metadata_json') metadataJson!: string;
    @date('created_at') createdAt!: number;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
}

export class SubsidyPaymentModel extends Model {
    static table = 'subsidy_payments';
    @text('farmer_id') farmerId!: string;
    @text('payment_date') paymentDate!: string;
    @field('amount') amount!: number;
    @text('utr_number') utrNumber!: string;
    @text('payment_stage') paymentStage!: string;
    @text('notes') notes!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
    @text('created_by') createdBy!: string;
}

export class AssistanceApplicationModel extends Model {
    static table = 'assistance_applications';
    @text('farmer_id') farmerId!: string;
    @text('scheme_id') schemeId!: string;
    @text('status') status!: string;
}

export class CropAssignmentModel extends Model {
    static table = 'crop_assignments';
    static associations = {
        farm_plots: { type: 'belongs_to', key: 'farm_plot_id' },
    } as const;
    @text('farm_plot_id') farmPlotId!: string;
    @text('crop_id') cropId!: string;
    @text('season') season!: string;
    @field('year') year!: number;
    @field('is_primary_crop') isPrimaryCrop!: boolean;
    @relation('farm_plots', 'farm_plot_id') farmPlot!: any;
}

export class CropModel extends Model {
    static table = 'crops';
    @text('name') name!: string;
    @field('is_perennial') isPerennial!: boolean;
    @text('default_unit') defaultUnit!: string;
    @text('verification_status') verificationStatus!: string;
    @text('tenant_id') tenantId!: string;
}

export class InteractionModel extends Model {
    static table = 'interactions';
    @text('farmer_id') farmerId!: string;
    @text('personnel_id') personnelId!: string;
    @text('type') type!: string;
    @text('outcome') outcome!: string;
    @text('notes') notes!: string;
    @text('date') date!: string;
    @text('photo_url') photoUrl!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class PendingUploadModel extends Model {
    static table = 'pending_uploads';
    @text('file_path') filePath!: string;
    @text('related_record_id') relatedRecordId!: string;
    @text('related_table') relatedTable!: string;
    @text('status') status!: string;
    @text('blob_data') blobData!: string;
    @date('created_at') createdAt!: number;
}

export class ResourceModel extends Model {
    static table = 'resources';
    @text('name') name!: string;
    @text('unit') unit!: string;
    @field('cost') cost!: number;
    @text('description') description!: string;
    @text('tenant_id') tenantId!: string;
}

export class ResourceDistributionModel extends Model {
    static table = 'resource_distributions';
    @text('resource_id') resourceId!: string;
    @text('farmer_id') farmerId!: string;
    @field('quantity') quantity!: number;
    @text('distribution_date') distributionDate!: string;
    @text('created_by') createdBy!: string;
}

export class CustomFieldDefinitionModel extends Model {
    static table = 'custom_field_definitions';
    @text('model_name') modelName!: string;
    @text('field_name') fieldName!: string;
    @text('field_label') fieldLabel!: string;
    @text('field_type') fieldType!: string;
    @text('options_json') optionsJson!: string;
    @field('is_required') isRequired!: boolean;
    @field('sort_order') sortOrder!: number;
    get options(): string[] {
        try { return JSON.parse(this.optionsJson); } catch { return []; }
    }
}

export class TaskModel extends Model {
    static table = 'tasks';
    @text('title') title!: string;
    @text('description') description!: string;
    @text('status') status!: string;
    @text('priority') priority!: string;
    @text('due_date') dueDate!: string;
    @text('assignee_id') assigneeId!: string;
    @text('farmer_id') farmerId!: string;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
    @text('source') source!: string;
    @text('directive_assignment_id') directiveAssignmentId!: string;
    @text('completion_evidence_json') completionEvidenceJson!: string;
    @date('created_at') createdAt!: number;
    @date('updated_at') updatedAt!: number;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class HarvestModel extends Model {
    static table = 'harvests';
    @text('farmer_id') farmerId!: string;
    @text('harvest_date') harvestDate!: string;
    @field('gross_weight') grossWeight!: number;
    @field('tare_weight') tareWeight!: number;
    @field('net_weight') netWeight!: number;
    @text('assessed_by_id') assessedById!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class QualityAssessmentModel extends Model {
    static table = 'quality_assessments';
    static associations = {
        harvests: { type: 'belongs_to', key: 'harvest_id' }
    } as const;
    @text('harvest_id') harvestId!: string;
    @text('overall_grade') overallGrade!: string;
    @field('price_adjustment') priceAdjustment!: number;
    @text('notes') notes!: string;
    @text('appeal_status') appealStatus!: string;
    @text('assessment_date') assessmentDate!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
    @relation('harvests', 'harvest_id') harvest!: any;
}

export class QualityMetricModel extends Model {
    static table = 'quality_metrics';
    @text('assessment_id') assessmentId!: string;
    @text('metric_name') metricName!: string;
    @text('metric_value') metricValue!: string;
}

export class ProcessingBatchModel extends Model {
    static table = 'processing_batches';
    @text('harvest_id') harvestId!: string;
    @text('batch_code') batchCode!: string;
    @text('start_date') startDate!: string;
    @text('status') status!: string;
    @text('notes') notes!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class ProcessingStepModel extends Model {
    static table = 'processing_steps';
    @text('batch_id') batchId!: string;
    @text('step_name') stepName!: string;
    @text('start_date') startDate!: string;
    @text('operator_id') operatorId!: string;
    @text('equipment_id') equipmentId!: string;
    @text('parameters') parameters!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class EquipmentModel extends Model {
    static table = 'equipment';
    @text('name') name!: string;
    @text('type') type!: string;
    @text('location') location!: string;
    @text('status') status!: string;
    @text('last_maintenance_date') lastMaintenanceDate!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class ManualLedgerEntryModel extends Model {
    static table = 'manual_ledger_entries';
    @text('farmer_id') farmerId!: string;
    @field('amount') amount!: number;
    @text('date') date!: string;
    @text('description') description!: string;
    @text('type') type!: string;
}

export class EquipmentLeaseModel extends Model {
    static table = 'equipment_leases';
    @text('equipment_id') equipmentId!: string;
    @text('farmer_id') farmerId!: string;
    @text('start_date') startDate!: string;
    @text('end_date') endDate!: string;
    @text('payment_status') paymentStatus!: string;
}

export class PlantingRecordModel extends Model {
    static table = 'planting_records';
    @text('plot_id') plotId!: string;
    @text('seed_source') seedSource!: string;
    @text('planting_date') plantingDate!: string;
    @text('genetic_variety') geneticVariety!: string;
    @field('number_of_plants') numberOfPlants!: number;
    @text('care_instructions_url') careInstructionsUrl!: string;
    @text('qr_code_data') qrCodeData!: string;
}

export class AgronomicInputModel extends Model {
    static table = 'agronomic_inputs';
    @text('farm_plot_id') farmPlotId!: string;
    get farm_plot_id() { return this.farmPlotId; }
    @text('input_date') inputDate!: string;
    get input_date() { return this.inputDate; }
    @text('input_type') inputType!: string;
    get input_type() { return this.inputType; }
    @text('name') name!: string;
    @field('quantity') quantity!: number;
    @text('unit') unit!: string;
}

export class FarmerDealerConsentModel extends Model {
    static table = 'farmer_dealer_consents';
    @text('farmer_id') farmerId!: string;
    @text('tenant_id') tenantId!: string;
    @field('is_active') isActive!: boolean;
    @text('permissions_json') permissionsJson!: string;
    @text('consent_date') consentDate!: string;
    @text('expiry_date') expiryDate!: string;
}

export class TerritoryDisputeModel extends Model {
    static table = 'territory_disputes';
    @text('requesting_tenant_id') requestingTenantId!: string;
    @text('contested_tenant_id') contestedTenantId!: string;
    @text('administrative_code') administrativeCode!: string;
    @text('reason') reason!: string;
    @text('status') status!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class VisitRequestModel extends Model {
    static table = 'visit_requests';
    @text('farmer_id') farmerId!: string;
    @text('reason') reason!: string;
    @text('preferred_date') preferredDate!: string;
    @text('assignee_id') assigneeId!: string;
    @text('notes') notes!: string;
    @text('status') status!: string;
    @text('scheduled_date') scheduledDate!: string;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
    @field('priority_score') priorityScore!: number;
    @date('created_at') createdAt!: number;
    @text('resolution_notes') resolutionNotes!: string;
}

export class CommodityListingModel extends Model {
    static table = 'commodity_listings';
    @text('farmer_id') farmerId!: string;
    @text('crop_name') cropName!: string;
    @text('quality_grade') qualityGrade!: string;
    @field('quantity') quantity!: number;
    @text('unit') unit!: string;
    @field('ask_price') askPrice!: number;
    @text('status') status!: string;
    @text('farm_plot_id') farmPlotId!: string;
    @text('tenant_id') tenantId!: string;
    @date('created_at') createdAt!: number;
}

export class CommodityOfferModel extends Model {
    static table = 'commodity_offers';
    @text('listing_id') listingId!: string;
    @text('buyer_name') buyerName!: string;
    @text('buyer_contact') buyerContact!: string;
    @field('offer_price') offerPrice!: number;
    @text('status') status!: string;
    @date('created_at') createdAt!: number;
}

export class DealerInventorySignalModel extends Model {
    static table = 'dealer_inventory_signals';
    @text('dealer_id') dealerId!: string;
    @text('product_id') productId!: string;
    @field('stock_quantity') stockQuantity!: number;
    @field('is_available') isAvailable!: boolean;
    @text('updated_at') updatedAt!: string;
    @field('reorder_level') reorderLevel!: number;
}

export class WalletModel extends Model {
    static table = 'wallets';
    @text('farmer_id') farmerId!: string;
    @text('vendor_id') vendorId!: string;
    @field('balance') balance!: number;
}

export class WalletTransactionModel extends Model {
    static table = 'wallet_transactions';
    @text('wallet_id') walletId!: string;
    @text('transaction_type') transactionType!: string;
    @field('amount') amount!: number;
    @text('source') source!: string;
    @text('description') description!: string;
    @text('status') status!: string;
    @text('metadata_json') metadataJson!: string;
    @date('created_at') createdAt!: number;
}

export class FreeTierUsageModel extends Model {
    static table = 'free_tier_usages';
    @text('tenant_id') tenantId!: string;
    @text('service_name') serviceName!: string;
    @text('period') period!: string;
    @field('usage_count') usageCount!: number;
}

export class VendorModel extends Model {
    static table = 'vendors';
    @text('name') name!: string;
    @text('contact_person') contactPerson!: string;
    @text('mobile_number') mobileNumber!: string;
    @text('address') address!: string;
    @text('status') status!: string;
    @field('rating') rating!: number;
    @text('tenant_id') tenantId!: string;
    @text('seller_type') sellerType!: string;
    @text('farmer_id') farmerId!: string;
    @text('user_id') userId!: string;
    @text('district') district!: string;
    @text('mandal') mandal!: string;
}

export class ProductModel extends Model {
    static table = 'products';
    @text('name') name!: string;
    @text('description') description!: string;
    @text('image_url') imageUrl!: string;
    @text('category_id') categoryId!: string;
    @field('is_quality_verified') isQualityVerified!: boolean;
    @text('tenant_id') tenantId!: string;
}

export class VendorProductModel extends Model {
    static table = 'vendor_products';
    @text('vendor_id') vendorId!: string;
    @text('product_id') productId!: string;
    @field('price') price!: number;
    @field('stock_quantity') stockQuantity!: number;
    @text('unit') unit!: string;
}

export class ProductCategoryModel extends Model {
    static table = 'product_categories';
    @text('name') name!: string;
    @text('icon_svg') iconSvg!: string;
    @text('tenant_id') tenantId!: string;
}

export class ServicePointModel extends Model {
    static table = 'service_points';
    @text('name') name!: string;
    @text('location') location!: string;
    @text('service_type') serviceType!: string;
    @field('capacity_per_slot') capacityPerSlot!: number;
    @field('is_active') isActive!: boolean;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class CollectionAppointmentModel extends Model {
    static table = 'collection_appointments';
    @text('farmer_id') farmerId!: string;
    @text('service_point_id') servicePointId!: string;
    @text('start_time') startTime!: string;
    @text('end_time') endTime!: string;
    @text('status') status!: string;
    @text('sync_status_local') syncStatusLocal!: string;
    @text('cancellation_reason') cancellationReason!: string;
}

export class SustainabilityActionModel extends Model {
    static table = 'sustainability_actions';
    @text('farmer_id') farmerId!: string;
    @text('action_type') actionType!: string;
    @text('description') description!: string;
    @text('status') status!: string;
    @text('verification_photo_url') verificationPhotoUrl!: string;
    @date('submitted_at') submittedAt!: number;
    @text('tenant_id') tenantId!: string;
    @text('farm_plot_id') farmPlotId!: string;
}

export class SensorReadingModel extends Model {
    static table = 'sensor_readings';
    @text('device_id') deviceId!: string;
    @text('farm_plot_id') farmPlotId!: string;
    @text('sensor_type') sensorType!: string;
    @field('value') value!: number;
    @text('unit') unit!: string;
    @text('recorded_at') recordedAt!: string;
    @text('source') source!: string;
    @text('tenant_id') tenantId!: string;
}

export class DirectiveModel extends Model {
    static table = 'directives';
    @text('created_by_gov_user_id') createdByGovUserId!: string;
    @text('administrative_code') administrativeCode!: string;
    @text('task_type') taskType!: string;
    @text('priority') priority!: string;
    @text('details_json') detailsJson!: string;
    @field('is_mandatory') isMandatory!: boolean;
    @text('due_date') dueDate!: string;
    @text('status') status!: string;
    @text('sync_status_local') syncStatusLocal!: string;
    @date('created_at') createdAt!: number;
}

export class DirectiveAssignmentModel extends Model {
    static table = 'directive_assignments';
    static associations = {
        directives: { type: 'belongs_to', key: 'directive_id' }
    } as const;
    @text('directive_id') directiveId!: string;
    @text('tenant_id') tenantId!: string;
    @text('status') status!: string;
    @text('sync_status_local') syncStatusLocal!: string;
    @text('claimed_at') claimedAt!: string;
    @text('completion_details_json') completionDetailsJson!: string;
    @relation('directives', 'directive_id') directive!: any;
}

export class ProtectionClaimModel extends Model {
    static table = 'protection_claims';
    @text('subscription_id') subscriptionId!: string;
    @text('trigger_type') triggerType!: string;
    @text('status') status!: string;
    @field('payout_amount') payoutAmount!: number;
    @date('created_at') createdAt!: number;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class ProtectionSubscriptionModel extends Model {
    static table = 'protection_subscriptions';
    @text('farmer_id') farmerId!: string;
    @text('product_id') productId!: string;
    @text('start_date') startDate!: string;
    @text('end_date') endDate!: string;
    @field('coverage_amount') coverageAmount!: number;
    @field('premium_paid') premiumPaid!: number;
    @text('status') status!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class ProtectionProductModel extends Model {
    static table = 'protection_products';
    @text('name') name!: string;
    @text('type') type!: string;
    @text('provider_name') providerName!: string;
    @field('premium_basis_points') premiumBasisPoints!: number;
    @field('coverage_limit') coverageLimit!: number;
}

export class LandListingModel extends Model {
    static table = 'land_listings';
    @text('farm_plot_id') farmPlotId!: string;
    @text('farmer_id') farmerId!: string;
    @text('listing_type') listingType!: string;
    @text('status') status!: string;
    @field('soil_organic_carbon') soilOrganicCarbon!: number;
    @field('water_table_depth') waterTableDepth!: number;
    @text('road_access') roadAccess!: string;
    @field('avg_yield_history') avgYieldHistory!: number;
    @field('hapsara_value_score') hapsaraValueScore!: number;
    @field('ask_price') askPrice!: number;
    @field('duration_months') durationMonths!: number;
    @text('available_from') availableFrom!: string;
    @text('description') description!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
    @date('created_at') createdAt!: number;
}

export class LandValuationHistoryModel extends Model {
    static table = 'land_valuation_history';
    @text('listing_id') listingId!: string;
    @field('score') score!: number;
    @date('calculated_at') calculatedAt!: number;
    @text('factors_json') factorsJson!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class SeedVarietyModel extends Model {
    static table = 'seed_varieties';
    @text('name') name!: string;
    @text('seed_type') seedType!: string;
    @field('days_to_maturity') daysToMaturity!: number;
    @field('is_seed_saving_allowed') isSeedSavingAllowed!: boolean;
    @text('water_requirement') waterRequirement!: string;
    @field('potential_yield') potentialYield!: number;
    @text('description') description!: string;
    @text('image_url') imageUrl!: string;
    @text('consent_level') consentLevel!: string;
    @text('owner_farmer_id') ownerFarmerId!: string;
    @text('passport_hash') passportHash!: string;
    @text('tenant_id') tenantId!: string;
    @text('scientific_name') scientificName!: string;
    @text('origin_village') originVillage!: string;
    @text('oral_history_url') oralHistoryUrl!: string;
}

export class SeedPerformanceLogModel extends Model {
    static table = 'seed_performance_logs';
    @text('seed_variety_id') seedVarietyId!: string;
    @text('farm_plot_id') farmPlotId!: string;
    @text('farmer_id') farmerId!: string;
    @text('season') season!: string;
    @field('year') year!: number;
    @field('yield_per_acre') yieldPerAcre!: number;
    @field('disease_resistance_score') diseaseResistanceScore!: number;
    @field('drought_survival_score') droughtSurvivalScore!: number;
    @text('notes') notes!: string;
    @text('tenant_id') tenantId!: string;
}

export class TrainingModuleModel extends Model {
    static table = 'training_modules';
    @text('title') title!: string;
    @text('category') category!: string;
    @text('description') description!: string;
    @field('duration_minutes') durationMinutes!: number;
    @text('module_type') moduleType!: string;
    @text('content') content!: string;
    @text('difficulty') difficulty!: string;
    @field('sort_order') sortOrder!: number;
}

export class TrainingCompletionModel extends Model {
    static table = 'training_completions';
    @text('user_id') userId!: string;
    @text('module_id') moduleId!: string;
}

export class EventModel extends Model {
    static table = 'events';
    @text('title') title!: string;
    @text('description') description!: string;
    @text('event_date') eventDate!: string;
    @text('location') location!: string;
    @text('created_by') createdBy!: string;
    @text('sync_status_local') syncStatusLocal!: string;
    @text('tenant_id') tenantId!: string;
}

export class EventRsvpModel extends Model {
    static table = 'event_rsvps';
    @text('event_id') eventId!: string;
    @text('user_id') userId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class TenantPartnerConfigModel extends Model {
    static table = 'tenant_partner_configs';
    @text('tenant_id') tenantId!: string;
    @field('revenue_share_enabled') revenueShareEnabled!: boolean;
    @text('blocked_categories_json') blockedCategoriesJson!: string;
    @text('sync_status') syncStatus!: string;
}

export class PartnerModel extends Model {
    static table = 'partners';
    @text('name') name!: string;
    @text('status') status!: string;
    @field('trust_score') trustScore!: number;
    @text('logo_url') logoUrl!: string;
}

export class PartnerOfferingModel extends Model {
    static table = 'partner_offerings';
    @text('partner_id') partnerId!: string;
    @text('title') title!: string;
    @text('description') description!: string;
    @text('action_label') actionLabel!: string;
    @text('region_codes_json') regionCodesJson!: string;
    @text('target_soil_types_json') targetSoilTypesJson!: string;
    @text('target_crops_json') targetCropsJson!: string;
}

export class PartnerInteractionModel extends Model {
    static table = 'partner_interactions';
    @text('farmer_id') farmerId!: string;
    @text('partner_id') partnerId!: string;
    @text('offering_id') offeringId!: string;
    @text('interaction_type') interactionType!: string;
    @date('timestamp') timestamp!: number;
    @text('tenant_id') tenantId!: string;
}

export class KhataRecordModel extends Model {
    static table = 'khata_records';
    @text('dealer_id') dealerId!: string;
    @text('farmer_id') farmerId!: string;
    @field('amount') amount!: number;
    @text('transaction_type') transactionType!: string;
    @text('description') description!: string;
    @text('transaction_date') transactionDate!: string;
    @text('due_date') dueDate!: string;
    @text('status') status!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class LoanApplicationModel extends Model {
    static table = 'loan_applications';
    @text('farmer_id') farmerId!: string;
    @text('loan_type') loanType!: string;
    @field('amount_requested') amountRequested!: number;
    @field('tenure_months') tenureMonths!: number;
    @text('purpose') purpose!: string;
    @text('status') status!: string;
    @field('credit_score_snapshot') creditScoreSnapshot!: number;
    @text('created_at') createdAt!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class IoTDeviceModel extends Model {
    static table = 'iot_devices';
    @text('serial_number') serialNumber!: string;
    @text('type') type!: string;
    @text('status') status!: string;
    @field('battery_level') batteryLevel!: number;
    @text('last_heartbeat') lastHeartbeat!: string;
    @text('farm_plot_id') farmPlotId!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class UserProfileModel extends Model {
    static table = 'user_profiles';
    @text('user_id') userId!: string;
    @field('is_mentor') isMentor!: boolean;
    @text('expertise_tags') expertiseTags!: string;
}

export class MentorshipModel extends Model {
    static table = 'mentorships';
    @text('mentor_id') mentorId!: string;
    @text('mentee_id') menteeId!: string;
    @text('status') status!: string;
}

export class LeadModel extends Model {
    static table = 'leads';
    @text('farmer_id') farmerId!: string;
    @text('vendor_id') vendorId!: string;
    @text('service_category') serviceCategory!: string;
    @text('status') status!: string;
    @text('notes') notes!: string;
    @text('tenant_id') tenantId!: string;
}

export class WithdrawalAccountModel extends Model {
    static table = 'withdrawal_accounts';
    @text('farmer_id') farmerId!: string;
    @text('account_type') accountType!: string;
    @text('details') details!: string;
    @field('is_verified') isVerified!: boolean;
}

export class HarvestLogModel extends Model {
    static table = 'harvest_logs';
    @text('crop_assignment_id') cropAssignmentId!: string;
    @text('harvest_date') harvestDate!: string;
    @field('quantity') quantity!: number;
    @text('unit') unit!: string;
    @text('notes') notes!: string;
    @text('created_by') createdBy!: string;
}

export class EquipmentMaintenanceLogModel extends Model {
    static table = 'equipment_maintenance_logs';
    @text('equipment_id') equipmentId!: string;
    @text('maintenance_date') maintenanceDate!: string;
    @text('description') description!: string;
    @field('cost') cost!: number;
    @text('performed_by_id') performedById!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class DealerModel extends Model {
    static table = 'dealers';
    @text('user_id') userId!: string;
    @text('name') name!: string;
    @text('mandal') mandal!: string;
    @text('district') district!: string;
}

const database = new Database({
  adapter: new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    onQuotaExceededError: (error: any) => {
      console.error('Quota exceeded', error);
    },
  }),
  modelClasses: [
    FarmerModel,
    FarmPlotModel,
    UserModel,
    TenantModel,
    GroupModel,
    DistrictModel,
    MandalModel,
    VillageModel,
    TerritoryModel,
    CreditLedgerEntryModel,
    ServiceConsumptionLogModel,
    OrderModel,
    OrderItemModel,
    ActivityLogModel,
    SubsidyPaymentModel,
    AssistanceApplicationModel,
    CropAssignmentModel,
    CropModel,
    InteractionModel,
    PendingUploadModel,
    ResourceModel,
    ResourceDistributionModel,
    CustomFieldDefinitionModel,
    TaskModel,
    HarvestModel,
    QualityAssessmentModel,
    QualityMetricModel,
    ProcessingBatchModel,
    ProcessingStepModel,
    EquipmentModel,
    ManualLedgerEntryModel,
    EquipmentLeaseModel,
    PlantingRecordModel,
    AgronomicInputModel,
    FarmerDealerConsentModel,
    TerritoryDisputeModel,
    VisitRequestModel,
    CommodityListingModel,
    CommodityOfferModel,
    DealerInventorySignalModel,
    WalletModel,
    WalletTransactionModel,
    FreeTierUsageModel,
    VendorModel,
    ProductModel,
    VendorProductModel,
    ProductCategoryModel,
    ServicePointModel,
    CollectionAppointmentModel,
    SustainabilityActionModel,
    SensorReadingModel,
    DirectiveModel,
    DirectiveAssignmentModel,
    ProtectionClaimModel,
    ProtectionSubscriptionModel,
    ProtectionProductModel,
    LandListingModel,
    LandValuationHistoryModel,
    SeedVarietyModel,
    SeedPerformanceLogModel,
    TrainingModuleModel,
    TrainingCompletionModel,
    EventModel,
    EventRsvpModel,
    TenantPartnerConfigModel,
    PartnerModel,
    PartnerOfferingModel,
    PartnerInteractionModel,
    KhataRecordModel,
    LoanApplicationModel,
    IoTDeviceModel,
    UserProfileModel,
    MentorshipModel,
    LeadModel,
    WithdrawalAccountModel,
    HarvestLogModel,
    EquipmentMaintenanceLogModel,
    DealerModel
  ],
});

export default database;
