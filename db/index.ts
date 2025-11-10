import { appSchema, tableSchema } from '@nozbe/watermelondb/Schema';
import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';
import { Model, Q } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation, children, writer, lazy } from '@nozbe/watermelondb/decorators';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { Database } from '@nozbe/watermelondb';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import { FarmerStatus, PlantType, PlantationMethod, OverallGrade, AppealStatus, TaskStatus, TaskPriority, ProcessingStatus, TransactionStatus, TransactionType, AssistanceApplicationStatus } from '../types';

// Use a simple, non-secure random ID generator for this offline-first app
setGenerator(() => Math.random().toString(36).substring(2));

const schema = appSchema({
  version: 16,
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
        { name: 'application_id', type: 'string', isIndexed: true },
        { name: 'farmer_id', type: 'string', isIndexed: true },
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
        { name: 'is_in_ne_region', type: 'boolean' },
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
        { name: 'is_replanting', type: 'boolean' },
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
      name: 'financial_transactions',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'transaction_type', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'transaction_date', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'third_party_ref_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'farmer_wallets',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'current_balance', type: 'number' },
        { name: 'last_updated_at', type: 'number' },
        { name: 'syncStatus', type: 'string' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
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
  ],
});


const migrations = schemaMigrations({
  migrations: [
    {
        toVersion: 2,
        steps: [
            addColumns({
                table: 'farmers',
                columns: [
                    { name: 'created_by', type: 'string', isOptional: true },
                    { name: 'updated_by', type: 'string', isOptional: true },
                ]
            })
        ]
    },
    {
        toVersion: 3,
        steps: [
            addColumns({
                table: 'farmers',
                columns: [{ name: 'tenant_id', type: 'string', isIndexed: true }]
            }),
            addColumns({
                table: 'users',
                columns: [{ name: 'tenant_id', type: 'string', isIndexed: true }]
            }),
             addColumns({
                table: 'groups',
                columns: [{ name: 'tenant_id', type: 'string', isIndexed: true }]
            }),
             addColumns({
                table: 'subsidy_payments',
                columns: [{ name: 'tenant_id', type: 'string', isIndexed: true }]
            }),
             addColumns({
                table: 'activity_logs',
                columns: [{ name: 'tenant_id', type: 'string', isIndexed: true }]
            }),
            createTable({
                name: 'tenants',
                columns: [
                    { name: 'name', type: 'string' },
                    { name: 'subscription_status', type: 'string' },
                    { name: 'created_at', type: 'number' },
                ]
            })
        ]
    },
     {
        toVersion: 4,
        steps: [
            createTable({
                name: 'resources',
                columns: [
                    { name: 'name', type: 'string' },
                    { name: 'unit', type: 'string' },
                    { name: 'description', type: 'string', isOptional: true },
                    { name: 'tenant_id', type: 'string', isIndexed: true },
                ]
            }),
            createTable({
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
        ]
    },
    {
      toVersion: 5,
      steps: [
        createTable({
          name: 'districts',
          columns: [
            { name: 'code', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
          ],
        }),
        createTable({
          name: 'mandals',
          columns: [
            { name: 'district_id', type: 'string', isIndexed: true },
            { name: 'code', type: 'string' },
            { name: 'name', type: 'string' },
          ],
        }),
        createTable({
          name: 'villages',
          columns: [
            { name: 'mandal_id', type: 'string', isIndexed: true },
            { name: 'code', type: 'string' },
            { name: 'name', type: 'string' },
          ],
        }),
      ]
    },
     {
      toVersion: 6,
      steps: [
        createTable({
          name: 'custom_field_definitions',
          columns: [
            { name: 'model_name', type: 'string' },
            { name: 'field_name', type: 'string' },
            { name: 'field_label', type: 'string' },
            { name: 'field_type', type: 'string' },
            { name: 'options', type: 'string', isOptional: true }, // JSON array as string
            { name: 'is_required', type: 'boolean' },
            { name: 'sort_order', type: 'number' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
          ]
        })
      ]
    },
    {
        toVersion: 7,
        steps: [
            createTable({
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
                ]
            })
        ]
    },
     {
        toVersion: 8,
        steps: [
            createTable({
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
            })
        ]
    },
    {
        toVersion: 9,
        steps: [
            createTable({
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
            })
        ]
    },
     {
      toVersion: 10,
      steps: [
        createTable({
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
        createTable({
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
        createTable({
          name: 'quality_metrics',
          columns: [
            { name: 'assessment_id', type: 'string', isIndexed: true },
            { name: 'metric_name', type: 'string' },
            { name: 'metric_value', type: 'string' },
          ],
        }),
      ]
    },
     {
        toVersion: 11,
        steps: [
            createTable({
                name: 'quality_standards',
                columns: [
                    { name: 'metric_name', type: 'string' },
                    { name: 'description', type: 'string' },
                    { name: 'measurement_unit', type: 'string' },
                    { name: 'tenant_id', type: 'string', isIndexed: true },
                ],
            }),
        ],
    },
    {
      toVersion: 12,
      steps: [
        addColumns({
          table: 'quality_metrics',
          columns: [
            { name: 'id', type: 'string' } // This is a workaround for a missing primary key issue. Watermelon needs an ID.
          ]
        })
      ]
    },
    {
      toVersion: 13,
      steps: [
        createTable({
          name: 'manual_ledger_entries',
          columns: [
              { name: 'farmer_id', type: 'string', isIndexed: true },
              { name: 'entry_date', type: 'string' },
              { name: 'description', type: 'string' },
              { name: 'category', type: 'string' },
              { name: 'amount', type: 'number' },
              { name: 'syncStatus', type: 'string' },
              { name: 'created_at', type: 'number' },
              { name: 'updated_at', type: 'number' },
              { name: 'tenant_id', type: 'string', isIndexed: true },
          ]
        })
      ]
    },
    {
      toVersion: 14,
      steps: [
        createTable({
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
        createTable({
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
        createTable({
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
        createTable({
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
      ]
    },
    {
      toVersion: 15,
      steps: [
        createTable({
          name: 'financial_transactions',
          columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'transaction_type', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'transaction_date', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'third_party_ref_id', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'syncStatus', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
          ],
        }),
        createTable({
          name: 'farmer_wallets',
          columns: [
            { name: 'farmer_id', type: 'string', isIndexed: true },
            { name: 'current_balance', type: 'number' },
            { name: 'last_updated_at', type: 'number' },
            { name: 'syncStatus', type: 'string' },
            { name: 'tenant_id', type: 'string', isIndexed: true },
          ],
        }),
        createTable({
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
      ]
    },
    {
      toVersion: 16,
      steps: [
        addColumns({
          table: 'farmers',
          columns: [{ name: 'is_in_ne_region', type: 'boolean', isOptional: true }]
        }),
        addColumns({
          table: 'plots',
          columns: [{ name: 'is_replanting', type: 'boolean', isOptional: true }]
        }),
        addColumns({
          table: 'manual_ledger_entries',
          columns: [{ name: 'entry_source', type: 'string', isOptional: true }]
        })
      ]
    }
  ],
});


// Models
export class FarmerModel extends Model {
  static table = 'farmers';
  id!: string;
  @text('full_name') fullName!: string;
  @text('father_husband_name') fatherHusbandName!: string;
  @text('aadhaar_number') aadhaarNumber!: string;
  @text('mobile_number') mobileNumber!: string;
  @text('gender') gender!: string;
  @text('address') address!: string;
  @field('ppb_rofr_id') ppbRofrId?: string;
  @field('photo') photo?: string;
  @text('bank_account_number') bankAccountNumber!: string;
  @text('ifsc_code') ifscCode!: string;
  @field('account_verified') accountVerified!: boolean;
  @field('applied_extent') appliedExtent!: number;
  @field('approved_extent') approvedExtent!: number;
  @field('number_of_plants') numberOfPlants!: number;
  @field('method_of_plantation') methodOfPlantation!: PlantationMethod;
  @field('plant_type') plantType!: PlantType;
  @field('plantation_date') plantationDate?: string;
  @field('mlrd_plants') mlrdPlants!: number;
  @field('full_cost_plants') fullCostPlants!: number;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @text('application_id') applicationId!: string;
  @text('farmer_id') farmerId!: string;
  @text('proposed_year') proposedYear!: string;
  @text('registration_date') registrationDate!: string;
  @text('aso_id') asoId!: string;
  @text('payment_utr_dd') paymentUtrDd!: string;
  @field('status') status!: FarmerStatus;
  @text('district') district!: string;
  @text('mandal') mandal!: string;
  @text('village') village!: string;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending' | 'pending_delete';
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @text('created_by') createdBy?: string;
  @text('updated_by') updatedBy?: string;
  @text('tenant_id') tenantId!: string;
  @field('is_in_ne_region') isInNeRegion!: boolean;
  
  @children('subsidy_payments') subsidyPayments!: Q.Query<SubsidyPaymentModel>;
  @children('activity_logs') activityLogs!: Q.Query<ActivityLogModel>;
  @children('resource_distributions') resourceDistributions!: Q.Query<ResourceDistributionModel>;
  @children('plots') plots!: Q.Query<PlotModel>;
  @children('assistance_applications') assistanceApplications!: Q.Query<AssistanceApplicationModel>;
  @children('manual_ledger_entries') manualLedgerEntries!: Q.Query<ManualLedgerEntryModel>;
  @children('financial_transactions') financialTransactions!: Q.Query<FinancialTransactionModel>;
  @children('equipment_leases') equipmentLeases!: Q.Query<EquipmentLeaseModel>;

  // FIX: Use `this.collection` instead of `this.collections` to access collections.
  @lazy wallet = this.collection.get<FarmerWalletModel>('farmer_wallets').query(Q.where('farmer_id', this.id));
}

export class PlotModel extends Model {
    static table = 'plots';
    id!: string;
    @text('farmer_id') farmerId!: string;
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
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('tenant_id') tenantId!: string;
    @field('is_replanting') isReplanting!: boolean;
}

export class UserModel extends Model {
  static table = 'users';
  id!: string;
  @text('name') name!: string;
  @text('avatar') avatar!: string;
  @text('group_id') groupId!: string;
  @text('tenant_id') tenantId!: string;
}

export class GroupModel extends Model {
  static table = 'groups';
  id!: string;
  @text('name') name!: string;
  @text('permissions') permissionsStr!: string;
  @text('tenant_id') tenantId!: string;

  get permissions() {
    return JSON.parse(this.permissionsStr);
  }
}

export class SubsidyPaymentModel extends Model {
  static table = 'subsidy_payments';
  id!: string;
  @text('farmer_id') farmerId!: string;
  @relation('farmers', 'farmer_id') farmer!: any;
  @text('payment_date') paymentDate!: string;
  @field('amount') amount!: number;
  @text('utr_number') utrNumber!: string;
  @text('payment_stage') paymentStage!: string;
  @text('notes') notes?: string;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('created_by') createdBy?: string;
  @readonly @date('created_at') createdAt!: Date;
  @text('tenant_id') tenantId!: string;
}

export class ActivityLogModel extends Model {
    static table = 'activity_logs';
    id!: string;
    @text('farmer_id') farmerId!: string;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('activity_type') activityType!: string;
    @text('description') description!: string;
    @readonly @date('created_at') createdAt!: Date;
    @text('created_by') createdBy!: string;
    @text('tenant_id') tenantId!: string;
}

export class TenantModel extends Model {
    static table = 'tenants';
    id!: string;
    @text('name') name!: string;
    @text('subscription_status') subscriptionStatus!: 'active' | 'trial' | 'inactive';
    @readonly @date('created_at') createdAt!: Date;

    @writer async updateSubscriptionStatus(status: 'active' | 'trial' | 'inactive') {
        await this.update(tenant => {
            tenant.subscriptionStatus = status;
        })
    }
}

export class ResourceModel extends Model {
    static table = 'resources';
    id!: string;
    @text('name') name!: string;
    @text('unit') unit!: string;
    @text('description') description?: string;
    @text('tenant_id') tenantId!: string;
}

export class ResourceDistributionModel extends Model {
    static table = 'resource_distributions';
    id!: string;
    @text('farmer_id') farmerId!: string;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('resource_id') resourceId!: string;
    @relation('resources', 'resource_id') resource!: any;
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
    id!: string;
    @text('code') code!: string;
    @text('name') name!: string;
    @children('mandals') mandals!: Q.Query<MandalModel>;
}

export class MandalModel extends Model {
    static table = 'mandals';
    id!: string;
    @text('district_id') districtId!: string;
    @relation('districts', 'district_id') district!: any;
    @text('code') code!: string;
    @text('name') name!: string;
    @children('villages') villages!: Q.Query<VillageModel>;
}

export class VillageModel extends Model {
    static table = 'villages';
    id!: string;
    @text('mandal_id') mandalId!: string;
    @relation('mandals', 'mandal_id') mandal!: any;
    @text('code') code!: string;
    @text('name') name!: string;
}

export class CustomFieldDefinitionModel extends Model {
    static table = 'custom_field_definitions';
    id!: string;
    @text('model_name') modelName!: string;
    @text('field_name') fieldName!: string;
    @text('field_label') fieldLabel!: string;
    @text('field_type') fieldType!: string;
    @text('options') optionsJson?: string; // Stored as a JSON string
    @field('is_required') isRequired!: boolean;
    @field('sort_order') sortOrder!: number;
    @text('tenant_id') tenantId!: string;

    get options(): string[] {
        return this.optionsJson ? JSON.parse(this.optionsJson) : [];
    }
}

export class AssistanceApplicationModel extends Model {
    static table = 'assistance_applications';
    id!: string;
    @text('farmer_id') farmerId!: string;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('scheme_id') schemeId!: string;
    @text('status') status!: AssistanceApplicationStatus;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('tenant_id') tenantId!: string;
}

export class TaskModel extends Model {
    static table = 'tasks';
    id!: string;
    @text('title') title!: string;
    @text('description') description?: string;
    @field('status') status!: TaskStatus;
    @field('priority') priority!: TaskPriority;
    @text('due_date') dueDate?: string;
    @text('assignee_id') assigneeId?: string;
    @text('farmer_id') farmerId?: string;
    @text('created_by') createdBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @text('tenant_id') tenantId!: string;
}

export class HarvestModel extends Model {
  static table = 'harvests';
  id!: string;
  @text('farmer_id') farmerId!: string;
  @relation('farmers', 'farmer_id') farmer!: any;
  @text('harvest_date') harvestDate!: string;
  @field('gross_weight') grossWeight!: number;
  @field('tare_weight') tareWeight!: number;
  @field('net_weight') netWeight!: number;
  @text('assessed_by_id') assessedById!: string;
  @readonly @date('created_at') createdAt!: Date;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
}

export class QualityAssessmentModel extends Model {
  static table = 'quality_assessments';
  id!: string;
  @text('harvest_id') harvestId!: string;
  @relation('harvests', 'harvest_id') harvest!: any;
  @text('assessment_date') assessmentDate!: string;
  @field('overall_grade') overallGrade!: OverallGrade;
  @field('price_adjustment') priceAdjustment!: number;
  @text('notes') notes?: string;
  @field('appeal_status') appealStatus!: AppealStatus;
  @readonly @date('created_at') createdAt!: Date;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
  
  @children('quality_metrics') qualityMetrics!: Q.Query<QualityMetricModel>;
}

export class QualityMetricModel extends Model {
  static table = 'quality_metrics';
  id!: string;
  @text('assessment_id') assessmentId!: string;
  @relation('quality_assessments', 'assessment_id') assessment!: any;
  @text('metric_name') metricName!: string;
  @text('metric_value') metricValue!: string;
}

export class QualityStandardModel extends Model {
    static table = 'quality_standards';
    id!: string;
    @text('metric_name') metricName!: string;
    @text('description') description!: string;
    @text('measurement_unit') measurementUnit!: string;
    @text('tenant_id') tenantId!: string;
}

export class ProcessingBatchModel extends Model {
  static table = 'processing_batches';
  id!: string;
  @text('harvest_id') harvestId!: string;
  @relation('harvests', 'harvest_id') harvest!: any;
  @text('batch_code') batchCode!: string;
  @text('start_date') startDate!: string;
  @text('end_date') endDate?: string;
  @field('status') status!: ProcessingStatus;
  @text('notes') notes?: string;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
  @children('processing_steps') steps!: Q.Query<ProcessingStepModel>;
}

export class ProcessingStepModel extends Model {
  static table = 'processing_steps';
  id!: string;
  @text('batch_id') batchId!: string;
  @relation('processing_batches', 'batch_id') batch!: any;
  @text('step_name') stepName!: string;
  @text('start_date') startDate!: string;
  @text('end_date') endDate?: string;
  @text('parameters') parameters!: string;
  @text('operator_id') operatorId!: string;
  @text('equipment_id') equipmentId?: string;
  @text('notes') notes?: string;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
}

export class EquipmentModel extends Model {
  static table = 'equipment';
  id!: string;
  @text('name') name!: string;
  @text('type') type!: string;
  @text('location') location!: string;
  @text('status') status!: 'operational' | 'maintenance' | 'decommissioned';
  @text('last_maintenance_date') lastMaintenanceDate?: string;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
  @children('maintenance_logs') maintenanceLogs!: Q.Query<EquipmentMaintenanceLogModel>;
}

export class EquipmentMaintenanceLogModel extends Model {
  static table = 'equipment_maintenance_logs';
  id!: string;
  @text('equipment_id') equipmentId!: string;
  @relation('equipment', 'equipment_id') equipment!: any;
  @text('maintenance_date') maintenanceDate!: string;
  @text('description') description!: string;
  @text('performed_by_id') performedById!: string;
  @field('cost') cost!: number;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
}

export class ManualLedgerEntryModel extends Model {
    static table = 'manual_ledger_entries';
    id!: string;
    @text('farmer_id') farmerId!: string;
    @relation('farmers', 'farmer_id') farmer!: any;
    @text('entry_date') entryDate!: string;
    @text('description') description!: string;
    @field('category') category!: 'Income' | 'Expense';
    @field('amount') amount!: number;
    @text('entry_source') entrySource!: string;
    @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('tenant_id') tenantId!: string;
}

export class FinancialTransactionModel extends Model {
  static table = 'financial_transactions';
  id!: string;
  @text('farmer_id') farmerId!: string;
  @relation('farmers', 'farmer_id') farmer!: any;
  @field('transaction_type') transactionType!: TransactionType;
  @field('status') status!: TransactionStatus;
  @field('amount') amount!: number;
  @text('transaction_date') transactionDate!: string;
  @text('notes') notes?: string;
  @text('third_party_ref_id') thirdPartyRefId?: string;
  @readonly @date('created_at') createdAt!: Date;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
}

export class FarmerWalletModel extends Model {
  static table = 'farmer_wallets';
  id!: string;
  @text('farmer_id') farmerId!: string;
  @relation('farmers', 'farmer_id') farmer!: any;
  @field('current_balance') currentBalance!: number;
  @readonly @date('last_updated_at') lastUpdatedAt!: Date;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
}

export class EquipmentLeaseModel extends Model {
  static table = 'equipment_leases';
  id!: string;
  @text('farmer_id') farmerId!: string;
  @relation('farmers', 'farmer_id') farmer!: any;
  @text('equipment_id') equipmentId!: string;
  @relation('equipment', 'equipment_id') equipment!: any;
  @text('start_date') startDate!: string;
  @text('end_date') endDate!: string;
  @field('total_cost') totalCost!: number;
  @field('payment_status') paymentStatus!: 'Pending' | 'Paid';
  @readonly @date('created_at') createdAt!: Date;
  @text('syncStatus') syncStatusLocal!: 'synced' | 'pending';
  @text('tenant_id') tenantId!: string;
}

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
    FarmerModel, PlotModel, UserModel, GroupModel, SubsidyPaymentModel, ActivityLogModel, TenantModel, ResourceModel, ResourceDistributionModel, DistrictModel, MandalModel, VillageModel, CustomFieldDefinitionModel, AssistanceApplicationModel, TaskModel, HarvestModel, QualityAssessmentModel, QualityMetricModel, QualityStandardModel, ProcessingBatchModel, ProcessingStepModel, EquipmentModel, EquipmentMaintenanceLogModel, ManualLedgerEntryModel, FinancialTransactionModel, FarmerWalletModel, EquipmentLeaseModel
  ],
});

export default database;
