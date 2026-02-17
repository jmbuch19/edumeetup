# Database Migration Guidelines

## ⚠️ CRITICAL: Migrations Must Be Additive

To maintain system stability and prevent data loss or downtime, all database changes must follow these strict rules.

### 🚫 NEVER DO THIS
1.  **Never Rename Fields Suddenly**: This breaks the running application immediately.
2.  **Never Delete Columns Without a Plan**: Data loss is irreversible. Application code expects the column to exist.
3.  **Never Change Enums Without Mapping**: Removing an enum value that is in use will cause runtime errors.

### ✅ DO THIS INSTEAD
1.  **Add New Columns**: Create a new column for the new data.
2.  **Add New Tables**: Expand the schema with new entities.
3.  **Keep Backward Compatibility**: 
    *   Old code must work with the new schema.
    *   Deprecated fields should be supported until the code is fully updated.
4.  **Use Default Values**: When adding required fields to existing tables, always provide a default value (e.g., `@default(false)` or `@default(now())`) to avoid resetting the database.

### 🛠️ Execution
Always use the following command to generate migrations:
```bash
npx prisma migrate dev --name <descriptive_name>
```

**Reasoning**: `prisma migrate dev` checks for data loss warnings and manages the migration history. Avoid `db push` in production-critical flows unless absolutely necessary and safe.
