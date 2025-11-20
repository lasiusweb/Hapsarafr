
import { Database } from '@nozbe/watermelondb';
import { field, text, date, json, relation, children, writer, readonly, nochange } from '@nozbe/watermelondb/decorators';
import Model from '@nozbe/watermelondb/Model';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { appSchema, tableSchema } from '@nozbe/watermelondb/Schema';

// --- Schema Definition ---

const schema = appSchema({
  version: 7, // Incremented version for Billing updates
  tables: [
    tableSchema({
      name: 'tenants',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'credit_balance', type: 'number' },
        { name: 'subscription_status', type: 'string' },
        { name: 'max_farmers', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'users',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'group_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'avatar', type: 'string', isOptional: true },
        { name: 'is_verified', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'groups',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'permissions_str', type: 'string' },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'districts',
      columns: [
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'mandals',
      columns: [
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'district_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'villages',
      columns: [
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'mandal_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'farmers',
      columns: [
        { name: 'hap_id', type: 'string', isOptional: true },
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
        { name: 'bank_account_number', type: 'string' },
        { name: 'ifsc_code', type: 'string' },
        { name: 'account_verified', type: 'boolean' },
        { name: 'approved_extent', type: 'number', isOptional: true },
        { name: 'applied_extent', type: 'number', isOptional: true },
        { name: 'number_of_plants', type: 'number', isOptional: true },
        { name: 'method_of_plantation', type: 'string', isOptional: true },
        { name: 'plant_type', type: 'string', isOptional: true },
        { name: 'plantation_date', type: 'string' },
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
        { name: 'created_at', type: 'string' },
        { name: 'updated_at', type: 'string' },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
        { name: 'primary_crop', type: 'string', isOptional: true },
        { name: 'mlrd_plants', type: 'number', isOptional: true },
        { name: 'full_cost_plants', type: 'number', isOptional: true },
        { name: 'aso_id', type: 'string', isOptional: true },
        { name: 'trust_score', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'farm_plots',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'acreage', type: 'number' },
        { name: 'number_of_plants', type: 'number', isOptional: true },
        { name: 'plantation_date', type: 'string', isOptional: true },
        { name: 'soil_type', type: 'string', isOptional: true },
        { name: 'method_of_plantation', type: 'string', isOptional: true },
        { name: 'plant_type', type: 'string', isOptional: true },
        { name: 'geojson', type: 'string', isOptional: true },
        { name: 'is_replanting', type: 'boolean', isOptional: true },
        { name: 'tenant_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'subsidy_payments',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'payment_date', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'utr_number', type: 'string' },
        { name: 'payment_stage', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
        { name: 'created_by', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'activity_logs',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'activity_type', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'created_by', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'resources',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'unit', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'cost', type: 'number', isOptional: true },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'resource_distributions',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'resource_id', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'distribution_date', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string' },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'priority', type: 'string' },
        { name: 'due_date', type: 'string', isOptional: true },
        { name: 'assignee_id', type: 'string', isOptional: true },
        { name: 'farmer_id', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'source', type: 'string', isOptional: true },
        { name: 'directive_assignment_id', type: 'string', isOptional: true },
        { name: 'completion_evidence_json', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'custom_field_definitions',
      columns: [
        { name: 'model_name', type: 'string' },
        { name: 'field_name', type: 'string' },
        { name: 'field_label', type: 'string' },
        { name: 'field_type', type: 'string' },
        { name: 'options_json', type: 'string', isOptional: true },
        { name: 'is_required', type: 'boolean' },
        { name: 'sort_order', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'harvests',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'harvest_date', type: 'string' },
        { name: 'gross_weight', type: 'number' },
        { name: 'tare_weight', type: 'number' },
        { name: 'net_weight', type: 'number' },
        { name: 'assessed_by_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'quality_assessments',
      columns: [
        { name: 'harvest_id', type: 'string' },
        { name: 'overall_grade', type: 'string' },
        { name: 'price_adjustment', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'appeal_status', type: 'string' },
        { name: 'assessment_date', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'quality_metrics',
      columns: [
        { name: 'assessment_id', type: 'string' },
        { name: 'metric_name', type: 'string' },
        { name: 'metric_value', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'processing_batches',
      columns: [
        { name: 'batch_code', type: 'string' },
        { name: 'harvest_id', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'processing_steps',
      columns: [
        { name: 'batch_id', type: 'string' },
        { name: 'step_name', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string', isOptional: true },
        { name: 'operator_id', type: 'string' },
        { name: 'equipment_id', type: 'string', isOptional: true },
        { name: 'parameters_json', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'equipment',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'last_maintenance_date', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'equipment_maintenance_logs',
      columns: [
        { name: 'equipment_id', type: 'string' },
        { name: 'maintenance_date', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'cost', type: 'number' },
        { name: 'performed_by_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'equipment_leases',
      columns: [
        { name: 'equipment_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string' },
        { name: 'payment_status', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'manual_ledger_entries',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'date', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'description', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'planting_records',
      columns: [
        { name: 'plot_id', type: 'string' },
        { name: 'seed_source', type: 'string' },
        { name: 'planting_date', type: 'string' },
        { name: 'genetic_variety', type: 'string' },
        { name: 'number_of_plants', type: 'number' },
        { name: 'care_instructions_url', type: 'string', isOptional: true },
        { name: 'qr_code_data', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'agronomic_inputs',
      columns: [
        { name: 'farm_plot_id', type: 'string' },
        { name: 'input_date', type: 'string' },
        { name: 'input_type', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'npk_values_json', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string' },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'wallets',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'balance', type: 'number' },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'wallet_transactions',
      columns: [
        { name: 'wallet_id', type: 'string' },
        { name: 'transaction_type', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'source', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'metadata_json', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'withdrawal_accounts',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'account_type', type: 'string' },
        { name: 'details', type: 'string' },
        { name: 'is_verified', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'credit_ledger',
      columns: [
        { name: 'tenant_id', type: 'string' },
        { name: 'transaction_type', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'service_event_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'service_consumption_logs',
      columns: [
        { name: 'tenant_id', type: 'string' },
        { name: 'service_name', type: 'string' },
        { name: 'credit_cost', type: 'number' },
        { name: 'metadata_json', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'free_tier_usages',
      columns: [
        { name: 'tenant_id', type: 'string' },
        { name: 'service_name', type: 'string' },
        { name: 'period', type: 'string' },
        { name: 'usage_count', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'order_date', type: 'string' },
        { name: 'total_amount', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'payment_method', type: 'string' },
        { name: 'delivery_address', type: 'string' },
        { name: 'delivery_instructions', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'order_items',
      columns: [
        { name: 'order_id', type: 'string' },
        { name: 'vendor_product_id', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'price_per_unit', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'products',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'category_id', type: 'string' },
        { name: 'is_quality_verified', type: 'boolean' },
        { name: 'type', type: 'string' }, // 'Insurance', 'Credit', 'Input'
        { name: 'provider_name', type: 'string', isOptional: true },
        { name: 'premium_basis_points', type: 'number', isOptional: true },
        { name: 'coverage_limit', type: 'number', isOptional: true },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'product_categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'icon_svg', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'vendors',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'contact_person', type: 'string' },
        { name: 'mobile_number', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'rating', type: 'number' },
        { name: 'tenant_id', type: 'string' },
        { name: 'seller_type', type: 'string' },
        { name: 'farmer_id', type: 'string', isOptional: true },
        { name: 'mandal', type: 'string', isOptional: true },
        { name: 'district', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'vendor_products',
      columns: [
        { name: 'vendor_id', type: 'string' },
        { name: 'product_id', type: 'string' },
        { name: 'price', type: 'number' },
        { name: 'stock_quantity', type: 'number' },
        { name: 'unit', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'visit_requests',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'reason', type: 'string' },
        { name: 'preferred_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'assignee_id', type: 'string', isOptional: true },
        { name: 'scheduled_date', type: 'string', isOptional: true },
        { name: 'resolution_notes', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'priority_score', type: 'number' },
        { name: 'created_by', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'territories',
      columns: [
        { name: 'tenant_id', type: 'string' },
        { name: 'administrative_level', type: 'string' },
        { name: 'administrative_code', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'territory_disputes',
      columns: [
        { name: 'requesting_tenant_id', type: 'string' },
        { name: 'contested_tenant_id', type: 'string' },
        { name: 'administrative_code', type: 'string' },
        { name: 'reason', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'directives',
      columns: [
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
      ],
    }),
    tableSchema({
      name: 'directive_assignments',
      columns: [
        { name: 'directive_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'claimed_at', type: 'string', isOptional: true },
        { name: 'completed_at', type: 'string', isOptional: true },
        { name: 'completion_details_json', type: 'string', isOptional: true },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'user_profiles',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'is_mentor', type: 'boolean' },
        { name: 'expertise_tags', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'mentorships',
      columns: [
        { name: 'mentor_id', type: 'string' },
        { name: 'mentee_id', type: 'string' },
        { name: 'status', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'assistance_applications',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'scheme_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'applied_date', type: 'string' },
        { name: 'approved_date', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'forum_posts',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'author_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'answer_count', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'forum_answers',
      columns: [
        { name: 'post_id', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'author_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'vote_count', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'forum_content_flags',
      columns: [
        { name: 'content_id', type: 'string' },
        { name: 'content_type', type: 'string' },
        { name: 'reason', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'flagged_by_id', type: 'string' },
        { name: 'status', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'training_modules',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'duration_minutes', type: 'number' },
        { name: 'module_type', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'difficulty', type: 'string' },
        { name: 'sort_order', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'training_completions',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'module_id', type: 'string' },
        { name: 'completed_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'events',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'event_date', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'created_by', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'event_rsvps',
      columns: [
        { name: 'event_id', type: 'string' },
        { name: 'user_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'protection_products',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'provider_name', type: 'string' },
        { name: 'premium_basis_points', type: 'number' },
        { name: 'coverage_limit', type: 'number', isOptional: true },
        { name: 'terms_url', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'protection_subscriptions',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'product_id', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string' },
        { name: 'coverage_amount', type: 'number' },
        { name: 'premium_paid', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'protection_claims',
      columns: [
        { name: 'subscription_id', type: 'string' },
        { name: 'incident_date', type: 'string', isOptional: true },
        { name: 'trigger_type', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'payout_amount', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'land_listings',
      columns: [
        { name: 'farm_plot_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'listing_type', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'soil_organic_carbon', type: 'number' },
        { name: 'water_table_depth', type: 'number' },
        { name: 'road_access', type: 'string' },
        { name: 'avg_yield_history', type: 'number' },
        { name: 'hapsara_value_score', type: 'number' },
        { name: 'ask_price', type: 'number' },
        { name: 'duration_months', type: 'number' },
        { name: 'available_from', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'land_valuation_history',
      columns: [
        { name: 'listing_id', type: 'string' },
        { name: 'score', type: 'number' },
        { name: 'calculated_at', type: 'number' },
        { name: 'factors_json', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'dealers',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'shop_name', type: 'string' },
        { name: 'gstin', type: 'string', isOptional: true },
        { name: 'address', type: 'string' },
        { name: 'mandal', type: 'string' },
        { name: 'district', type: 'string' },
        { name: 'is_verified', type: 'boolean' },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'crops',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'is_perennial', type: 'boolean' },
        { name: 'default_unit', type: 'string' },
        { name: 'verification_status', type: 'string' },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'crop_assignments',
      columns: [
        { name: 'farm_plot_id', type: 'string' },
        { name: 'crop_id', type: 'string' },
        { name: 'season', type: 'string' },
        { name: 'year', type: 'number' },
        { name: 'is_primary_crop', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'harvest_logs',
      columns: [
        { name: 'crop_assignment_id', type: 'string' },
        { name: 'harvest_date', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'seed_varieties',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'scientific_name', type: 'string', isOptional: true },
        { name: 'seed_type', type: 'string' },
        { name: 'days_to_maturity', type: 'number' },
        { name: 'is_seed_saving_allowed', type: 'boolean' },
        { name: 'water_requirement', type: 'string' },
        { name: 'potential_yield', type: 'number' },
        { name: 'description', type: 'string' },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isOptional: true },
        // Added fields for Genetica
        { name: 'consent_level', type: 'string' },
        { name: 'owner_farmer_id', type: 'string', isOptional: true },
        { name: 'origin_village', type: 'string', isOptional: true },
        { name: 'oral_history_url', type: 'string', isOptional: true },
        { name: 'passport_hash', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'genetic_lineage',
      columns: [
        { name: 'child_seed_id', type: 'string' },
        { name: 'parent_seed_id', type: 'string' },
        { name: 'relationship_type', type: 'string' },
        { name: 'confidence_score', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'benefit_agreements',
      columns: [
        { name: 'seed_variety_id', type: 'string' },
        { name: 'researcher_org_name', type: 'string' },
        { name: 'community_id', type: 'string' },
        { name: 'terms_hash', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'agreed_at', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'seed_performance_logs',
      columns: [
        { name: 'seed_variety_id', type: 'string' },
        { name: 'farm_plot_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'season', type: 'string' },
        { name: 'year', type: 'number' },
        { name: 'yield_per_acre', type: 'number' },
        { name: 'disease_resistance_score', type: 'number' },
        { name: 'drought_survival_score', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'commodity_listings',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'crop_name', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'quality_grade', type: 'string', isOptional: true },
        { name: 'ask_price', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'farm_plot_id', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'commodity_offers',
      columns: [
        { name: 'listing_id', type: 'string' },
        { name: 'buyer_name', type: 'string' },
        { name: 'buyer_contact', type: 'string' },
        { name: 'offer_price', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'leads',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'vendor_id', type: 'string' },
        { name: 'service_category', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'service_points',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'service_type', type: 'string' },
        { name: 'capacity_per_slot', type: 'number', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'collection_appointments',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'service_point_id', type: 'string' },
        { name: 'start_time', type: 'string' },
        { name: 'end_time', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'farmer_dealer_consents',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        { name: 'is_active', type: 'boolean' },
        { name: 'permissions_json', type: 'string' },
        { name: 'granted_by', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'tenant_partner_configs',
      columns: [
        { name: 'tenant_id', type: 'string' },
        { name: 'revenue_share_enabled', type: 'boolean' },
        { name: 'blocked_categories_json', type: 'string', isOptional: true },
        { name: 'blocked_partner_ids_json', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'partners',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'trust_score', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'kyb_status', type: 'string' },
        { name: 'logo_url', type: 'string', isOptional: true },
        { name: 'website', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'partner_offerings',
      columns: [
        { name: 'partner_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'target_crops_json', type: 'string', isOptional: true },
        { name: 'target_soil_types_json', type: 'string', isOptional: true },
        { name: 'region_codes_json', type: 'string', isOptional: true },
        { name: 'affiliate_fee_percent', type: 'number' },
        { name: 'action_label', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'farmer_partner_consents',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'partner_id', type: 'string' },
        { name: 'scopes_json', type: 'string' },
        { name: 'granted_at', type: 'number' },
        { name: 'expires_at', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'partner_interactions',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'partner_id', type: 'string' },
        { name: 'offering_id', type: 'string', isOptional: true },
        { name: 'interaction_type', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'tenant_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'dealer_inventory_signals',
      columns: [
        { name: 'dealer_id', type: 'string' },
        { name: 'product_id', type: 'string' },
        { name: 'is_available', type: 'boolean' },
        { name: 'stock_quantity', type: 'number', isOptional: true },
        { name: 'reorder_level', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'khata_records',
      columns: [
        { name: 'dealer_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'transaction_type', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'transaction_date', type: 'string' },
        { name: 'due_date', type: 'string', isOptional: true },
        { name: 'proof_image_url', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'sync_status_local', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'dealer_farmer_connections',
      columns: [
        { name: 'dealer_id', type: 'string' },
        { name: 'farmer_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'last_transaction_date', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'agronomic_recommendations',
      columns: [
        { name: 'farmer_id', type: 'string' },
        { name: 'trigger_source', type: 'string' },
        { name: 'type', type: 'string' }, // Renamed from action_type
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'reasoning', type: 'string' },
        { name: 'priority', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'string' },
        { name: 'tenant_id', type: 'string' },
        // New Fields
        { name: 'action_json', type: 'string', isOptional: true },
        { name: 'impact_json', type: 'string', isOptional: true },
        { name: 'social_proof_json', type: 'string', isOptional: true },
      ],
    }),
  ],
});

// --- Models ---

export class TenantModel extends Model {
  static table = 'tenants';
  @text('name') name!: string;
  @field('credit_balance') creditBalance!: number;
  @text('subscription_status') subscriptionStatus!: string;
  @field('max_farmers') maxFarmers!: number;
  @date('created_at') createdAt!: Date;
}

export class UserModel extends Model {
  static table = 'users';
  @text('name') name!: string;
  @text('email') email!: string;
  @text('group_id') groupId!: string;
  @text('tenant_id') tenantId!: string;
  @text('avatar') avatar!: string;
  @field('is_verified') isVerified!: boolean;
}

export class GroupModel extends Model {
  static table = 'groups';
  @text('name') name!: string;
  @text('permissions_str') permissionsStr!: string;
  @text('tenant_id') tenantId!: string;

  get permissions() {
    try {
        return JSON.parse(this.permissionsStr);
    } catch {
        return [];
    }
  }
}

export class DistrictModel extends Model {
  static table = 'districts';
  @text('code') code!: string;
  @text('name') name!: string;
  @children('mandals') mandals!: any;
}

export class MandalModel extends Model {
  static table = 'mandals';
  @text('code') code!: string;
  @text('name') name!: string;
  @text('district_id') districtId!: string;
  @children('villages') villages!: any;
  @relation('districts', 'district_id') district!: any;
}

export class VillageModel extends Model {
  static table = 'villages';
  @text('code') code!: string;
  @text('name') name!: string;
  @text('mandal_id') mandalId!: string;
  @relation('mandals', 'mandal_id') mandal!: any;
}

export class FarmerModel extends Model {
  static table = 'farmers';
  @text('hap_id') hap_id!: string;
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
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @text('created_by') createdBy!: string;
  @text('tenant_id') tenantId!: string;
  @text('primary_crop') primary_crop!: string;
  @field('mlrd_plants') mlrdPlants!: number;
  @field('full_cost_plants') fullCostPlants!: number;
  @text('aso_id') asoId!: string;
  @field('trust_score') trustScore!: number; // Added

  @children('farm_plots') farmPlots!: any;
  @children('subsidy_payments') subsidyPayments!: any;

  @writer async updateSyncStatus(status: string) {
    await (this as any).update((farmer: FarmerModel) => {
        farmer.syncStatus = status;
    });
  }
}

export class FarmPlotModel extends Model {
  static table = 'farm_plots';
  @text('farmer_id') farmerId!: string;
  @text('name') name!: string;
  @field('acreage') acreage!: number;
  @field('number_of_plants') number_of_plants!: number;
  @text('plantation_date') plantationDate!: string;
  @text('soil_type') soilType!: string;
  @text('method_of_plantation') methodOfPlantation!: string;
  @text('plant_type') plantType!: string;
  @text('geojson') geojson!: string;
  @field('is_replanting') isReplanting!: boolean;
  @text('tenant_id') tenantId!: string;
  @text('sync_status_local') syncStatusLocal!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @relation('farmers', 'farmer_id') farmer!: any;
}

export class SubsidyPaymentModel extends Model {
  static table = 'subsidy_payments';
  @text('farmer_id') farmerId!: string;
  @text('payment_date') paymentDate!: string;
  @field('amount') amount!: number;
  @text('utr_number') utrNumber!: string;
  @text('payment_stage') paymentStage!: string;
  @text('notes') notes!: string;
  @text('sync_status_local') syncStatusLocal!: string;
  @text('tenant_id') tenantId!: string;
  @text('created_by') createdBy!: string;
}

export class ActivityLogModel extends Model {
  static table = 'activity_logs';
  @text('farmer_id') farmerId!: string;
  @text('activity_type') activityType!: string;
  @text('description') description!: string;
  @text('created_by') createdBy!: string;
  @text('tenant_id') tenantId!: string;
  @date('created_at') createdAt!: Date;
}

export class ResourceModel extends Model {
    static table = 'resources';
    @text('name') name!: string;
    @text('unit') unit!: string;
    @text('description') description!: string;
    @field('cost') cost!: number;
    @text('tenant_id') tenantId!: string;
}

export class ResourceDistributionModel extends Model {
    static table = 'resource_distributions';
    @text('farmer_id') farmerId!: string;
    @text('resource_id') resourceId!: string;
    @field('quantity') quantity!: number;
    @text('distribution_date') distributionDate!: string;
    @text('notes') notes!: string;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
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

    get options() {
        try {
            return this.optionsJson ? JSON.parse(this.optionsJson) : [];
        } catch {
            return [];
        }
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
    @text('sync_status_local') syncStatusLocal!: string;
    @date('created_at') createdAt!: Date;
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
    @text('batch_code') batchCode!: string;
    @text('harvest_id') harvestId!: string;
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
    @text('end_date') endDate!: string;
    @text('operator_id') operatorId!: string;
    @text('equipment_id') equipmentId!: string;
    @text('parameters_json') parametersJson!: string;
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

export class EquipmentLeaseModel extends Model {
    static table = 'equipment_leases';
    @text('equipment_id') equipmentId!: string;
    @text('farmer_id') farmerId!: string;
    @text('start_date') startDate!: string;
    @text('end_date') endDate!: string;
    @text('payment_status') paymentStatus!: string;
}

export class ManualLedgerEntryModel extends Model {
    static table = 'manual_ledger_entries';
    @text('farmer_id') farmerId!: string;
    @text('date') date!: string;
    @text('type') type!: string;
    @text('category') category!: string;
    @field('amount') amount!: number;
    @text('description') description!: string;
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
    @text('input_date') inputDate!: string;
    @text('input_type') inputType!: string;
    @text('name') name!: string;
    @field('quantity') quantity!: number;
    @text('unit') unit!: string;
    @text('npk_values_json') npkValuesJson!: string;
    @text('notes') notes!: string;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
}

export class WalletModel extends Model {
    static table = 'wallets';
    @text('farmer_id') farmerId!: string;
    @field('balance') balance!: number;
    @date('updated_at') updatedAt!: Date;
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
    @date('created_at') createdAt!: Date;
}

export class WithdrawalAccountModel extends Model {
    static table = 'withdrawal_accounts';
    @text('farmer_id') farmerId!: string;
    @text('account_type') accountType!: string;
    @text('details') details!: string;
    @field('is_verified') isVerified!: boolean;
}

export class CreditLedgerEntryModel extends Model {
    static table = 'credit_ledger';
    @text('tenant_id') tenantId!: string;
    @text('transaction_type') transactionType!: string;
    @field('amount') amount!: number;
    @text('service_event_id') serviceEventId!: string;
    @date('created_at') createdAt!: Date;
}

export class ServiceConsumptionLogModel extends Model {
    static table = 'service_consumption_logs';
    @text('tenant_id') tenantId!: string;
    @text('service_name') serviceName!: string;
    @field('credit_cost') creditCost!: number;
    @text('metadata_json') metadataJson!: string;
    @date('created_at') createdAt!: Date;
}

export class FreeTierUsageModel extends Model {
    static table = 'free_tier_usages';
    @text('tenant_id') tenantId!: string;
    @text('service_name') serviceName!: string;
    @text('period') period!: string;
    @field('usage_count') usageCount!: number;
}

export class OrderModel extends Model {
    static table = 'orders';
    @text('farmer_id') farmerId!: string;
    @text('order_date') orderDate!: string;
    @field('total_amount') totalAmount!: number;
    @text('status') status!: string;
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

export class ProductModel extends Model {
    static table = 'products';
    @text('name') name!: string;
    @text('description') description!: string;
    @text('image_url') imageUrl!: string;
    @text('category_id') categoryId!: string;
    @field('is_quality_verified') isQualityVerified!: boolean;
    @text('type') type!: string; // 'Insurance', 'Credit', 'Input'
    @text('provider_name') providerName!: string;
    @field('premium_basis_points') premiumBasisPoints!: number;
    @field('coverage_limit') coverageLimit!: number;
    @text('tenant_id') tenantId!: string;
}

export class ProductCategoryModel extends Model {
    static table = 'product_categories';
    @text('name') name!: string;
    @text('icon_svg') iconSvg!: string;
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
    @text('mandal') mandal!: string;
    @text('district') district!: string;
}

export class VendorProductModel extends Model {
    static table = 'vendor_products';
    @text('vendor_id') vendorId!: string;
    @text('product_id') productId!: string;
    @field('price') price!: number;
    @field('stock_quantity') stockQuantity!: number;
    @text('unit') unit!: string;
}

export class VisitRequestModel extends Model {
    static table = 'visit_requests';
    @text('farmer_id') farmerId!: string;
    @text('reason') reason!: string;
    @text('preferred_date') preferredDate!: string;
    @text('status') status!: string;
    @text('assignee_id') assigneeId!: string;
    @text('scheduled_date') scheduledDate!: string;
    @text('resolution_notes') resolutionNotes!: string;
    @text('notes') notes!: string;
    @field('priority_score') priorityScore!: number;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
    @date('created_at') createdAt!: Date;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class TerritoryModel extends Model {
    static table = 'territories';
    @text('tenant_id') tenantId!: string;
    @text('administrative_level') administrativeLevel!: string;
    @text('administrative_code') administrativeCode!: string;
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
    @date('created_at') createdAt!: Date;
}

export class DirectiveAssignmentModel extends Model {
    static table = 'directive_assignments';
    @text('directive_id') directiveId!: string;
    @text('tenant_id') tenantId!: string;
    @text('status') status!: string;
    @text('claimed_at') claimedAt!: string;
    @text('completed_at') completedAt!: string;
    @text('completion_details_json') completionDetailsJson!: string;
    @text('sync_status_local') syncStatusLocal!: string;
    @relation('directives', 'directive_id') directive!: any;
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

export class AssistanceApplicationModel extends Model {
    static table = 'assistance_applications';
    @text('farmer_id') farmerId!: string;
    @text('scheme_id') schemeId!: string;
    @text('status') status!: string;
    @text('applied_date') appliedDate!: string;
    @text('approved_date') approvedDate!: string;
    @text('tenant_id') tenantId!: string;
}

export class ForumPostModel extends Model {
    static table = 'forum_posts';
    @text('title') title!: string;
    @text('content') content!: string;
    @text('author_id') authorId!: string;
    @text('tenant_id') tenantId!: string;
    @date('created_at') createdAt!: Date;
    @field('answer_count') answerCount!: number;
}

export class ForumAnswerModel extends Model {
    static table = 'forum_answers';
    @text('post_id') postId!: string;
    @text('content') content!: string;
    @text('author_id') authorId!: string;
    @text('tenant_id') tenantId!: string;
    @date('created_at') createdAt!: Date;
    @field('vote_count') voteCount!: number;
}

export class ForumContentFlagModel extends Model {
    static table = 'forum_content_flags';
    @text('content_id') contentId!: string;
    @text('content_type') contentType!: string;
    @text('reason') reason!: string;
    @text('notes') notes!: string;
    @text('flagged_by_id') flaggedById!: string;
    @text('status') status!: string;
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
    @date('completed_at') completedAt!: Date;
}

export class EventModel extends Model {
    static table = 'events';
    @text('title') title!: string;
    @text('description') description!: string;
    @text('event_date') eventDate!: string;
    @text('location') location!: string;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class EventRsvpModel extends Model {
    static table = 'event_rsvps';
    @text('event_id') eventId!: string;
    @text('user_id') userId!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class ProtectionProductModel extends Model {
    static table = 'protection_products';
    @text('name') name!: string;
    @text('type') type!: string;
    @text('provider_name') providerName!: string;
    @field('premium_basis_points') premiumBasisPoints!: number;
    @field('coverage_limit') coverageLimit!: number;
    @text('terms_url') termsUrl!: string;
    @text('tenant_id') tenantId!: string;
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

export class ProtectionClaimModel extends Model {
    static table = 'protection_claims';
    @text('subscription_id') subscriptionId!: string;
    @text('incident_date') incidentDate!: string;
    @text('trigger_type') triggerType!: string;
    @text('status') status!: string;
    @field('payout_amount') payoutAmount!: number;
    @text('notes') notes!: string;
    @date('created_at') createdAt!: Date;
    @text('sync_status_local') syncStatusLocal!: string;
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
    @date('created_at') createdAt!: Date;
    @date('updated_at') updatedAt!: Date;
}

export class LandValuationHistoryModel extends Model {
    static table = 'land_valuation_history';
    @text('listing_id') listingId!: string;
    @field('score') score!: number;
    @date('calculated_at') calculatedAt!: Date;
    @text('factors_json') factorsJson!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class DealerModel extends Model {
    static table = 'dealers';
    @text('user_id') userId!: string;
    @text('shop_name') shopName!: string;
    @text('gstin') gstin!: string;
    @text('address') address!: string;
    @text('mandal') mandal!: string;
    @text('district') district!: string;
    @field('is_verified') isVerified!: boolean;
    @text('tenant_id') tenantId!: string;
}

export class CropModel extends Model {
    static table = 'crops';
    @text('name') name!: string;
    @field('is_perennial') isPerennial!: boolean;
    @text('default_unit') defaultUnit!: string;
    @text('verification_status') verificationStatus!: string;
    @text('tenant_id') tenantId!: string;
}

export class CropAssignmentModel extends Model {
    static table = 'crop_assignments';
    @text('farm_plot_id') farmPlotId!: string;
    @text('crop_id') cropId!: string;
    @text('season') season!: string;
    @field('year') year!: number;
    @field('is_primary_crop') isPrimaryCrop!: boolean;
    @relation('farm_plots', 'farm_plot_id') farmPlot!: any;
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

export class SeedVarietyModel extends Model {
    static table = 'seed_varieties';
    @text('name') name!: string;
    @text('scientific_name') scientificName!: string;
    @text('seed_type') seedType!: string;
    @field('days_to_maturity') daysToMaturity!: number;
    @field('is_seed_saving_allowed') isSeedSavingAllowed!: boolean;
    @text('water_requirement') waterRequirement!: string;
    @field('potential_yield') potentialYield!: number;
    @text('description') description!: string;
    @text('image_url') imageUrl!: string;
    @text('tenant_id') tenantId!: string;
    // Genetica Fields
    @text('consent_level') consentLevel!: string;
    @text('owner_farmer_id') ownerFarmerId!: string;
    @text('origin_village') originVillage!: string;
    @text('oral_history_url') oralHistoryUrl!: string;
    @text('passport_hash') passportHash!: string;
}

export class GeneticLineageModel extends Model {
    static table = 'genetic_lineage';
    @text('child_seed_id') childSeedId!: string;
    @text('parent_seed_id') parentSeedId!: string;
    @text('relationship_type') relationshipType!: string;
    @field('confidence_score') confidenceScore!: number;
}

export class BenefitAgreementModel extends Model {
    static table = 'benefit_agreements';
    @text('seed_variety_id') seedVarietyId!: string;
    @text('researcher_org_name') researcherOrgName!: string;
    @text('community_id') communityId!: string;
    @text('terms_hash') termsHash!: string;
    @text('status') status!: string;
    @text('agreed_at') agreedAt!: string;
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
    @date('created_at') createdAt!: Date;
    @text('tenant_id') tenantId!: string;
}

export class CommodityListingModel extends Model {
    static table = 'commodity_listings';
    @text('farmer_id') farmerId!: string;
    @text('crop_name') cropName!: string;
    @field('quantity') quantity!: number;
    @text('unit') unit!: string;
    @text('quality_grade') qualityGrade!: string;
    @field('ask_price') askPrice!: number;
    @text('status') status!: string;
    @text('farm_plot_id') farmPlotId!: string;
    @text('tenant_id') tenantId!: string;
    @date('created_at') createdAt!: Date;
    @children('commodity_offers') offers!: any;
}

export class CommodityOfferModel extends Model {
    static table = 'commodity_offers';
    @text('listing_id') listingId!: string;
    @text('buyer_name') buyerName!: string;
    @text('buyer_contact') buyerContact!: string;
    @field('offer_price') offerPrice!: number;
    @text('status') status!: string;
    @date('created_at') createdAt!: Date;
    @relation('commodity_listings', 'listing_id') listing!: any;
}

export class LeadModel extends Model {
    static table = 'leads';
    @text('farmer_id') farmerId!: string;
    @text('vendor_id') vendorId!: string;
    @text('service_category') serviceCategory!: string;
    @text('status') status!: string;
    @text('notes') notes!: string;
    @text('tenant_id') tenantId!: string;
    @date('created_at') createdAt!: Date;
}

export class ServicePointModel extends Model {
    static table = 'service_points';
    @text('name') name!: string;
    @text('location') location!: string;
    @text('service_type') serviceType!: string;
    @field('capacity_per_slot') capacityPerSlot!: number;
    @field('is_active') isActive!: boolean;
    @text('tenant_id') tenantId!: string;
}

export class CollectionAppointmentModel extends Model {
    static table = 'collection_appointments';
    @text('farmer_id') farmerId!: string;
    @text('service_point_id') servicePointId!: string;
    @text('start_time') startTime!: string;
    @text('end_time') endTime!: string;
    @text('status') status!: string;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class FarmerDealerConsentModel extends Model {
    static table = 'farmer_dealer_consents';
    @text('farmer_id') farmerId!: string;
    @text('tenant_id') tenantId!: string;
    @field('is_active') isActive!: boolean;
    @text('permissions_json') permissionsJson!: string;
    @text('granted_by') grantedBy!: string;
}

export class TenantPartnerConfigModel extends Model {
    static table = 'tenant_partner_configs';
    @text('tenant_id') tenantId!: string;
    @field('revenue_share_enabled') revenueShareEnabled!: boolean;
    @text('blocked_categories_json') blockedCategoriesJson!: string;
    @text('blocked_partner_ids_json') blockedPartnerIdsJson!: string;
    @text('sync_status') syncStatus!: string;
}

export class PartnerModel extends Model {
    static table = 'partners';
    @text('name') name!: string;
    @text('category') category!: string;
    @field('trust_score') trustScore!: number;
    @text('status') status!: string;
    @text('kyb_status') kybStatus!: string;
    @text('logo_url') logoUrl!: string;
    @text('website') website!: string;
    @date('created_at') createdAt!: Date;
}

export class PartnerOfferingModel extends Model {
    static table = 'partner_offerings';
    @text('partner_id') partnerId!: string;
    @text('title') title!: string;
    @text('description') description!: string;
    @text('target_crops_json') targetCropsJson!: string;
    @text('target_soil_types_json') targetSoilTypesJson!: string;
    @text('region_codes_json') regionCodesJson!: string;
    @field('affiliate_fee_percent') affiliateFeePercent!: number;
    @text('action_label') actionLabel!: string;
}

export class FarmerPartnerConsentModel extends Model {
    static table = 'farmer_partner_consents';
    @text('farmer_id') farmerId!: string;
    @text('partner_id') partnerId!: string;
    @text('scopes_json') scopesJson!: string;
    @date('granted_at') grantedAt!: Date;
    @date('expires_at') expiresAt!: Date;
    @text('status') status!: string;
    @text('tenant_id') tenantId!: string;
}

export class PartnerInteractionModel extends Model {
    static table = 'partner_interactions';
    @text('farmer_id') farmerId!: string;
    @text('partner_id') partnerId!: string;
    @text('offering_id') offeringId!: string;
    @text('interaction_type') interactionType!: string;
    @date('timestamp') timestamp!: Date;
    @text('tenant_id') tenantId!: string;
}

export class DealerInventorySignalModel extends Model {
    static table = 'dealer_inventory_signals';
    @text('dealer_id') dealerId!: string;
    @text('product_id') productId!: string;
    @field('is_available') isAvailable!: boolean;
    @field('stock_quantity') stockQuantity!: number;
    @field('reorder_level') reorderLevel!: number;
    @text('updated_at') updatedAt!: string;
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
    @text('proof_image_url') proofImageUrl!: string;
    @text('status') status!: string;
    @date('created_at') createdAt!: Date;
    @text('sync_status_local') syncStatusLocal!: string;
}

export class DealerFarmerConnectionModel extends Model {
    static table = 'dealer_farmer_connections';
    @text('dealer_id') dealerId!: string;
    @text('farmer_id') farmerId!: string;
    @text('status') status!: string;
    @text('last_transaction_date') lastTransactionDate!: string;
}

export class AgronomicRecommendationModel extends Model {
    static table = 'agronomic_recommendations';
    @text('farmer_id') farmerId!: string;
    @text('trigger_source') triggerSource!: string;
    @text('type') type!: string; // Renamed from action_type
    @text('title') title!: string;
    @text('description') description!: string;
    @text('reasoning') reasoning!: string;
    @text('priority') priority!: string;
    @text('status') status!: string;
    @text('created_at') createdAt!: string;
    @text('tenant_id') tenantId!: string;
    // New Fields
    @text('action_json') actionJson!: string;
    @text('impact_json') impactJson!: string;
    @text('social_proof_json') socialProofJson!: string;
}

// --- Database Setup ---
const adapter = new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
});

const database = new Database({
  adapter,
  modelClasses: [
    TenantModel, UserModel, GroupModel, DistrictModel, MandalModel, VillageModel,
    FarmerModel, FarmPlotModel, SubsidyPaymentModel, ActivityLogModel, ResourceModel,
    ResourceDistributionModel, CustomFieldDefinitionModel, TaskModel, HarvestModel,
    QualityAssessmentModel, QualityMetricModel, ProcessingBatchModel, ProcessingStepModel,
    EquipmentModel, EquipmentMaintenanceLogModel, ManualLedgerEntryModel, EquipmentLeaseModel,
    PlantingRecordModel, AgronomicInputModel, WalletModel, WalletTransactionModel, WithdrawalAccountModel,
    CreditLedgerEntryModel, ServiceConsumptionLogModel, FreeTierUsageModel, OrderModel, OrderItemModel,
    ProductModel, ProductCategoryModel, VendorModel, VendorProductModel, VisitRequestModel,
    TerritoryModel, TerritoryDisputeModel, DirectiveModel, DirectiveAssignmentModel, UserProfileModel,
    MentorshipModel, ForumPostModel, ForumAnswerModel, ForumContentFlagModel, TrainingModuleModel,
    TrainingCompletionModel, EventModel, EventRsvpModel, ProtectionProductModel, ProtectionSubscriptionModel,
    ProtectionClaimModel, LandListingModel, LandValuationHistoryModel, DealerModel, CropModel,
    CropAssignmentModel, HarvestLogModel, SeedVarietyModel, SeedPerformanceLogModel,
    CommodityListingModel, CommodityOfferModel, LeadModel, ServicePointModel, CollectionAppointmentModel,
    FarmerDealerConsentModel, TenantPartnerConfigModel, PartnerModel, PartnerOfferingModel,
    FarmerPartnerConsentModel, PartnerInteractionModel, DealerInventorySignalModel, KhataRecordModel,
    DealerFarmerConnectionModel, AgronomicRecommendationModel, AssistanceApplicationModel,
    GeneticLineageModel, BenefitAgreementModel // Added new models
  ],
});

export default database;
