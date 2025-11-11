import { appSchema, tableSchema } from '@nozbe/watermelondb/Schema';
import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';
// FIX: Import 'Query' type for defining relations.
import { Model, Q, Query } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation, children, writer, lazy } from '@nozbe/watermelondb/decorators';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { Database } from '@nozbe/watermelondb';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
// @FIX: Imported 'PaymentStage' to resolve 'Cannot find name' error.
import { FarmerStatus, PlantType, PlantationMethod, OverallGrade, AppealStatus, TaskStatus, TaskPriority, ProcessingStatus, AssistanceApplicationStatus, PaymentStage, ActivityType, SustainabilityTier, VendorStatus, OrderStatus } from '../types';

// Use a simple, non-secure random ID generator for this offline-first app
setGenerator(() => Math.random().toString(36).substring(2));

const schema = appSchema({
  version: 25,
  tables: [
    tableSchema({
      name: 'farmers',
      columns: [
        { name: 'full_name', type: 'string' },
        { name: 'father_husband_name', type: 'string' },
        { name: 'aadhaar_number', type: 'string', isIndexed: true },
        { name: 'mobile_number', type: 'string' },
        { name: 'gender', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'ppb_rofr_id', type: 'string', isOptional: true },
        { name: 'photo', type: 'string', isOptional: true },
        { name: 'bank_account_number', type: 'string' },
        { name: 'ifsc_code', type: 'string' },
        { name: 'account_verified', type: 'boolean' },
        { name: 'applied_extent', type: 'number' },
        { name: 'approved_extent', type: 'number' },
        { name: 'number_of_plants', type: 'number' },
        { name: 'method_of_plantation', type: 'string' },
        { name: 'plant_type', type: 'string' },
        { name: 'plantation_date', type: 'string', isOptional: true },
        { name: 'mlrd_plants', type: 'number' },
        { name: 'full_cost_plants', type: 'number' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'hap_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'gov_application_id', type: 'string', isOptional: true },
        { name: 'gov_farmer_id', type: 'string', isOptional: true },
        { name: 'proposed_year', type: 'string' },
        { name: 'registration_date', type: 'string' },
        { name: 'aso_id', type: 'string' },
        { name: 'payment_utr_dd', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'district', type: 'string' },
        { name: 'mandal', type: 'string' },
        { name: 'village', type: 'string' },
        { name: 'syncStatus', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'updated_by', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'is_in_ne_region', type: 'boolean', isOptional: true },
        { name: 'primary_crop', type: 'string', isOptional: true },
      ],
    }),
     tableSchema({
      name: 'plots',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'acreage', type: 'number' },
        { name: 'soil_type', type: 'string', isOptional: true },
        { name: 'plantation_date', type: 'string', isOptional: true },
        { name: 'number_of_plants', type: 'number' },
        { name: 'method_of_plantation', type: 'string' },
        { name: 'plant_type', type: 'string' },
        { name: 'mlrd_plants', type: 'number' },
        { name: 'full_cost_plants', type: 'number' },
        { name: 'geojson', type: 'string', isOptional: true },
        { name: 'syncStatus', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'is_replanting', type: 'boolean', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'planting_records',
      columns: [
        { name: 'plot_id', type: 'string', isIndexed: true },
        { name: 'seed_source', type: 'string' },
        { name: 'planting_date', type: 'string' },
        { name: 'genetic_variety', type: 'string' },
        { name: 'care_instructions_url', type: 'string', isOptional: true },
        { name: 'number_of_plants', type: 'number' },
        { name: 'qr_code_data', type: 'string', isOptional: true },
        { name: 'syncStatus', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ]
    }),
    tableSchema({
      name: 'users',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'avatar', type: 'string' },
        { name: 'group_id', type: 'string', isIndexed: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'groups',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'permissions', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
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
        { name: 'syncStatus', type: 'string' },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
        name: 'activity_logs',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'activity_type', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'created_by', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
     tableSchema({
        name: 'tenants',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'subscription_status', type: 'string' },
            { name: 'created_at', type: 'number' },
        ]
    }),
    tableSchema({
        name: 'resources',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'unit', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
            { name: 'cost', type: 'number', isOptional: true },
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
            { name: 'created_at', type: 'number' },
            { name: 'syncStatus', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
     tableSchema({
      name: 'districts',
      columns: [
        { name: 'code', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'mandals',
      columns: [
        { name: 'district_id', type: 'string', isIndexed: true },
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'villages',
      columns: [
        { name: 'mandal_id', type: 'string', isIndexed: true },
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
      ],
    }),
    tableSchema({
        name: 'custom_field_definitions',
        columns: [
            { name: 'model_name', type: 'string' },
            { name: 'field_name', type: 'string' },
            { name: 'field_label', type: 'string' },
            { name: 'field_type', type: 'string' },
            { name: 'options', type: 'string', isOptional: true },
            { name: 'is_required', type: 'boolean' },
            { name: 'sort_order', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
     tableSchema({
        name: 'assistance_applications',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'scheme_id', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'syncStatus', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
        name: 'tasks',
        columns: [
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'priority', type: 'string' },
            { name: 'due_date', type: 'string', isOptional: true },
            { name: 'assignee_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'farmer_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'created_by', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'syncStatus', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
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
        { name: 'created_at', type: 'number' },
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'quality_assessments',
      columns: [
        { name: 'harvest_id', type: 'string', isIndexed: true },
        { name: 'assessment_date', type: 'string' },
        { name: 'overall_grade', type: 'string' },
        { name: 'price_adjustment', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'appeal_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'quality_metrics',
      columns: [
        { name: 'assessment_id', type: 'string', isIndexed: true },
        { name: 'metric_name', type: 'string' },
        { name: 'metric_value', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'quality_standards',
      columns: [
        { name: 'metric_name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'measurement_unit', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'processing_batches',
      columns: [
        { name: 'harvest_id', type: 'string', isIndexed: true },
        { name: 'batch_code', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'processing_steps',
      columns: [
        { name: 'batch_id', type: 'string', isIndexed: true },
        { name: 'step_name', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string', isOptional: true },
        { name: 'parameters', type: 'string' }, // JSON
        { name: 'operator_id', type: 'string' },
        { name: 'equipment_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
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
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'equipment_maintenance_logs',
      columns: [
        { name: 'equipment_id', type: 'string', isIndexed: true },
        { name: 'maintenance_date', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'performed_by_id', type: 'string' },
        { name: 'cost', type: 'number' },
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
     tableSchema({
        name: 'manual_ledger_entries',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'entry_date', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'category', type: 'string' }, // 'Income' or 'Expense'
            { name: 'amount', type: 'number' },
            { name: 'entry_source', type: 'string' },
            { name: 'syncStatus', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    tableSchema({
      name: 'equipment_leases',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'equipment_id', type: 'string', isIndexed: true },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string' },
        { name: 'total_cost', type: 'number' },
        { name: 'payment_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'sustainability_practices',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'tier', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'sustainability_verifications',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'practice_id', type: 'string', isIndexed: true },
        { name: 'officer_id', type: 'string', isIndexed: true },
        { name: 'verification_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'evidence_url', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'farm_inputs',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'input_type', type: 'string' },
        { name: 'date', type: 'string' },
        { name: 'cost', type: 'number' },
        { name: 'quantity', type: 'number' },
        { name: 'unit', type: 'string' },
      ],
    }),
    // --- MARKETPLACE TABLES ---
    tableSchema({
      name: 'vendors',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'contact_person', type: 'string' },
        { name: 'mobile_number', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'rating', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
        name: 'product_categories',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'icon_svg', type: 'string', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ],
    }),
    tableSchema({
        name: 'products',
        columns: [
            { name: 'name', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'image_url', type: 'string', isOptional: true },
            { name: 'category_id', type: 'string', isIndexed: true },
            { name: 'is_quality_verified', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ],
    }),
    tableSchema({
        name: 'vendor_products',
        columns: [
            { name: 'vendor_id', type: 'string', isIndexed: true },
            { name: 'product_id', type: 'string', isIndexed: true },
            { name: 'price', type: 'number' },
            { name: 'stock_quantity', type: 'number' },
            { name: 'unit', type: 'string' },
            { name: 'updated_at', type: 'number' },
        ],
    }),
    tableSchema({
        name: 'orders',
        columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'order_date', type: 'string' },
            { name: 'status', type: 'string', isIndexed: true },
            { name: 'total_amount', type: 'number' },
            { name: 'payment_method', type: 'string' },
            { name: 'payment_transaction_id', type: 'string', isOptional: true },
            { name: 'delivery_address', type: 'string' },
            { name: 'delivery_instructions', type: 'string', isOptional: true },
            { name: 'logistics_partner_id', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ],
    }),
    tableSchema({
        name: 'order_items',
        columns: [
            { name: 'order_id', type: 'string', isIndexed: true },
            { name: 'vendor_product_id', type: 'string', isIndexed: true },
            { name: 'quantity', type: 'number' },
            { name: 'price_per_unit', type: 'number' },
        ],
    }),
    tableSchema({
        name: 'dispute_tickets',
        columns: [
            { name: 'order_id', type: 'string', isIndexed: true },
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'reason', type: 'string' },
            { name: 'status', type: 'string', isIndexed: true },
            { name: 'resolution_notes', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'resolved_at', type: 'number', isOptional: true },
            { name: 'tenant_id', type: 'string', isIndexed: true },
        ]
    }),
    // --- TRAINING TABLES ---
    tableSchema({
      name: 'training_modules',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'module_type', type: 'string' }, // 'video' | 'article'
        { name: 'content', type: 'string' }, // URL or markdown
        { name: 'duration_minutes', type: 'number', isOptional: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'training_completions',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'module_id', type: 'string', isIndexed: true },
        { name: 'completed_at', type: 'number' },
        { name: 'completed_by_user_id', type: 'string', isOptional: true },
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
  ],
});


const migrations = schemaMigrations({
  migrations: [
     {
      toVersion: 22,
      steps: [
        addColumns({
          table: 'farmers',
          columns: [
            { name: 'hap_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'gov_application_id', type: 'string', isOptional: true },
            { name: 'gov_farmer_id', type: 'string', isOptional: true },
            { name: 'primary_crop', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 23,
      steps: [
        createTable({
            name: 'vendors',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'contact_person', type: 'string' },
                { name: 'mobile_number', type: 'string' },
                { name: 'address', type: 'string' },
                { name: 'status', type: 'string', isIndexed: true },
                { name: 'rating', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'tenant_id', type: 'string', isIndexed: true },
            ],
        }),
        createTable({
            name: 'products',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'image_url', type: 'string', isOptional: true },
                { name: 'category', type: 'string' },
                { name: 'is_quality_verified', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'tenant_id', type: 'string', isIndexed: true },
            ],
        }),
        createTable({
            name: 'vendor_products',
            columns: [
                { name: 'vendor_id', type: 'string', isIndexed: true },
                { name: 'product_id', type: 'string', isIndexed: true },
                { name: 'price', type: 'number' },
                { name: 'stock_quantity', type: 'number' },
                { name: 'unit', type: 'string' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        createTable({
            name: 'orders',
            columns: [
                { name: 'farmer_id', type: 'string', isIndexed: true },
                { name: 'order_date', type: 'string' },
                { name: 'status', type: 'string', isIndexed: true },
                { name: 'total_amount', type: 'number' },
                { name: 'payment_method', type: 'string' },
                { name: 'delivery_address', type: 'string' },
                { name: 'logistics_partner_id', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'tenant_id', type: 'string', isIndexed: true },
            ],
        }),
        createTable({
            name: 'order_items',
            columns: [
                { name: 'order_id', type: 'string', isIndexed: true },
                { name: 'vendor_product_id', type: 'string', isIndexed: true },
                { name: 'quantity', type: 'number' },
                { name: 'price_per_unit', type: 'number' },
            ],
        }),
        createTable({
            name: 'dispute_tickets',
            columns: [
                { name: 'order_id', type: 'string', isIndexed: true },
                { name: 'farmer_id', type: 'string', isIndexed: true },
                { name: 'reason', type: 'string' },
                { name: 'status', type: 'string', isIndexed: true },
                { name: 'resolution_notes', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'resolved_at', type: 'number', isOptional: true },
                { name: 'tenant_id', type: 'string', isIndexed: true },
            ]
        }),
      ],
    },
    {
      toVersion: 24,
      steps: [
        createTable({
            name: 'product_categories',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'icon_svg', type: 'string', isOptional: true },
                { name: 'tenant_id', type: 'string', isIndexed: true },
            ],
        }),
        addColumns({
            table: 'products',
            columns: [
                { name: 'category_id', type: 'string', isIndexed: true },
            ],
        }),
        // Note: In a real migration, you'd handle renaming/dropping the old 'category' column.
        // For LokiJSAdapter, simply not defining it in the new schema effectively removes it.
        addColumns({
            table: 'orders',
            columns: [
                { name: 'payment_transaction_id', type: 'string', isOptional: true },
                { name: 'delivery_instructions', type: 'string', isOptional: true },
            ]
        })
      ],
    },
    {
        toVersion: 25,
        steps: [
            createTable({
                name: 'training_modules',
                columns: [
                    { name: 'title', type: 'string' },
                    { name: 'description', type: 'string' },
                    { name: 'module_type', type: 'string' },
                    { name: 'content', type: 'string' },
                    { name: 'duration_minutes', type: 'number', isOptional: true },
                    { name: 'tenant_id', type: 'string', isIndexed: true },
                    { name: 'created_at', type: 'number' },
                    { name: 'updated_at', type: 'number' },
                ],
            }),
            createTable({
                name: 'training_completions',
                columns: [
                    { name: 'farmer_id', type: 'string', isIndexed: true },
                    { name: 'module_id', type: 'string', isIndexed: true },
                    { name: 'completed_at', type: 'number' },
                    { name: 'completed_by_user_id', type: 'string', isOptional: true },
                    { name: 'syncStatus', type: 'string' },
                    { name: 'tenant_id', type: 'string', isIndexed: true },
                ],
            }),
        ],
    }
  ],
});


// --- MODELS ---

class BaseModel extends Model {
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export class FarmerModel extends Model {
  static table = 'farmers';
  
  @text('full_name') fullName!: string;
  @text('father_husband_name') fatherHusbandName!: string;
  @text('aadhaar_number') aadhaarNumber!: string;
  @text('mobile_number') mobileNumber!: string;
  @text('gender') gender!: string;
  @text('address') address!: string;
  @text('ppb_rofr_id') ppbRofrId?: string;
  @text('photo') photo?: string;
  @text('bank_account_number') bankAccountNumber!: string;
  @text('ifsc_code') ifscCode!: string;
  @field('account_verified') accountVerified!: boolean;
  @field('applied_extent') appliedExtent!: number;
  @field('approved_extent') approvedExtent!: number;
  @field('number_of_plants') numberOfPlants!: number;
  @text('method_of_plantation') methodOfPlantation!: PlantationMethod;
  @text('plant_type') plantType!: PlantType;
  @text('plantation_date') plantationDate?: string;
  @field('mlrd_plants') mlrdPlants!: number;
  @field('full_cost_plants') fullCostPlants!: number;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @text('hap_id') hapId?: string;
  @text('gov_application_id') govApplicationId?: string;
  @text('gov_farmer_id') govFarmerId?: string;
  @text('proposed_year') proposedYear!: string;
  @text('registration_date') registrationDate!: string;
  @text('aso_id') asoId!: string;
  @text('payment_utr_dd') paymentUtrDd!: string;
  @text('status') status!: FarmerStatus;
  @text('district') district!: string;
  @text('mandal') mandal!: string;
  @text('village') village!: string;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending' | 'pending_delete';
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @text('created_by') createdBy?: string;
  @text('updated_by') updatedBy?: string;
  @text('tenant_id') tenantId!: string;
  @field('is_in_ne_region') isInNeRegion?: boolean;
  @text('primary_crop') primaryCrop?: string;

  @children('plots') plots!: Query<PlotModel>;
  @children('subsidy_payments') subsidyPayments!: Query<SubsidyPaymentModel>;
  @children('activity_logs') activityLogs!: Query<ActivityLogModel>;
  @children('resource_distributions') resourceDistributions!: Query<ResourceDistributionModel>;
  @children('assistance_applications') assistanceApplications!: Query<AssistanceApplicationModel>;
  @children('tasks') tasks!: Query<TaskModel>;
  @children('harvests') harvests!: Query<HarvestModel>;
  @children('manual_ledger_entries') manualLedgerEntries!: Query<ManualLedgerEntryModel>;
  @children('equipment_leases') equipmentLeases!: Query<EquipmentLeaseModel>;
  @children('sustainability_verifications') sustainabilityVerifications!: Query<SustainabilityVerificationModel>;
  @children('farm_inputs') farmInputs!: Query<FarmInputModel>;
  @children('orders') orders!: Query<OrderModel>;
  @children('training_completions') trainingCompletions!: Query<TrainingCompletionModel>;
}

export class PlotModel extends Model {
    static table = 'plots';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;
    @relation('farmers', 'farmer_id') farmer!: any;
    @field('acreage') acreage!: number;
    @text('soil_type') soilType?: string;
    @text('plantation_date') plantationDate?: string;
    @field('number_of_plants') numberOfPlants!: number;
    @text('method_of_plantation') methodOfPlantation!: PlantationMethod;
    @text('plant_type') plantType!: PlantType;
    @field('mlrd_plants') mlrdPlants!: number;
    @field('full_cost_plants') fullCostPlants!: number;
    @text('geojson') geojson?: string;
    @field('is_replanting') isReplanting?: boolean;
    @children('planting_records') plantingRecords!: Query<PlantingRecordModel>;
}

export class PlantingRecordModel extends Model {
    static table = 'planting_records';
    static associations = {
        plots: { type: 'belongs_to', key: 'plot_id' },
    } as const;
    @relation('plots', 'plot_id') plot!: any;
    @text('seed_source') seedSource!: string;
    @text('planting_date') plantingDate!: string;
    @text('genetic_variety') geneticVariety!: string;
    @text('care_instructions_url') careInstructionsUrl?: string;
    @field('number_of_plants') numberOfPlants!: number;
    @text('qr_code_data') qrCodeData?: string;
}

export class UserModel extends Model {
  static table = 'users';
  @text('name') name!: string;
  @text('avatar') avatar!: string;
  @text('group_id') groupId!: string;
  @text('tenant_id') tenantId!: string;
}

export class GroupModel extends Model {
  static table = 'groups';
  @text('name') name!: string;
  @text('permissions') permissionsStr!: string; // Stored as JSON string
  get permissions() {
      return JSON.parse(this.permissionsStr);
  }
  @text('tenant_id') tenantId!: string;
}

export class SubsidyPaymentModel extends Model {
  static table = 'subsidy_payments';
  static associations = {
    farmers: { type: 'belongs_to', key: 'farmer_id' },
  } as const;

  @relation('farmers', 'farmer_id') farmer!: any;
  // @FIX: Added missing 'farmerId' field to match the schema and fix type errors.
  @text('farmer_id') farmerId!: string;
  @text('payment_date') paymentDate!: string;
  @field('amount') amount!: number;
  @text('utr_number') utrNumber!: string;
  @text('payment_stage') paymentStage!: PaymentStage;
  @text('notes') notes?: string;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('created_by') createdBy?: string;
  @text('tenant_id') tenantId!: string;
  @readonly @date('created_at') createdAt!: Date;
}

export class ActivityLogModel extends Model {
    static table = 'activity_logs';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('farmer_id') farmerId!: string;
    @text('activity_type') activityType!: ActivityType;
    @text('description') description!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
}

export class TenantModel extends Model {
    static table = 'tenants';
    @text('name') name!: string;
    @text('subscription_status') subscriptionStatus!: 'active' | 'trial' | 'inactive';
    @readonly @date('created_at') createdAt!: Date;

    // FIX: Renamed lambda parameter from 'record' to 'rec' to avoid potential naming conflicts that could confuse TypeScript's type inference.
    @writer async updateSubscriptionStatus(newStatus: 'active' | 'trial' | 'inactive') {
        await this.update(rec => {
            rec.subscriptionStatus = newStatus;
        });
    }
}

export class ResourceModel extends Model {
    static table = 'resources';
    @text('name') name!: string;
    @text('unit') unit!: string;
    @text('description') description?: string;
    @text('tenant_id') tenantId!: string;
    @field('cost') cost?: number;
}

export class ResourceDistributionModel extends Model {
    static table = 'resource_distributions';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('farmer_id') farmerId!: string;
    @text('resource_id') resourceId!: string;
    @field('quantity') quantity!: number;
    @text('distribution_date') distributionDate!: string;
    @text('notes') notes?: string;
    @text('created_by') createdBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
}

export class DistrictModel extends Model {
    static table = 'districts';
    @text('code') code!: string;
    @text('name') name!: string;
    @children('mandals') mandals!: Query<MandalModel>;
}

export class MandalModel extends Model {
    static table = 'mandals';
    static associations = {
        districts: { type: 'belongs_to', key: 'district_id' },
    } as const;
    @relation('districts', 'district_id') district!: any;
    @text('code') code!: string;
    @text('name') name!: string;
    @text('district_id') districtId!: string;
    @children('villages') villages!: Query<VillageModel>;
}

export class VillageModel extends Model {
    static table = 'villages';
     static associations = {
        mandals: { type: 'belongs_to', key: 'mandal_id' },
    } as const;
    @relation('mandals', 'mandal_id') mandal!: any;
    @text('code') code!: string;
    @text('name') name!: string;
    @text('mandal_id') mandalId!: string;
}

export class CustomFieldDefinitionModel extends Model {
    static table = 'custom_field_definitions';
    @text('model_name') modelName!: 'farmer';
    @text('field_name') fieldName!: string;
    @text('field_label') fieldLabel!: string;
    @text('field_type') fieldType!: string;
    @text('options') optionsJson?: string;
    get options(): string[] { return this.optionsJson ? JSON.parse(this.optionsJson) : []; }
    @field('is_required') isRequired!: boolean;
    @field('sort_order') sortOrder!: number;
    @text('tenant_id') tenantId!: string;
}

export class AssistanceApplicationModel extends Model {
    static table = 'assistance_applications';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('farmer_id') farmerId!: string;
    @text('scheme_id') schemeId!: string;
    @text('status') status!: AssistanceApplicationStatus;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @readonly @date('created_at') createdAt!: Date;
    @date('updated_at') updatedAt!: Date;
    @text('tenant_id') tenantId!: string;
}

export class TaskModel extends Model {
    static table = 'tasks';
    @text('title') title!: string;
    @text('description') description?: string;
    @text('status') status!: TaskStatus;
    @text('priority') priority!: TaskPriority;
    @text('due_date') dueDate?: string;
    @text('assignee_id') assigneeId?: string;
    @text('farmer_id') farmerId?: string;
    @text('created_by') createdBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @date('updated_at') updatedAt!: Date;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
}

export class HarvestModel extends Model {
    static table = 'harvests';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('farmer_id') farmerId!: string;
    @text('harvest_date') harvestDate!: string;
    @field('gross_weight') grossWeight!: number;
    @field('tare_weight') tareWeight!: number;
    @field('net_weight') netWeight!: number;
    @text('assessed_by_id') assessedById!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
    @children('quality_assessments') qualityAssessments!: Query<QualityAssessmentModel>;
}

export class QualityAssessmentModel extends Model {
    static table = 'quality_assessments';
    static associations = {
        harvests: { type: 'belongs_to', key: 'harvest_id' },
    } as const;
    @relation('harvests', 'harvest_id') harvest!: any;
    @text('harvest_id') harvestId!: string;
    @text('assessment_date') assessmentDate!: string;
    @text('overall_grade') overallGrade!: OverallGrade;
    @field('price_adjustment') priceAdjustment!: number;
    @text('notes') notes?: string;
    @text('appeal_status') appealStatus!: AppealStatus;
    @readonly @date('created_at') createdAt!: Date;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
}

export class QualityMetricModel extends Model {
    static table = 'quality_metrics';
    @text('assessment_id') assessmentId!: string;
    @text('metric_name') metricName!: string;
    @text('metric_value') metricValue!: string;
}

export class QualityStandardModel extends Model {
    static table = 'quality_standards';
    @text('metric_name') metricName!: string;
    @text('description') description!: string;
    @text('measurement_unit') measurementUnit!: string;
    @text('tenant_id') tenantId!: string;
}

export class ProcessingBatchModel extends Model {
    static table = 'processing_batches';
    @text('harvest_id') harvestId!: string;
    @text('batch_code') batchCode!: string;
    @text('start_date') startDate!: string;
    @text('end_date') endDate?: string;
    @text('status') status!: ProcessingStatus;
    @text('notes') notes?: string;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
}

export class ProcessingStepModel extends Model {
    static table = 'processing_steps';
    @text('batch_id') batchId!: string;
    @text('step_name') stepName!: string;
    @text('start_date') startDate!: string;
    @text('end_date') endDate?: string;
    @text('parameters') parameters!: string; // JSON
    @text('operator_id') operatorId!: string;
    @text('equipment_id') equipmentId?: string;
    @text('notes') notes?: string;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
}

export class EquipmentModel extends Model {
    static table = 'equipment';
    @text('name') name!: string;
    @text('type') type!: string;
    @text('location') location!: string;
    @text('status') status!: 'operational' | 'maintenance' | 'decommissioned';
    @text('last_maintenance_date') lastMaintenanceDate?: string;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
}

export class EquipmentMaintenanceLogModel extends Model {
    static table = 'equipment_maintenance_logs';
    @text('equipment_id') equipmentId!: string;
    @text('maintenance_date') maintenanceDate!: string;
    @text('description') description!: string;
    @text('performed_by_id') performedById!: string;
    @field('cost') cost!: number;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
}


export class ManualLedgerEntryModel extends Model {
    static table = 'manual_ledger_entries';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('farmer_id') farmerId!: string;
    @text('entry_date') entryDate!: string;
    @text('description') description!: string;
    @text('category') category!: 'Income' | 'Expense';
    @field('amount') amount!: number;
    @text('entry_source') entrySource!: string;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @readonly @date('created_at') createdAt!: Date;
    @date('updated_at') updatedAt!: Date;
    @text('tenant_id') tenantId!: string;
}

export class EquipmentLeaseModel extends Model {
    static table = 'equipment_leases';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('farmer_id') farmerId!: string;
    @text('equipment_id') equipmentId!: string;
    @text('start_date') startDate!: string;
    @text('end_date') endDate!: string;
    @field('total_cost') totalCost!: number;
    @text('payment_status') paymentStatus!: 'Pending' | 'Paid';
    @readonly @date('created_at') createdAt!: Date;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
}

export class SustainabilityPracticeModel extends Model {
    static table = 'sustainability_practices';
    @text('name') name!: string;
    @text('description') description!: string;
    @text('category') category!: 'Water Management' | 'Soil Health' | 'Pest Management' | 'Biodiversity';
    @text('tier') tier!: SustainabilityTier;
}

export class SustainabilityVerificationModel extends Model {
    static table = 'sustainability_verifications';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
        sustainability_practices: { type: 'belongs_to', key: 'practice_id' },
    } as const;
    @relation('farmers', 'farmer_id') farmer!: any;
    @relation('sustainability_practices', 'practice_id') practice!: any;
    @text('farmer_id') farmerId!: string;
    @text('practice_id') practiceId!: string;
    @text('officer_id') officerId!: string;
    @text('verification_date') verificationDate!: string;
    @text('status') status!: 'Verified' | 'Pending' | 'Rejected' | 'Under Review';
    @text('notes') notes?: string;
    @text('evidence_url') evidenceUrl?: string;
    @readonly @date('created_at') createdAt!: Date;
}

export class FarmInputModel extends Model {
    static table = 'farm_inputs';
    static associations = {
        farmers: { type: 'belongs_to', key: 'farmer_id' },
    } as const;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('farmer_id') farmerId!: string;
    @text('input_type') inputType!: 'Fertilizer' | 'Pesticide' | 'Water' | 'Labor' | 'Other';
    @text('date') date!: string;
    @field('cost') cost!: number;
    @field('quantity') quantity!: number;
    @text('unit') unit!: string;
}

// --- MARKETPLACE MODELS ---

export class VendorModel extends Model {
  static table = 'vendors';
  @text('name') name!: string;
  @text('contact_person') contactPerson!: string;
  @text('mobile_number') mobileNumber!: string;
  @text('address') address!: string;
  @text('status') status!: VendorStatus;
  @field('rating') rating!: number;
  @readonly @date('created_at') createdAt!: Date;
  @text('tenant_id') tenantId!: string;
}

export class ProductCategoryModel extends Model {
  static table = 'product_categories';
  @text('name') name!: string;
  @text('icon_svg') iconSvg?: string;
  @text('tenant_id') tenantId!: string;
  @children('products') products!: Query<ProductModel>;
}

export class ProductModel extends Model {
  static table = 'products';
  static associations = {
    product_categories: { type: 'belongs_to', key: 'category_id' },
  } as const;
  @text('name') name!: string;
  @text('description') description!: string;
  @text('image_url') imageUrl?: string;
  @text('category_id') categoryId!: string;
  @relation('product_categories', 'category_id') category!: any;
  @field('is_quality_verified') isQualityVerified!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @text('tenant_id') tenantId!: string;
}

export class VendorProductModel extends Model {
  static table = 'vendor_products';
  @text('vendor_id') vendorId!: string;
  @text('product_id') productId!: string;
  @field('price') price!: number;
  @field('stock_quantity') stockQuantity!: number;
  @text('unit') unit!: string;
  @date('updated_at') updatedAt!: Date;
}

export class OrderModel extends Model {
  static table = 'orders';
  static associations = {
    farmers: { type: 'belongs_to', key: 'farmer_id' },
  } as const;
  @relation('farmers', 'farmer_id') farmer!: any;
  @text('farmer_id') farmerId!: string;
  @text('order_date') orderDate!: string;
  @text('status') status!: OrderStatus;
  @field('total_amount') totalAmount!: number;
  @text('payment_method') paymentMethod!: 'Cash' | 'Digital';
  @text('payment_transaction_id') paymentTransactionId?: string;
  @text('delivery_address') deliveryAddress!: string;
  @text('delivery_instructions') deliveryInstructions?: string;
  @text('logistics_partner_id') logisticsPartnerId?: string;
  @readonly @date('created_at') createdAt!: Date;
  @text('tenant_id') tenantId!: string;
  @children('order_items') items!: Query<OrderItemModel>;
}

export class OrderItemModel extends Model {
  static table = 'order_items';
  static associations = {
    orders: { type: 'belongs_to', key: 'order_id' },
  } as const;
  @text('order_id') orderId!: string;
  @text('vendor_product_id') vendorProductId!: string;
  @field('quantity') quantity!: number;
  @field('price_per_unit') pricePerUnit!: number;
}

// --- TRAINING MODELS ---

export class TrainingModuleModel extends Model {
  static table = 'training_modules';
  @text('title') title!: string;
  @text('description') description!: string;
  @text('module_type') moduleType!: 'video' | 'article';
  @text('content') content!: string;
  @field('duration_minutes') durationMinutes?: number;
  @text('tenant_id') tenantId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}

export class TrainingCompletionModel extends Model {
  static table = 'training_completions';
  static associations = {
    farmers: { type: 'belongs_to', key: 'farmer_id' },
    training_modules: { type: 'belongs_to', key: 'module_id' },
  } as const;

  @relation('farmers', 'farmer_id') farmer!: any;
  @relation('training_modules', 'module_id') module!: any;

  @text('farmer_id') farmerId!: string;
  @text('module_id') moduleId!: string;
  @date('completed_at') completedAt!: Date;
  @text('completed_by_user_id') completedByUserId?: string;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
}


// --- DATABASE SETUP ---

const adapter = new LokiJSAdapter({
  schema,
  migrations,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  dbName: 'hapsara-db',
});

const database = new Database({
  adapter,
  modelClasses: [
    FarmerModel,
    PlotModel,
    PlantingRecordModel,
    UserModel,
    GroupModel,
    SubsidyPaymentModel,
    ActivityLogModel,
    TenantModel,
    ResourceModel,
    ResourceDistributionModel,
    DistrictModel,
    MandalModel,
    VillageModel,
    CustomFieldDefinitionModel,
    AssistanceApplicationModel,
    TaskModel,
    HarvestModel,
    QualityAssessmentModel,
    QualityMetricModel,
    QualityStandardModel,
    ProcessingBatchModel,
    ProcessingStepModel,
    EquipmentModel,
    EquipmentMaintenanceLogModel,
    ManualLedgerEntryModel,
    EquipmentLeaseModel,
    SustainabilityPracticeModel,
    SustainabilityVerificationModel,
    FarmInputModel,
    // Marketplace Models
    VendorModel,
    ProductCategoryModel,
    ProductModel,
    VendorProductModel,
    OrderModel,
    OrderItemModel,
    // Training Models
    TrainingModuleModel,
    TrainingCompletionModel,
  ],
});

export default database;