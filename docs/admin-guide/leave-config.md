# Leave Configuration

## Leave Types

**Admin → Leave → Leave Types**

### Default Types (Indonesian Labor Law Compliant)

| Type | Code | Paid | Max Consecutive | Carry Fwd | Doc Required | Gender |
|------|------|------|-----------------|-----------|--------------|--------|
| Annual Leave | LV-ANNUAL | ✅ | 14 | 5 days | No | All |
| Sick Leave | LV-SICK | ✅ | 30 | 0 | >2 days | All |
| Maternity | LV-MATERNITY | ✅ | 90 | 0 | Yes | Female |
| Paternity | LV-PATERNITY | ✅ | 2 | 0 | Yes | Male |
| Marriage | LV-MARRIAGE | ✅ | 3 | 0 | Yes | All |
| Menstrual | LV-MENSTRUAL | ✅ | 2 | 0 | No | Female |
| Hajj | LV-HAJJ | ✅ | 40 | 0 | Yes | All |
| Permission | LV-PERMIT | ❌ | 3 | 0 | No | All |

### Creating Custom Types
**Leave → Leave Types → New**
- Name, Code (unique), Description
- Paid/Unpaid toggle
- Max consecutive days
- Carry forward limit (days)
- Document requirement
- Gender restriction
- Min service months (e.g., 12 months for Annual)

## Leave Balances

### Accrual Rules
**Admin → Leave → Accrual Rules**

| Rule | Example |
|------|---------|
| Annual Grant | 12 days on join anniversary |
| Monthly Accrual | 1 day/month (pro-rated) |
| Carry Forward | Auto on Jan 1 (max 5 days) |
| Expiry | Carried days expire 31 Mar |

### Manual Adjustment
**Leave → Balances → Adjust**
- Add/deduct days
- Reason required (audit logged)
- Effective date

## Leave Policies

### Advance Notice
| Type | Min Notice | Configurable |
|------|------------|--------------|
| Annual | 14 days | ✅ |
| Sick | ASAP | ✅ |
| Marriage | 3 days | ✅ |
| Maternity | 30 days | ✅ |
| Permission | 1 day | ✅ |

### Approval Matrix
**Admin → Leave → Approval Rules**

| Condition | Approver |
|-----------|----------|
| ≤ 3 days | Direct Manager |
| 4-14 days | Manager + HR |
| > 14 days | Manager + HR + Director |
| Sick > 2 days | Manager + HR (medical cert) |

### Special Rules
- **Half Day**: Allowed for Annual, Permission
- **Sandwich Rule**: Leave bridging holiday = 1 day (configurable)
- **Negative Balance**: Block / Allow with approval
- **Retroactive**: Block / Allow with HR approval

## Holiday Calendar

**Admin → Leave → Holidays**
- National holidays (auto-import Gov calendar)
- Company-specific (foundation day, etc.)
- Collective leave (Cuti Bersama)
- Recurring/one-time

### Collective Leave (Cuti Bersama)
- Auto-deducts from Annual balance
- Configurable: Mandatory / Optional
- Advance notice: 30 days

## Carry Forward Process

**Admin → Leave → Carry Forward**
1. Run annually (Jan 1)
2. Preview: Shows each employee's carried days
3. Confirm → Auto-creates balance records
4. Expiry: 31 March (configurable)

### Expiry Job
- Runs daily 00:00
- Expires carried days past expiry date
- Logs in Audit

## Reports

| Report | Location | Frequency |
|--------|----------|-----------|
| Leave Balance | Leave → Reports | Monthly |
| Leave Utilization | Leave → Reports | Quarterly |
| Leave Liability | Leave → Reports | Annual (for finance) |
| Approval SLA | Leave → Reports | Monthly |

---

## Compliance Checklist (Indonesian Labor Law)

- [ ] Annual leave ≥ 12 days/year (UU No. 13/2003)
- [ ] Sick leave unlimited (with medical cert)
- [ ] Maternity 3 months (1.5 pre + 1.5 post)
- [ ] Paternity 2 days (PP 45/2015)
- [ ] Menstrual leave 2 days (UU No. 13/2003)
- [ ] Cuti Bersama deducted from Annual
- [ ] Carry forward max 6 days (recommended ≤ 6)
- [ ] Medical cert for sick > 2 days

---

*All configs audited (Admin → Audit → Leave Config).*