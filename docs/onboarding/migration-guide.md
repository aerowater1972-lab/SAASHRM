# Employee Data Migration Template

## Instructions

1. **Download** this CSV template
2. **Fill** each row with one employee's data
3. **Validate** using the checklist below
4. **Upload** via Admin -> Employees -> Import
5. **Review** error report, fix, re-upload

---

## Column Definitions

| Column | Required | Format | Example | Notes |
|--------|----------|--------|---------|-------|
| employee_id | Yes | EMP-XXXX | EMP-0001 | Unique, auto-gen if blank |
| full_name | Yes | String | Budi Santoso | Max 100 chars |
| email | Yes | Email | budi@company.com | Unique, corporate domain |
| phone | Yes | +628xxxxxxxxxx | +6281234567890 | Indonesian format |
| join_date | Yes | YYYY-MM-DD | 2024-01-15 | <= Today |
| department_id | Yes | UUID | 550e8400-e29b-41d4-a716-446655440000 | From Dept list |
| position_id | Yes | UUID | 550e8400-e29b-41d4-a716-446655440001 | From Position list |
| grade_id | Yes | UUID | 550e8400-e29b-41d4-a716-446655440002 | From Grade list |
| employment_type | Yes | Enum | PERMANENT/CONTRACT/PROBATION | Exact values |
| bank_account | No | Numeric | 1234567890 | No spaces/dashes |
| bank_name | No | String | BCA / BCA Syariah / Mandiri | Exact match |
| npwp | No | 00.000.000.0-000.0 | 12.345.678.9-012.3 | Format validated |
| bpjs_kes | No | Numeric | 1234567890 | BPJS Kesehatan |
| bpjs_ket | No | Numeric | 9876543210 | BPJS Ketenagakerjaan |
| gender | No | Enum | Male/Female | Exact |
| date_of_birth | No | YYYY-MM-DD | 1990-05-15 | |
| place_of_birth | No | String | Jakarta | |
| marital_status | No | Enum | Single/Married/Divorced/Widowed | Exact |
| religion | No | Enum | Islam/Kristen/Katholik/Hindu/Buddha/Konghucu | Exact |
| blood_type | No | Enum | A+/A-/B+/B-/AB+/AB-/O+/O- | Exact |
| address_ktp | No | String | Jl. Sudirman No. 1, Jakarta | KTP address |
| address_domisili | No | String | Jl. Thamrin No. 2, Jakarta | Current address |
| emergency_contact_name | No | String | Siti Santoso | |
| emergency_contact_phone | No | +628xxxxxxxxxx | +6281234567891 | |
| emergency_contact_relation | No | Enum | Spouse/Parent/Child/Sibling/Other | Exact |

---

## Validation Checklist

Before upload, verify:

- [ ] No duplicate `employee_id` or `email`
- [ ] All `department_id`, `position_id`, `grade_id` exist in system
- [ ] `employment_type` exact match: PERMANENT/CONTRACT/PROBATION
- [ ] `npwp` format: `XX.XXX.XXX.X-XXX.X` or empty
- [ ] `phone` starts with `+628`
- [ ] `join_date` not future date
- [ ] `date_of_birth` realistic (18-65 years)
- [ ] `marital_status` exact: Single/Married/Divorced/Widowed
- [ ] `religion` exact: Islam/Kristen/Katholik/Hindu/Buddha/Konghucu
- [ ] `blood_type` exact: A+/A-/B+/B-/AB+/AB-/O+/O-
- [ ] `emergency_contact_relation` exact: Spouse/Parent/Child/Sibling/Other

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| Duplicate employee_id | ID exists | Use auto-gen or unique ID |
| Duplicate email | Email exists | Use unique email |
| Invalid department_id | UUID not found | Check Admin -> Departments |
| Invalid position_id | UUID not found | Check Admin -> Positions |
| Invalid grade_id | UUID not found | Check Admin -> Grades |
| Invalid employment_type | Wrong value | Use exact: PERMANENT/CONTRACT/PROBATION |
| Invalid npwp format | Wrong format | Use XX.XXX.XXX.X-XXX.X |
| Invalid phone | Wrong format | Start with +628 |
| Future join_date | Date > today | Use past/present date |
| Invalid marital_status | Wrong value | Use exact enum |
| Invalid blood_type | Wrong value | Use exact enum |

---

## Sample Data (Reference)

See sample rows above. Copy/paste and modify.

---

## Post-Import Steps

1. **Review** error report (download after upload)
2. **Fix** errors in source file
3. **Re-upload** corrected file
4. **Verify** count matches expected
5. **Notify** employees (welcome email auto-sent)
5. **Assign** assets, equipment, access (separate process)

---

## Support

- **Template Issues**: support@flexy-hrms.com
- **Data Questions**: Check Admin -> Employees -> Import History
- **Bulk Updates**: Use Employees -> Bulk Actions after import

---

*Template Version: 1.0 | Updated: October 2026*
*Compatible with Flexy HRMS v1.0+*