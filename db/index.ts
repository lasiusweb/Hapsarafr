

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { appSchema, tableSchema } from '@nozbe/watermelondb/Schema';
import Model from '@nozbe/watermelondb/Model';
import { field, text, readonly, date, relation, children, writer, json } from '@nozbe/watermelondb/decorators';

// --- Schema Definition ---
const schema = appSchema({
  version: 6, // Incremented for Leads
  tables: [
    // ... existing tables ...
    tableSchema({
      name: 'farmers',
      columns: [
        { name: 'hap_id', type: 'string', isIndexed: true },
        { name: 'full_name', type: 'string', isIndexed: true },
        { name: 'father_husband_name', type: 'string' },
        { name: 'aadhaar_number', type: 'string', isIndexed: true },
        { name: 'mobile_number', type: 'string', isIndexed: true },
        { name: 'gender', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'district', type: 'string', isIndexed: true },
        { name: 'mandal', type: 'string', isIndexed: true },
        { name: 'village', type: 'string', isIndexed: true },
        { name: 'photo', type: 'string', isOptional: true },
        { name: 'bank_account_number', type: 'string' },
        { name: 'ifsc_code', type: 'string' },
        { name: 'account_verified', type: 'boolean' },
        { name: 'approved_extent', type: 'number' },
        { name: 'applied_extent', type: 'number' },
        { name: 'number_of_plants', type: 'number' },
        { name: 'method_of_plantation', type: 'string' },
        { name: 'plant_type', type: 'string' },
        { name: 'plantation_date', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'registration_date', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'gov_application_id', type: 'string', isOptional: true },
        { name: 'gov_farmer_id', type: 'string', isOptional: true },
        { name: 'ppb_rofr_id', type: 'string', isOptional: true },
        { name: 'is_in_ne_region', type: 'boolean' },
        { name: 'proposed_year', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'farm_plots',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'acreage', type: 'number' },
        { name: 'number_of_plants', type: 'number', isOptional: true },
        { name: 'plantation_date', type: 'string', isOptional: true },
        { name: 'soil_type', type: 'string', isOptional: true },
        { name: 'method_of_plantation', type: 'string', isOptional: true },
        { name: 'plant_type', type: 'string', isOptional: true },
        { name: 'geojson', type: 'string', isOptional: true },
        { name: 'is_replanting', type: 'boolean', isOptional: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
        name: 'subsidy_payments',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'payment_date', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'utr_number', type: 'string' },
            { name: 'payment_stage', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'created_by', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'activity_logs',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'activity_type', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'created_by', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'users',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'email', type: 'string', isOptional: true },
            { name: 'group_id', type: 'string', isIndexed: true },
            { name: 'avatar', type: 'string', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'is_verified', type: 'boolean' },
        ]
    }),
    tableSchema({
        name: 'groups',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'permissions_str', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'tenants',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'subscription_status', type: 'string' },
            { name: 'credit_balance', type: 'number' },
            { name: 'max_farmers', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'districts',
        columns: [
            { name: 'code', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'mandals',
        columns: [
            { name: 'code', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'district_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'villages',
        columns: [
            { name: 'code', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'mandal_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'resources',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'unit', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'cost', type: 'number', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'resource_distributions',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'resource_id', type: 'string', isIndexed: true },
            { name: 'quantity', type: 'number' },
            { name: 'distribution_date', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'created_by', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'tasks',
        columns: [
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'status', type: 'string', isIndexed: true },
            { name: 'priority', type: 'string' },
            { name: 'due_date', type: 'string', isOptional: true },
            { name: 'assignee_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'farmer_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'created_by', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'source', type: 'string' }, 
            { name: 'directive_assignment_id', type: 'string', isOptional: true },
            { name: 'completion_evidence_json', type: 'string', isOptional: true },
            { name: 'sync_status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'planting_records',
        columns: [
            { name: 'plot_id', type: 'string', isIndexed: true },
            { name: 'seed_source', type: 'string' },
            { name: 'planting_date', type: 'string' },
            { name: 'genetic_variety', type: 'string' },
            { name: 'number_of_plants', type: 'number' },
            { name: 'care_instructions_url', type: 'string', isOptional: true },
            { name: 'qr_code_data', type: 'string', isOptional: true },
            { name: 'sync_status', type: 'string' },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'harvests',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'harvest_date', type: 'string' },
            { name: 'gross_weight', type: 'number' },
            { name: 'tare_weight', type: 'number' },
            { name: 'net_weight', type: 'number' },
            { name: 'assessed_by_id', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'quality_assessments',
        columns: [
            { name: 'harvest_id', type: 'string', isIndexed: true },
            { name: 'overall_grade', type: 'string' },
            { name: 'price_adjustment', type: 'number' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'appeal_status', type: 'string' },
            { name: 'assessment_date', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'quality_metrics',
        columns: [
            { name: 'assessment_id', type: 'string', isIndexed: true },
            { name: 'metric_name', type: 'string' },
            { name: 'metric_value', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'user_profiles',
        columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'is_mentor', type: 'boolean' },
            { name: 'expertise_tags', type: 'string', isOptional: true },
        ]
    }),
    tableSchema({
        name: 'mentorships',
        columns: [
            { name: 'mentor_id', type: 'string', isIndexed: true },
            { name: 'mentee_id', type: 'string', isIndexed: true },
            { name: 'status', type: 'string' }, 
        ]
    }),
    tableSchema({
        name: 'assistance_applications',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'scheme_id', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'applied_date', type: 'string', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'equipment',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'type', type: 'string' },
            { name: 'location', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'purchase_date', type: 'string', isOptional: true },
            { name: 'last_maintenance_date', type: 'string', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'equipment_maintenance_logs',
        columns: [
            { name: 'equipment_id', type: 'string', isIndexed: true },
            { name: 'maintenance_date', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'cost', type: 'number' },
            { name: 'performed_by_id', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'withdrawal_accounts',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'account_type', type: 'string' },
            { name: 'details', type: 'string' },
            { name: 'is_verified', type: 'boolean' },
        ]
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
            { name: 'sort_order', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'training_completions',
        columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'module_id', type: 'string', isIndexed: true },
            { name: 'completed_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'events',
        columns: [
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'event_date', type: 'string' },
            { name: 'location', type: 'string' },
            { name: 'created_by', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'event_rsvps',
        columns: [
            { name: 'event_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'territories',
        columns: [
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'administrative_level', type: 'string' },
            { name: 'administrative_code', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'territory_transfer_requests',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'from_tenant_id', type: 'string' },
            { name: 'to_tenant_id', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'requested_by_id', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'territory_disputes',
        columns: [
            { name: 'requesting_tenant_id', type: 'string' },
            { name: 'contested_tenant_id', type: 'string' },
            { name: 'administrative_code', type: 'string' },
            { name: 'reason', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'farmer_dealer_consents',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'is_active', type: 'boolean' },
            { name: 'permissions_json', type: 'string' },
            { name: 'granted_by', type: 'string' },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'forum_posts',
        columns: [
            { name: 'title', type: 'string' },
            { name: 'content', type: 'string' },
            { name: 'author_id', type: 'string' },
            { name: 'tenant_id', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'answer_count', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'forum_answers',
        columns: [
            { name: 'post_id', type: 'string', isIndexed: true },
            { name: 'content', type: 'string' },
            { name: 'author_id', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'vote_count', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'forum_answer_votes',
        columns: [
            { name: 'answer_id', type: 'string', isIndexed: true },
            { name: 'voter_id', type: 'string' },
        ]
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
        ]
    }),
    tableSchema({
        name: 'agronomic_alerts',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'plot_id', type: 'string', isOptional: true },
            { name: 'alert_type', type: 'string' },
            { name: 'severity', type: 'string' },
            { name: 'message', type: 'string' },
            { name: 'recommendation', type: 'string' },
            { name: 'is_read', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'wallets',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'balance', type: 'number' },
            { name: 'updated_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'wallet_transactions',
        columns: [
            { name: 'wallet_id', type: 'string', isIndexed: true },
            { name: 'transaction_type', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'source', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'metadata_json', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'visit_requests',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'reason', type: 'string' },
            { name: 'preferred_date', type: 'string' },
            { name: 'status', type: 'string', isIndexed: true },
            { name: 'assignee_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'scheduled_date', type: 'string', isOptional: true },
            { name: 'resolution_notes', type: 'string', isOptional: true },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'priority_score', type: 'number' },
            { name: 'created_by', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
            { name: 'created_at', type: 'number' },
        ]
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
            { name: 'sync_status', type: 'string' },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'directive_assignments',
        columns: [
            { name: 'directive_id', type: 'string', isIndexed: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'status', type: 'string' },
            { name: 'claimed_at', type: 'string', isOptional: true },
            { name: 'completed_at', type: 'string', isOptional: true },
            { name: 'completion_details_json', type: 'string', isOptional: true },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'product_categories',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'icon_svg', type: 'string', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'products',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'image_url', type: 'string', isOptional: true },
            { name: 'category_id', type: 'string', isIndexed: true },
            { name: 'is_quality_verified', type: 'boolean' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'type', type: 'string', isOptional: true },
            { name: 'provider_name', type: 'string', isOptional: true },
            { name: 'premium_basis_points', type: 'number', isOptional: true },
            { name: 'coverage_limit', type: 'number', isOptional: true },
        ]
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
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'seller_type', type: 'string' },
            { name: 'farmer_id', type: 'string', isOptional: true },
            { name: 'documents_json', type: 'string', isOptional: true },
        ]
    }),
    tableSchema({
        name: 'vendor_products',
        columns: [
            { name: 'vendor_id', type: 'string', isIndexed: true },
            { name: 'product_id', type: 'string', isIndexed: true },
            { name: 'price', type: 'number' },
            { name: 'stock_quantity', type: 'number' },
            { name: 'unit', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'orders',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'order_date', type: 'string' },
            { name: 'total_amount', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'payment_method', type: 'string' },
            { name: 'delivery_address', type: 'string' },
            { name: 'delivery_instructions', type: 'string', isOptional: true },
            { name: 'sync_status', type: 'string' },
            { name: 'dealer_id', type: 'string', isOptional: true, isIndexed: true }, 
        ]
    }),
    tableSchema({
        name: 'order_items',
        columns: [
            { name: 'order_id', type: 'string', isIndexed: true },
            { name: 'vendor_product_id', type: 'string' },
            { name: 'quantity', type: 'number' },
            { name: 'price_per_unit', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'crops',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'is_perennial', type: 'boolean' },
            { name: 'default_unit', type: 'string' },
            { name: 'verification_status', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'crop_assignments',
        columns: [
            { name: 'farm_plot_id', type: 'string', isIndexed: true },
            { name: 'crop_id', type: 'string', isIndexed: true },
            { name: 'season', type: 'string' },
            { name: 'year', type: 'number' },
            { name: 'is_primary_crop', type: 'boolean' },
        ]
    }),
    tableSchema({
        name: 'harvest_logs',
        columns: [
            { name: 'crop_assignment_id', type: 'string', isIndexed: true },
            { name: 'harvest_date', type: 'string' },
            { name: 'quantity', type: 'number' },
            { name: 'unit', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'created_by', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'data_sharing_consents',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'partner_tenant_id', type: 'string', isIndexed: true },
            { name: 'data_types_json', type: 'string' },
            { name: 'is_active', type: 'boolean' },
            { name: 'granted_at', type: 'string' },
            { name: 'expires_at', type: 'string', isOptional: true },
        ]
    }),
    tableSchema({
        name: 'credit_ledger',
        columns: [
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'transaction_type', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'service_event_id', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'service_consumption_logs',
        columns: [
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'service_name', type: 'string' },
            { name: 'credit_cost', type: 'number' },
            { name: 'metadata_json', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'free_tier_usages',
        columns: [
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'service_name', type: 'string' },
            { name: 'period', type: 'string' },
            { name: 'usage_count', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'service_points',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'location', type: 'string' },
            { name: 'service_type', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'officer_schedules',
        columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'date', type: 'string' },
            { name: 'availability_json', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'collection_appointments',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'service_point_id', type: 'string', isIndexed: true },
            { name: 'start_time', type: 'string' },
            { name: 'end_time', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'agronomic_inputs',
        columns: [
            { name: 'farm_plot_id', type: 'string', isIndexed: true },
            { name: 'input_date', type: 'string' },
            { name: 'input_type', type: 'string' },
            { name: 'name', type: 'string' },
            { name: 'quantity', type: 'number' },
            { name: 'unit', type: 'string' },
            { name: 'npk_values_json', type: 'string', isOptional: true },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'created_by', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'processing_batches',
        columns: [
            { name: 'batch_code', type: 'string' },
            { name: 'harvest_id', type: 'string', isIndexed: true },
            { name: 'start_date', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'processing_steps',
        columns: [
            { name: 'batch_id', type: 'string', isIndexed: true },
            { name: 'step_name', type: 'string' },
            { name: 'start_date', type: 'string' },
            { name: 'end_date', type: 'string', isOptional: true },
            { name: 'operator_id', type: 'string' },
            { name: 'equipment_id', type: 'string', isOptional: true },
            { name: 'parameters_json', type: 'string', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'sync_status', type: 'string' },
        ]
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
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'protection_subscriptions',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'product_id', type: 'string', isIndexed: true },
            { name: 'start_date', type: 'string' },
            { name: 'end_date', type: 'string' },
            { name: 'coverage_amount', type: 'number' },
            { name: 'premium_paid', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'protection_claims',
        columns: [
            { name: 'subscription_id', type: 'string', isIndexed: true },
            { name: 'incident_date', type: 'string', isOptional: true },
            { name: 'trigger_type', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'payout_amount', type: 'number', isOptional: true },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'family_units',
        columns: [
            { name: 'head_farmer_id', type: 'string', isIndexed: true },
            { name: 'member_count', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'legacy_profiles',
        columns: [
            { name: 'family_unit_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'relationship', type: 'string' },
            { name: 'education_level', type: 'string', isOptional: true },
            { name: 'current_occupation', type: 'string', isOptional: true },
            { name: 'needs_scholarship', type: 'boolean', isOptional: true },
        ]
    }),
    tableSchema({
        name: 'land_listings',
        columns: [
            { name: 'farm_plot_id', type: 'string', isIndexed: true },
            { name: 'farmer_id', type: 'string', isIndexed: true },
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
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'land_valuation_history',
        columns: [
            { name: 'listing_id', type: 'string', isIndexed: true },
            { name: 'score', type: 'number' },
            { name: 'calculated_at', type: 'number' },
            { name: 'factors_json', type: 'string' },
            { name: 'sync_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'equipment_leases',
        columns: [
            { name: 'equipment_id', type: 'string', isIndexed: true },
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'start_date', type: 'string' },
            { name: 'end_date', type: 'string' },
            { name: 'payment_status', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'manual_ledger_entries',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'date', type: 'string' },
            { name: 'type', type: 'string' },
            { name: 'category', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'description', type: 'string', isOptional: true },
        ]
    }),
    tableSchema({
      name: 'dealers',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'shop_name', type: 'string' },
        { name: 'gstin', type: 'string', isOptional: true },
        { name: 'address', type: 'string' },
        { name: 'mandal', type: 'string' },
        { name: 'district', type: 'string' },
        { name: 'is_verified', type: 'boolean' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ]
    }),
    tableSchema({
      name: 'dealer_inventory_signals',
      columns: [
        { name: 'dealer_id', type: 'string', isIndexed: true },
        { name: 'product_id', type: 'string', isIndexed: true },
        { name: 'is_available', type: 'boolean' },
        { name: 'updated_at', type: 'string' },
      ]
    }),
    tableSchema({
      name: 'khata_records',
      columns: [
        { name: 'dealer_id', type: 'string', isIndexed: true },
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'amount', type: 'number' },
        { name: 'transaction_type', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'transaction_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'dealer_farmer_connections',
      columns: [
        { name: 'dealer_id', type: 'string', isIndexed: true },
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'last_transaction_date', type: 'string' },
      ]
    }),
    tableSchema({
        name: 'agronomic_recommendations',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'trigger_source', type: 'string' },
            { name: 'action_type', type: 'string' },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'reasoning', type: 'string' },
            { name: 'priority', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
      name: 'dealer_insights',
      columns: [
        { name: 'dealer_id', type: 'string', isIndexed: true },
        { name: 'metric_key', type: 'string' },
        { name: 'metric_value', type: 'number' },
        { name: 'generated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'market_trends',
      columns: [
        { name: 'region_code', type: 'string', isIndexed: true },
        { name: 'trend_type', type: 'string' },
        { name: 'payload_json', type: 'string' },
        { name: 'valid_until', type: 'number' },
      ]
    }),
    // Caelus - Climate Resilience
    tableSchema({
        name: 'climate_risk_cache',
        columns: [
            { name: 'region_code', type: 'string', isIndexed: true },
            { name: 'date', type: 'string' },
            { name: 'temperature_max', type: 'number' },
            { name: 'rainfall_mm', type: 'number' },
            { name: 'ndvi_index', type: 'number', isOptional: true },
            { name: 'risk_score', type: 'number' },
            { name: 'metadata_json', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'sustainability_actions',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'action_type', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'verification_photo_url', type: 'string', isOptional: true },
            { name: 'geo_coords', type: 'string', isOptional: true },
            { name: 'submitted_at', type: 'number' },
            { name: 'verified_at', type: 'number', isOptional: true },
        ]
    }),
    tableSchema({
        name: 'sustainability_credentials',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'grade', type: 'string' },
            { name: 'issued_at', type: 'number' },
            { name: 'valid_until', type: 'number' },
            { name: 'hash', type: 'string' },
            { name: 'metadata_json', type: 'string', isOptional: true },
        ]
    }),
    // Genetica - Seed Registry
    tableSchema({
        name: 'seed_varieties',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'scientific_name', type: 'string', isOptional: true },
            { name: 'seed_type', type: 'string' },
            { name: 'breeder_id', type: 'string', isOptional: true },
            { name: 'days_to_maturity', type: 'number' },
            { name: 'is_seed_saving_allowed', type: 'boolean' },
            { name: 'water_requirement', type: 'string' },
            { name: 'potential_yield', type: 'number' },
            { name: 'description', type: 'string' },
            { name: 'image_url', type: 'string', isOptional: true },
            { name: 'tenant_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'seed_performance_logs',
        columns: [
            { name: 'seed_variety_id', type: 'string', isIndexed: true },
            { name: 'farm_plot_id', type: 'string', isIndexed: true },
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'season', type: 'string' },
            { name: 'year', type: 'number' },
            { name: 'yield_per_acre', type: 'number' },
            { name: 'disease_resistance_score', type: 'number' },
            { name: 'drought_survival_score', type: 'number' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    // Commoditex - Commodity Exchange
    tableSchema({
        name: 'commodity_listings',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'crop_name', type: 'string' },
            { name: 'variety', type: 'string', isOptional: true },
            { name: 'quantity', type: 'number' },
            { name: 'unit', type: 'string' },
            { name: 'quality_grade', type: 'string', isOptional: true },
            { name: 'harvest_date', type: 'string', isOptional: true },
            { name: 'ask_price', type: 'number' },
            { name: 'min_acceptable_price', type: 'number', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'farm_plot_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'commodity_bids',
        columns: [
            { name: 'listing_id', type: 'string', isIndexed: true },
            { name: 'buyer_id', type: 'string', isIndexed: true },
            { name: 'offer_price', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'is_binding', type: 'boolean' },
        ]
    }),
    tableSchema({
        name: 'market_prices',
        columns: [
            { name: 'region_code', type: 'string', isIndexed: true },
            { name: 'commodity', type: 'string' },
            { name: 'date', type: 'string' },
            { name: 'min_price', type: 'number' },
            { name: 'max_price', type: 'number' },
            { name: 'modal_price', type: 'number' },
            { name: 'source', type: 'string' },
        ]
    }),
    tableSchema({
        name: 'leads',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'vendor_id', type: 'string', isIndexed: true },
            { name: 'service_category', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
      name: 'custom_field_definitions',
      columns: [
        { name: 'model_name', type: 'string', isIndexed: true },
        { name: 'field_name', type: 'string' },
        { name: 'field_label', type: 'string' },
        { name: 'field_type', type: 'string' },
        { name: 'options_json', type: 'string', isOptional: true },
        { name: 'is_required', type: 'boolean' },
        { name: 'sort_order', type: 'number' },
      ]
    }),
  ]
});

export class FarmerModel extends Model {
  static table = 'farmers';
  static associations = {
    farm_plots: { type: 'has_many', foreignKey: 'farmer_id' },
    subsidy_payments: { type: 'has_many', foreignKey: 'farmer_id' },
    assistance_applications: { type: 'has_many', foreignKey: 'farmer_id' },
    harvests: { type: 'has_many', foreignKey: 'farmer_id' },
    withdrawal_accounts: { type: 'has_many', foreignKey: 'farmer_id' },
    farmer_dealer_consents: { type: 'has_many', foreignKey: 'farmer_id' },
    visit_requests: { type: 'has_many', foreignKey: 'farmer_id' },
  } as const;

  @text('full_name') fullName!: string;
  @text('hap_id') hapId!: string;
  @text('status') status!: string;
  @text('mobile_number') mobileNumber!: string;
  @text('aadhaar_number') aadhaarNumber!: string;
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
  @text('registration_date') registrationDate!: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @text('gov_application_id') govApplicationId!: string;
  @text('gov_farmer_id') govFarmerId!: string;
  @text('ppb_rofr_id') ppbRofrId!: string;
  @field('is_in_ne_region') isInNeRegion!: boolean;
  @text('proposed_year') proposedYear!: string;
  @text('sync_status') syncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @text('created_by') createdBy!: string;
  @text('tenant_id') tenantId!: string;
  @text('father_husband_name') fatherHusbandName!: string;
  
  @children('farm_plots') farmPlots!: any;
  @children('subsidy_payments') subsidyPayments!: any;
  @children('assistance_applications') assistanceApplications!: any;
  @children('harvests') harvests!: any;
  @children('withdrawal_accounts') withdrawalAccounts!: any;
  @children('farmer_dealer_consents') consents!: any;
  @children('visit_requests') visitRequests!: any;
}

export class FarmPlotModel extends Model {
  static table = 'farm_plots';
  static associations = {
    farmers: { type: 'belongs_to', key: 'farmer_id' },
    crop_assignments: { type: 'has_many', foreignKey: 'farm_plot_id' },
    agronomic_inputs: { type: 'has_many', foreignKey: 'farm_plot_id' },
  } as const;

  @text('farmer_id') farmerId!: string;
  @text('name') name!: string;
  @field('acreage') acreage!: number;
  @field('number_of_plants') numberOfPlants!: number;
  @text('plantation_date') plantationDate!: string;
  @text('soil_type') soilType!: string;
  @text('method_of_plantation') methodOfPlantation!: string;
  @text('plant_type') plantType!: string;
  @text('geojson') geojson!: string;
  @field('is_replanting') isReplanting!: boolean;
  @text('tenant_id') tenantId!: string;
  @text('sync_status') syncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('farmers', 'farmer_id') farmer!: any;
  @children('crop_assignments') cropAssignments!: any;
  @children('agronomic_inputs') agronomicInputs!: any;
}

export class SubsidyPaymentModel extends Model {
    static table = 'subsidy_payments';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;

    @text('farmer_id') farmerId!: string;
    @text('payment_date') paymentDate!: string;
    @field('amount') amount!: number;
    @text('utr_number') utrNumber!: string;
    @text('payment_stage') paymentStage!: string;
    @text('notes') notes!: string;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status') syncStatus!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    @relation('farmers', 'farmer_id') farmer!: any;
}

export class ActivityLogModel extends Model {
    static table = 'activity_logs';
    @text('farmer_id') farmerId!: string;
    @text('activity_type') activityType!: string;
    @text('description') description!: string;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
    @readonly @date('created_at') createdAt!: Date;
}

export class UserModel extends Model {
    static table = 'users';
    @text('name') name!: string;
    @text('email') email!: string;
    @text('group_id') groupId!: string;
    @text('avatar') avatar!: string;
    @text('tenant_id') tenantId!: string;
    @field('is_verified') isVerified!: boolean;
}

export class GroupModel extends Model {
    static table = 'groups';
    @text('name') name!: string;
    @text('permissions_str') permissionsStr!: string;
    @text('tenant_id') tenantId!: string;
    
    get permissions() {
        return JSON.parse(this.permissionsStr);
    }
}

export class TenantModel extends Model {
    static table = 'tenants';
    @text('name') name!: string;
    @text('subscription_status') subscriptionStatus!: string;
    @field('credit_balance') creditBalance!: number;
    @field('max_farmers') maxFarmers!: number;
    @readonly @date('created_at') createdAt!: Date;
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
}

export class VillageModel extends Model {
    static table = 'villages';
    @text('code') code!: string;
    @text('name') name!: string;
    @text('mandal_id') mandalId!: string;
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
    @text('sync_status') syncStatus!: string;
    @readonly @date('created_at') createdAt!: Date;
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
        return this.optionsJson ? JSON.parse(this.optionsJson) : [];
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
    @text('sync_status') syncStatus!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
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
    @text('sync_status') syncStatus!: string;
    @readonly @date('created_at') createdAt!: Date;
}

export class HarvestModel extends Model {
    static table = 'harvests';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
        quality_assessments: { type: 'has_many', foreignKey: 'harvest_id' },
    } as const;

    @text('farmer_id') farmerId!: string;
    @text('harvest_date') harvestDate!: string;
    @field('gross_weight') grossWeight!: number;
    @field('tare_weight') tareWeight!: number;
    @field('net_weight') netWeight!: number;
    @text('assessed_by_id') assessedById!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status') syncStatus!: string;
    @readonly @date('created_at') createdAt!: Date;

    @relation('farmers', 'farmer_id') farmer!: any;
    @children('quality_assessments') qualityAssessments!: any;
}

export class QualityAssessmentModel extends Model {
    static table = 'quality_assessments';
    static associations = {
        harvests: { type: 'belongs_to', key: 'harvest_id' },
        quality_metrics: { type: 'has_many', foreignKey: 'assessment_id' },
    } as const;

    @text('harvest_id') harvestId!: string;
    @text('overall_grade') overallGrade!: string;
    @field('price_adjustment') priceAdjustment!: number;
    @text('notes') notes!: string;
    @text('appeal_status') appealStatus!: string;
    @text('assessment_date') assessmentDate!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status') syncStatus!: string;
    @readonly @date('created_at') createdAt!: Date;

    @relation('harvests', 'harvest_id') harvest!: any;
    @children('quality_metrics') qualityMetrics!: any;
}

export class QualityMetricModel extends Model {
    static table = 'quality_metrics';
    @text('assessment_id') assessmentId!: string;
    @text('metric_name') metricName!: string;
    @text('metric_value') metricValue!: string;
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
    @text('tenant_id') tenantId!: string;
    @text('sync_status') syncStatus!: string;
}

export class EquipmentModel extends Model {
    static table = 'equipment';
    @text('name') name!: string;
    @text('type') type!: string;
    @text('location') location!: string;
    @text('status') status!: string;
    @text('purchase_date') purchaseDate!: string;
    @text('last_maintenance_date') lastMaintenanceDate!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status') syncStatus!: string;
}

export class EquipmentMaintenanceLogModel extends Model {
    static table = 'equipment_maintenance_logs';
    @text('equipment_id') equipmentId!: string;
    @text('maintenance_date') maintenanceDate!: string;
    @text('description') description!: string;
    @field('cost') cost!: number;
    @text('performed_by_id') performedById!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status') syncStatus!: string;
}

export class WithdrawalAccountModel extends Model {
    static table = 'withdrawal_accounts';
    @text('farmer_id') farmerId!: string;
    @text('account_type') accountType!: string;
    @text('details') details!: string;
    @field('is_verified') isVerified!: boolean;
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
    @field('completed_at') completedAt!: number;
}

export class EventModel extends Model {
    static table = 'events';
    @text('title') title!: string;
    @text('description') description!: string;
    @text('event_date') eventDate!: string;
    @text('location') location!: string;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status') syncStatus!: string;
}

export class EventRsvpModel extends Model {
    static table = 'event_rsvps';
    @text('event_id') eventId!: string;
    @text('user_id') userId!: string;
    @text('sync_status') syncStatus!: string;
}

export class TerritoryModel extends Model {
    static table = 'territories';
    @text('tenant_id') tenantId!: string;
    @text('administrative_level') administrativeLevel!: string;
    @text('administrative_code') administrativeCode!: string;
}

export class TerritoryTransferRequestModel extends Model {
    static table = 'territory_transfer_requests';
    @text('farmer_id') farmerId!: string;
    @text('from_tenant_id') fromTenantId!: string;
    @text('to_tenant_id') toTenantId!: string;
    @text('status') status!: string;
    @text('requested_by_id') requestedById!: string;
    @field('created_at') createdAt!: number;
    @text('sync_status') syncStatus!: string;
}

export class TerritoryDisputeModel extends Model {
    static table = 'territory_disputes';
    @text('requesting_tenant_id') requestingTenantId!: string;
    @text('contested_tenant_id') contestedTenantId!: string;
    @text('administrative_code') administrativeCode!: string;
    @text('reason') reason!: string;
    @text('status') status!: string;
    @text('sync_status') syncStatus!: string;
}

export class FarmerDealerConsentModel extends Model {
    static table = 'farmer_dealer_consents';
    @text('farmer_id') farmerId!: string;
    @text('tenant_id') tenantId!: string;
    @field('is_active') isActive!: boolean;
    @text('permissions_json') permissionsJson!: string;
    @text('granted_by') grantedBy!: string;
    @text('sync_status') syncStatus!: string;
}

export class ForumPostModel extends Model {
    static table = 'forum_posts';
    @text('title') title!: string;
    @text('content') content!: string;
    @text('author_id') authorId!: string;
    @text('tenant_id') tenantId!: string;
    @field('created_at') createdAt!: number;
    @field('answer_count') answerCount!: number;
}

export class ForumAnswerModel extends Model {
    static table = 'forum_answers';
    @text('post_id') postId!: string;
    @text('content') content!: string;
    @text('author_id') authorId!: string;
    @field('created_at') createdAt!: number;
    @field('vote_count') voteCount!: number;
}

export class ForumAnswerVoteModel extends Model {
    static table = 'forum_answer_votes';
    @text('answer_id') answerId!: string;
    @text('voter_id') voterId!: string;
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

export class AgronomicAlertModel extends Model {
    static table = 'agronomic_alerts';
    @text('farmer_id') farmerId!: string;
    @text('plot_id') plotId!: string;
    @text('alert_type') alertType!: string;
    @text('severity') severity!: string;
    @text('message') message!: string;
    @text('recommendation') recommendation!: string;
    @field('is_read') isRead!: boolean;
    @field('created_at') createdAt!: number;
    @text('tenant_id') tenantId!: string;
}

export class WalletModel extends Model {
    static table = 'wallets';
    @text('farmer_id') farmerId!: string;
    @field('balance') balance!: number;
    @field('updated_at') updatedAt!: number;
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
    @field('created_at') createdAt!: number;
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
    @text('sync_status') syncStatus!: string;
    @readonly @date('created_at') createdAt!: Date;
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
    @text('sync_status') syncStatus!: string;
    @readonly @date('created_at') createdAt!: Date;
}

export class DirectiveAssignmentModel extends Model {
    static table = 'directive_assignments';
    static associations = {
        directives: { type: 'belongs_to', key: 'directive_id' },
    } as const;

    @text('directive_id') directiveId!: string;
    @text('tenant_id') tenantId!: string;
    @text('status') status!: string;
    @text('claimed_at') claimedAt!: string;
    @text('completed_at') completedAt!: string;
    @text('completion_details_json') completionDetailsJson!: string;
    @text('sync_status') syncStatus!: string;
    
    @relation('directives', 'directive_id') directive!: any;
}

export class ProductCategoryModel extends Model {
    static table = 'product_categories';
    @text('name') name!: string;
    @text('icon_svg') iconSvg!: string;
    @text('tenant_id') tenantId!: string;
}

export class ProductModel extends Model {
    static table = 'products';
    @text('name') name!: string;
    @text('description') description!: string;
    @text('image_url') imageUrl!: string;
    @text('category_id') categoryId!: string;
    @field('is_quality_verified') isQualityVerified!: boolean;
    @text('tenant_id') tenantId!: string;
    @text('type') type!: string;
    @text('provider_name') providerName!: string;
    @field('premium_basis_points') premiumBasisPoints!: number;
    @field('coverage_limit') coverageLimit!: number;
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
    @text('documents_json') documentsJson!: string;
}

export class VendorProductModel extends Model {
    static table = 'vendor_products';
    @text('vendor_id') vendorId!: string;
    @text('product_id') productId!: string;
    @field('price') price!: number;
    @field('stock_quantity') stockQuantity!: number;
    @text('unit') unit!: string;
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
    @text('sync_status') syncStatus!: string;
    @text('dealer_id') dealerId!: string;
}

export class OrderItemModel extends Model {
    static table = 'order_items';
    @text('order_id') orderId!: string;
    @text('vendor_product_id') vendorProductId!: string;
    @field('quantity') quantity!: number;
    @field('price_per_unit') pricePerUnit!: number;
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
    static associations = {
        farm_plots: { type: 'belongs_to', key: 'farm_plot_id' },
        crops: { type: 'belongs_to', key: 'crop_id' },
        harvest_logs: { type: 'has_many', foreignKey: 'crop_assignment_id' },
    } as const;

    @text('farm_plot_id') farmPlotId!: string;
    @text('crop_id') cropId!: string;
    @text('season') season!: string;
    @field('year') year!: number;
    @field('is_primary_crop') isPrimaryCrop!: boolean;

    @relation('farm_plots', 'farm_plot_id') farmPlot!: any;
    @relation('crops', 'crop_id') crop!: any;
    @children('harvest_logs') harvestLogs!: any;
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

export class DataSharingConsentModel extends Model {
    static table = 'data_sharing_consents';
    @text('farmer_id') farmerId!: string;
    @text('partner_tenant_id') partnerTenantId!: string;
    @text('data_types_json') dataTypesJson!: string;
    @field('is_active') isActive!: boolean;
    @text('granted_at') grantedAt!: string;
    @text('expires_at') expiresAt!: string;
}

export class CreditLedgerEntryModel extends Model {
    static table = 'credit_ledger';
    @text('tenant_id') tenantId!: string;
    @text('transaction_type') transactionType!: string;
    @field('amount') amount!: number;
    @text('service_event_id') serviceEventId!: string;
    @readonly @date('created_at') createdAt!: Date;
}

export class ServiceConsumptionLogModel extends Model {
    static table = 'service_consumption_logs';
    @text('tenant_id') tenantId!: string;
    @text('service_name') serviceName!: string;
    @field('credit_cost') creditCost!: number;
    @text('metadata_json') metadataJson!: string;
    @readonly @date('created_at') createdAt!: Date;
}

export class FreeTierUsageModel extends Model {
    static table = 'free_tier_usages';
    @text('tenant_id') tenantId!: string;
    @text('service_name') serviceName!: string;
    @text('period') period!: string;
    @field('usage_count') usageCount!: number;
}

export class ServicePointModel extends Model {
    static table = 'service_points';
    @text('name') name!: string;
    @text('location') location!: string;
    @text('service_type') serviceType!: string;
    @text('tenant_id') tenantId!: string;
}

export class OfficerScheduleModel extends Model {
    static table = 'officer_schedules';
    @text('user_id') userId!: string;
    @text('date') date!: string;
    @text('availability_json') availabilityJson!: string;
}

export class CollectionAppointmentModel extends Model {
    static table = 'collection_appointments';
    @text('farmer_id') farmerId!: string;
    @text('service_point_id') servicePointId!: string;
    @text('start_time') startTime!: string;
    @text('end_time') endTime!: string;
    @text('status') status!: string;
    @text('sync_status') syncStatus!: string;
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
    @text('sync_status') syncStatus!: string;
}

export class ProcessingBatchModel extends Model {
    static table = 'processing_batches';
    @text('batch_code') batchCode!: string;
    @text('harvest_id') harvestId!: string;
    @text('start_date') startDate!: string;
    @text('status') status!: string;
    @text('notes') notes!: string;
    @text('tenant_id') tenantId!: string;
    @text('sync_status') syncStatus!: string;
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
    @text('sync_status') syncStatus!: string;
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
    @text('sync_status') syncStatus!: string;
}

export class ProtectionClaimModel extends Model {
    static table = 'protection_claims';
    @text('subscription_id') subscriptionId!: string;
    @text('incident_date') incidentDate!: string;
    @text('trigger_type') triggerType!: string;
    @text('status') status!: string;
    @field('payout_amount') payoutAmount!: number;
    @text('notes') notes!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('sync_status') syncStatus!: string;
}

export class FamilyUnitModel extends Model {
    static table = 'family_units';
    @text('head_farmer_id') headFarmerId!: string;
    @field('member_count') memberCount!: number;
}

export class LegacyProfileModel extends Model {
    static table = 'legacy_profiles';
    @text('family_unit_id') familyUnitId!: string;
    @text('name') name!: string;
    @text('relationship') relationship!: string;
    @text('education_level') educationLevel!: string;
    @text('current_occupation') currentOccupation!: string;
    @field('needs_scholarship') needsScholarship!: boolean;
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
    @text('sync_status') syncStatus!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}

export class LandValuationHistoryModel extends Model {
    static table = 'land_valuation_history';
    @text('listing_id') listingId!: string;
    @field('score') score!: number;
    @readonly @date('calculated_at') calculatedAt!: Date;
    @text('factors_json') factorsJson!: string;
    @text('sync_status') syncStatus!: string;
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

export class DealerInventorySignalModel extends Model {
  static table = 'dealer_inventory_signals';
  @text('dealer_id') dealerId!: string;
  @text('product_id') productId!: string;
  @field('is_available') isAvailable!: boolean;
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
  @text('status') status!: string;
  @readonly @date('created_at') createdAt!: Date;
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
    @text('action_type') actionType!: string;
    @text('title') title!: string;
    @text('description') description!: string;
    @text('reasoning') reasoning!: string;
    @text('priority') priority!: string;
    @text('status') status!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('tenant_id') tenantId!: string;
}

export class DealerInsightsModel extends Model {
  static table = 'dealer_insights';
  @text('dealer_id') dealerId!: string;
  @text('metric_key') metricKey!: string;
  @field('metric_value') metricValue!: number;
  @field('generated_at') generatedAt!: number;
}

export class MarketTrendsModel extends Model {
  static table = 'market_trends';
  @text('region_code') regionCode!: string;
  @text('trend_type') trendType!: string;
  @text('payload_json') payloadJson!: string;
  @field('valid_until') validUntil!: number;
}

export class ClimateRiskCacheModel extends Model {
    static table = 'climate_risk_cache';
    @text('region_code') regionCode!: string;
    @text('date') date!: string;
    @field('temperature_max') temperatureMax!: number;
    @field('rainfall_mm') rainfallMm!: number;
    @field('ndvi_index') ndviIndex!: number;
    @field('risk_score') riskScore!: number;
    @text('metadata_json') metadataJson!: string;
    @readonly @date('created_at') createdAt!: Date;
}

export class SustainabilityActionModel extends Model {
    static table = 'sustainability_actions';
    @text('farmer_id') farmerId!: string;
    @text('action_type') actionType!: string;
    @text('status') status!: string;
    @text('verification_photo_url') verificationPhotoUrl!: string;
    @text('geo_coords') geoCoords!: string;
    @field('submitted_at') submittedAt!: number;
    @field('verified_at') verifiedAt!: number;
}

export class SustainabilityCredentialModel extends Model {
    static table = 'sustainability_credentials';
    @text('farmer_id') farmerId!: string;
    @text('grade') grade!: string;
    @field('issued_at') issuedAt!: number;
    @field('valid_until') validUntil!: number;
    @text('hash') hash!: string;
    @text('metadata_json') metadataJson!: string;
}

export class SeedVarietyModel extends Model {
    static table = 'seed_varieties';
    @text('name') name!: string;
    @text('scientific_name') scientificName?: string;
    @text('seed_type') seedType!: string;
    @text('breeder_id') breederId?: string;
    @field('days_to_maturity') daysToMaturity!: number;
    @field('is_seed_saving_allowed') isSeedSavingAllowed!: boolean;
    @text('water_requirement') waterRequirement!: string;
    @field('potential_yield') potentialYield!: number;
    @text('description') description!: string;
    @text('image_url') imageUrl?: string;
    @text('tenant_id') tenantId?: string;
    @readonly @date('created_at') createdAt!: Date;
}

export class SeedPerformanceLogModel extends Model {
    static table = 'seed_performance_logs';
    static associations = {
        seed_varieties: { type: 'belongs_to', key: 'seed_variety_id' },
        farm_plots: { type: 'belongs_to', key: 'farm_plot_id' },
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;

    @text('seed_variety_id') seedVarietyId!: string;
    @text('farm_plot_id') farmPlotId!: string;
    @text('farmer_id') farmerId!: string;
    @text('season') season!: string;
    @field('year') year!: number;
    @field('yield_per_acre') yieldPerAcre!: number;
    @field('disease_resistance_score') diseaseResistanceScore!: number;
    @field('drought_survival_score') droughtSurvivalScore!: number;
    @text('notes') notes?: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('tenant_id') tenantId!: string;
    
    @relation('seed_varieties', 'seed_variety_id') seedVariety!: any;
    @relation('farm_plots', 'farm_plot_id') farmPlot!: any;
    @relation('farmers', 'farmer_id') farmer!: any;
}

export class CommodityListingModel extends Model {
    static table = 'commodity_listings';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
        farm_plots: { type: 'belongs_to', key: 'farm_plot_id' },
        commodity_bids: { type: 'has_many', foreignKey: 'listing_id' },
    } as const;

    @text('farmer_id') farmerId!: string;
    @text('crop_name') cropName!: string;
    @text('variety') variety?: string;
    @field('quantity') quantity!: number;
    @text('unit') unit!: string;
    @text('quality_grade') qualityGrade?: string;
    @text('harvest_date') harvestDate?: string;
    @field('ask_price') askPrice!: number;
    @field('min_acceptable_price') minAcceptablePrice?: number;
    @text('status') status!: string;
    @text('farm_plot_id') farmPlotId?: string;
    @text('tenant_id') tenantId!: string;
    @readonly @date('created_at') createdAt!: Date;

    @relation('farmers', 'farmer_id') farmer!: any;
    @relation('farm_plots', 'farm_plot_id') farmPlot!: any;
    @children('commodity_bids') bids!: any;
}

export class CommodityBidModel extends Model {
    static table = 'commodity_bids';
    static associations = {
        commodity_listings: { type: 'belongs_to', key: 'listing_id' },
    } as const;

    @text('listing_id') listingId!: string;
    @text('buyer_id') buyerId!: string;
    @field('offer_price') offerPrice!: number;
    @text('status') status!: string;
    @field('is_binding') isBinding!: boolean;

    @relation('commodity_listings', 'listing_id') listing!: any;
}

export class MarketPriceModel extends Model {
    static table = 'market_prices';
    @text('region_code') regionCode!: string;
    @text('commodity') commodity!: string;
    @text('date') date!: string;
    @field('min_price') minPrice!: number;
    @field('max_price') maxPrice!: number;
    @field('modal_price') modalPrice!: number;
    @text('source') source!: string;
}

export class LeadModel extends Model {
    static table = 'leads';
    @text('farmer_id') farmerId!: string;
    @text('vendor_id') vendorId!: string;
    @text('service_category') serviceCategory!: string;
    @text('status') status!: string;
    @text('notes') notes?: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('tenant_id') tenantId!: string;
}

const adapter = new SQLiteAdapter({
  schema,
});

const database = new Database({
  adapter,
  modelClasses: [
    FarmerModel, FarmPlotModel, SubsidyPaymentModel, ActivityLogModel, UserModel, GroupModel, TenantModel, DistrictModel, MandalModel, VillageModel, ResourceModel, ResourceDistributionModel, CustomFieldDefinitionModel, TaskModel, PlantingRecordModel, HarvestModel, QualityAssessmentModel, QualityMetricModel, UserProfileModel, MentorshipModel, AssistanceApplicationModel, EquipmentModel, EquipmentMaintenanceLogModel, WithdrawalAccountModel, TrainingModuleModel, TrainingCompletionModel, EventModel, EventRsvpModel, TerritoryModel, TerritoryTransferRequestModel, TerritoryDisputeModel, FarmerDealerConsentModel, ForumPostModel, ForumAnswerModel, ForumAnswerVoteModel, ForumContentFlagModel, AgronomicAlertModel, WalletModel, WalletTransactionModel, VisitRequestModel, DirectiveModel, DirectiveAssignmentModel, ProductCategoryModel, ProductModel, VendorModel, VendorProductModel, OrderModel, OrderItemModel, CropModel, CropAssignmentModel, HarvestLogModel, DataSharingConsentModel, CreditLedgerEntryModel, ServiceConsumptionLogModel, FreeTierUsageModel, ServicePointModel, OfficerScheduleModel, CollectionAppointmentModel, AgronomicInputModel, ProcessingBatchModel, ProcessingStepModel, ProtectionProductModel, ProtectionSubscriptionModel, ProtectionClaimModel, FamilyUnitModel, LegacyProfileModel, LandListingModel, LandValuationHistoryModel, EquipmentLeaseModel, ManualLedgerEntryModel, DealerModel, DealerInventorySignalModel, KhataRecordModel, DealerFarmerConnectionModel, AgronomicRecommendationModel, DealerInsightsModel, MarketTrendsModel, ClimateRiskCacheModel, SustainabilityActionModel, SustainabilityCredentialModel,
    SeedVarietyModel, SeedPerformanceLogModel, CommodityListingModel, CommodityBidModel, MarketPriceModel, LeadModel
  ],
});

export default database;
