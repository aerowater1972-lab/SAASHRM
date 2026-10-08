# Payroll Configuration

## Payroll Components

### Component Types
**Admin → Payroll → Components**

| Type | Code Prefix | Examples | Taxable |
|------|-------------|----------|---------|
| Earning | EARN- | Basic, Transport, Meal, Housing | ✅ |
| Allowance | ALLOW- | Transport, Meal, Communication | ✅* |
| Deduction | DED- | BPJS, Tax, Loan, Union | ❌ |
| Employer | EMPLR- | BPJS Company, Pension | N/A |

*Per PP 68/2023: Some allowances non-taxable up to limits

### Creating Components
**Payroll → Components → New**

| Field | Description |
|-------|-------------|
| Code | Unique (e.g., EARN-BASIC) |
| Name | Display name |
| Type | Earning/Allowance/Deduction/Employer |
| Taxable | Yes/No |
| Calculation | Fixed / Formula / Percentage |
| Formula | e.g., `basic * 0.1` (10% of basic) |
| GL Account | Accounting integration |

### Formula Syntax
```
basic_salary * 0.1                    # 10% of basic
(min(basic_salary, 5000000) * 0.05)   # 5% of basic capped at 5M
case when basic_salary > 10000000 then 1000000 else 500000 end  # Conditional
```

## Payroll Periods

**Admin → Payroll → Periods**

### Creating Periods
1. **Payroll → Periods → New**
2. Name: `2026-01` (format: YYYY-MM)
3. Start: `2026-01-01`, End: `2026-01-31`
3. Cutoff: `2025-12-25` (for Jan payroll)
4. Pay Date: `2026-01-05`

### Period Statuses
| Status | Description | Actions Allowed |
|--------|-------------|-----------------|
| OPEN | Normal processing | Create run, edit |
| CUTOFF | No new changes | Process, approve |
| PROCESSING | Calculating | View only |
| APPROVED | Ready to publish | Publish, bank file |
| PUBLISHED | Payslips visible | Bank transfer only |
| LOCKED | Final, immutable | View only |
| CLOSED | Period complete | View only |

### Bulk Create
**Periods → Bulk Create → Year: 2026**
- Auto-creates 12 monthly periods
- Uses default cutoff (25th prev month)
- Pay date: 5th of month

## Payroll Runs

### Creating a Run
**Payroll → Runs → New Run**
1. Select Period
2. (Optional) Filter employees (dept, grade, status)
3. **Create** → Status: OPEN

### Processing
**Run → Process**
1. Validates: Active employees, complete data
2. Calculates: All components per employee
3. **Exceptions**: Shows warnings (missing bank, tax config, etc.)
4. **Status → PROCESSING → PROCESSED**

### Review & Approve
**Run → Review**
- **Exceptions Tab**: Missing bank, tax config, incomplete data
- **Summary Tab**: Gross/Net totals, count
- **Details**: Per-employee breakdown

**Approve** → Status: APPROVED
**Publish** → Generates payslips, notifies employees

### Bank Transfer
**Run → Generate Bank Transfer**
1. Select Bank (BCA/Mandiri/BNI/BRI/Custom)
2. **Generate** → Download file
2. Upload to bank portal
3. **Mark Sent** → Audit trail

### Corrections
- **Before Publish**: Edit run, reprocess
- **After Publish**: Create adjustment run (new run with adjustments only)
- **Never** edit published payslips directly

## Component Configuration

### Tax (PPh 21)
**Admin → Payroll → Tax Config**
- PTKP values (auto-updated annually)
- Ter rates (5-35% progressive)
- MT status handling

### BPJS
**Admin → Payroll → BPJS Config**
| Contribution | Employee | Employer |
|--------------|----------|----------|
| BPJS Kesehatan | 1% | 4% |
| BPJS JHT | 2% | 3.7% |
| BPJS JP | 1% | 2% |
| BPJS KP | 0% | 0.24% |

*Auto-updated via Ministerial Regulation*

### THR (Holiday Allowance)
**Admin → Payroll → THR Config**
- Eligibility: ≥ 1 month service
- Calculation: 1x monthly salary (≥ 12 months) / pro-rated
- Payment: 7 days before religious holiday

## Payslip Template

**Admin → Payroll → Payslip Template**
- Company logo, address
- Component grouping (Earnings/Deductions)
- YTD columns
- Tax breakdown
- Bank details
- QR code (verification)

## Reports

| Report | Description |
|--------|-------------|
| Payroll Summary | Gross/Net per dept/grade |
| Cost Center | Cost allocation per dept |
| Bank Transfer | Ready for bank upload |
| PPh 21 Report | Monthly/Annual for tax office |
| BPJS Report | Monthly for BPJS |
| Annual Tax (1721-A1) | Employee & Company copy |

---

## Compliance Notes

- [ ] PPh 21 Ter rates updated annually (KMK)
- [ ] BPJS rates updated (Peraturan Menteri)
- [ ] UMK/UMP updated annually (Gubernur)
- [ ] THR paid 7 days before holiday (UU 13/2003)
- [ ] Payslip issued max 7 days after pay date
- [ ] Annual tax (1721-A1) by March 31

---

*All payroll data encrypted at rest. Audit trail on every change.*