# Admin Getting Started

Welcome to Flexy HRMS Administration! This guide covers initial setup.

## 1. Initial Configuration (Day 1)

### Company Profile
**Admin → Company → Profile**
- Company legal name, NPWP, address
- Logo, brand colors
- Default timezone, currency (IDR)

### Numbering Series
**Admin → Settings → Numbering**
| Document | Prefix | Next Number |
|----------|--------|-------------|
| Employee ID | EMP- | 0001 |
| Leave Request | LV- | 0001 |
| Payslip | PS- | 0001 |
| Document | DOC- | 0001 |

### Email Templates
**Admin → Settings → Email Templates**
- Welcome email
- Leave approval/rejection
- Payslip notification
- Expense approval
- Custom per module

## 2. Organization Setup (Week 1)

### Organization Structure
**Admin → Organization → Structure**
1. Create **Organization** (legal entity)
2. Add **Departments** under Organization
3. Define **Positions** per department
4. Set **Grades** (level, min/max salary)
5. Assign **Department Heads**

### Grades & Salary Ranges
**Admin → Organization → Grades**
| Grade | Level | Min Salary | Max Salary | Max OT/Month |
|-------|-------|------------|------------|--------------|
| Staff | 1 | 5M | 8M | 20h |
| Senior | 2 | 8M | 15M | 25h |
| Supervisor | 3 | 15M | 25M | 30h |
| Manager | 4 | 25M | 50M | N/A |

## 3. Leave & Attendance Config (Week 1)

### Leave Types
**Admin → Leave → Leave Types**
| Type | Max Consecutive | Carry Forward | Doc Required |
|------|----------------|---------------|--------------|
| Annual | 14 | 5 days | No |
| Sick | 30 | 0 | Yes (>2 days) |
| Maternity | 90 | 0 | Yes |

### Attendance Rules
**Admin → Attendance → Settings**
| Setting | Default | Recommended |
|---------|---------|-------------|
| GPS Radius | 100m | 50-200m |
| Face Match Threshold | 0.85 | 0.80-0.90 |
| Cutoff Time | 09:00 | Per shift |
| Grace Period | 15 min | 10-30 min |

## 4. Payroll Setup (Week 2)

### Components
**Admin → Payroll → Components**
| Type | Examples |
|------|----------|
| Earning | Basic, Transport, Meal, Overtime |
| Deduction | BPJS, Tax, Loan |
| Employer | BPJS Company, Pension |

### Payroll Periods
**Admin → Payroll → Periods**
- Create yearly periods (Jan-Dec)
- Set cutoff dates (e.g., 25th prev month)
- Lock after payroll published

### Bank Transfer
**Admin → Payroll → Bank Transfer**
- Configure bank formats (BCA, Mandiri, BNI, BRI, Custom)
- Test with dummy data before first run

## 5. Roles & Permissions

### Default Roles
| Role | Description |
|------|-------------|
| Super Admin | Full access (system) |
| HR Admin | All HR modules |
| Manager | Team leave, attendance, expense |
| Employee | Self-service only |

### Custom Roles
**Admin → Roles → New Role**
1. Name + Description
2. Assign permissions (modular)
3. Assign to users

### Permission Matrix (Key)
| Module | Employee | Manager | HR Admin |
|--------|----------|---------|----------|
| Leave Request | Create | Approve | All |
| Attendance View | Own | Team | All |
| Payroll View | Own slip | Team summary | All |
| Employee Data | Own profile | Team | All |

## 6. First Payroll Run (Month 1)

1. **Create Period** → Payroll → Periods → New
2. **Create Run** → Payroll → Runs → New → Select period
3. **Process** → Run → Process (validates all employees)
4. **Review** → Check exceptions, adjust
5. **Approve** → Run → Approve
6. **Publish** → Run → Publish (generates payslips)
7. **Bank Transfer** → Generate → Download → Upload to bank
8. **Publish Payslips** → Employees notified

---

## Quick Reference Card

| Task | Menu Path | Frequency |
|------|-----------|-----------|
| Add Employee | Employees → New | As needed |
| Approve Leave | Leave → Pending | Daily |
| Run Payroll | Payroll → Runs | Monthly |
| Generate Bank File | Payroll → Bank Transfer | Monthly |
| Run Attendance Close | Attendance → Periods | Monthly |
| Audit Log Review | Admin → Audit | Weekly |

---

*Tip: Use **Admin → Audit** to track all config changes.*