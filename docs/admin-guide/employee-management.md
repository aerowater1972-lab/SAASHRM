# Employee Management

## Adding Employees

### Single Entry
**Employees → New Employee**

**Required Fields:**
| Field | Validation |
|-------|------------|
| Employee ID | Auto or manual, unique |
| Full Name | Required |
| Email | Unique, corporate domain |
| Phone | Indonesian format (+62) |
| Join Date | ≤ Today |
| Department | Required |
| Position | Required |
| Grade | Required |
| Employment Type | PERMANENT/CONTRACT/PROBATION |

**Optional:**
- Bank account (auto-create payroll record)
- NPWP, BPJS (triggers payroll config)
- Emergency contact
- Documents (KTP, NPWP, Ijazah, SKCK)

### Bulk Import
**Employees → Import → Download Template → Upload Excel**

**Template Columns:**
| Column | Required | Format |
|--------|----------|--------|
| employee_id | Yes | EMP-0001 |
| full_name | Yes | String |
| email | Yes | email@domain.com |
| phone | Yes | +628xxxxxxxxxx |
| join_date | Yes | YYYY-MM-DD |
| department_id | Yes | UUID |
| position_id | Yes | UUID |
| grade_id | Yes | UUID |
| employment_type | Yes | PERMANENT/CONTRACT/PROBATION |
| bank_account | No | 1234567890 |
| bank_name | No | BCA/BCA Syariah/etc |
| npwp | No | 12.345.678.9-012.3 |
| bpjs_kes | No | 1234567890 |
| bpjs_ket | No | 1234567890 |

**Validation:**
- Duplicate email/ID rejected
- Invalid UUID → Row error
- Missing required → Row error
- **Download error report** after upload

## Employee Lifecycle

### Status Flow
```
ONBOARDING → ACTIVE → (RESIGNED/TERMINATED) → OFFBOARDED → ALUMNI
```

| Status | Description | Payroll | Access |
|--------|-------------|---------|--------|
| ONBOARDING | Pre-join, docs pending | ❌ | Limited |
| ACTIVE | Working | ✅ | Full |
| RESIGNED | Notice period | ✅ | Limited |
| TERMINATED | Immediate exit | Final only | Revoked |
| OFFBOARDED | Clearance done | ❌ | Revoked |
| ALUMNI | Rehire pool | ❌ | Alumni portal |

### Status Changes
**Employees → [Name] → Change Status**
- Requires: Reason, Effective Date, Approver
- Triggers: Offboarding tasks, Access revocation, Final settlement

## Employee Actions

### Promotion/Transfer/Mutation
**Employees → [Name] → Movement → New Request**
- Types: Promotion, Transfer, Mutation, Demotion
- Requires: New position/dept/org, Effective date
- Approval: Manager → HR → (Finance if salary change)
- Auto-creates new Employment record on approval

### Contract Renewal/Extension
**Employees → [Name] → Employment → Extend**
- Update end date, type, terms
- Auto-calculates severance if not renewed

### Resignation
**Employees → [Name] → Resignation → New**
- Employee submits → Manager approves → HR processes
- Auto-generates: Offboarding tasks, Clearance, Final settlement
- Notice period: Auto-calculated (per contract/regulation)

### Termination
**Employees → [Name] → Terminate**
- Types: PKWT expired, Performance, Disciplinary, Redundancy
- Requires: Legal review, Severance calc, Union notification (if applicable)
- Generates: Severance case, Clearance, Final settlement

## Organization Structure

### Departments
**Admin → Organization → Departments**
- Hierarchical (parent/child)
- Department head assignment
- Cutoff time per dept (for attendance)

### Positions
**Admin → Organization → Positions**
- Linked to Department + Grade
- Max headcount (optional)
- Risk level (for succession)

### Grades
**Admin → Organization → Grades**
- Level (1-10)
- Min/Max salary range
- Max OT hours/month

### Entities (Multi-entity)
**Admin → Organization → Entities**
- Legal entities under tenant
- Separate NPWP, reporting
- Employee assignment per entity

## Reports & Analytics

### Headcount Dashboard
**Employees → Analytics → Headcount**
| Metric | Visualization |
|--------|---------------|
| Total Headcount | Trend line |
| By Department | Bar chart |
| By Grade | Pie chart |
| By Employment Type | Stacked bar |
| Turnover Rate | Monthly trend |

### Org Chart
**Employees → Org Chart**
- Interactive (expand/collapse)
- Export PNG/PDF
- Filter by dept/status

### Movement History
**Employees → [Name] → Movement History**
- All promotions, transfers, mutations
- Salary changes timeline
- Export PDF

---

## Bulk Actions

| Action | Location | Max Records |
|--------|----------|-------------|
| Status Change | Employees → Bulk Actions | 500 |
| Department Move | Employees → Bulk Actions | 500 |
| Grade Update | Employees → Bulk Actions | 500 |
| Export | Employees → Export | 10,000 |

---

*All changes logged in Audit Log (Admin → Audit → Employee).*