# Payroll & Payslips

## Payslip Components

### Earnings
| Component | Description | Taxable |
|----------|-------------|---------|
| Basic Salary | Fixed monthly | ✅ |
| Allowances | Transport, Meal, Communication | ✅* |
| Overtime | 1.5x/2x/3x rate | ✅ |
| Bonus/THR | Annual/holiday | ✅ |
| Commission | Sales/performance | ✅ |

*Some allowances non-taxable up to limits (PP 68/2023)

### Deductions
| Component | Rate |
|-----------|------|
| PPh 21 (Tax) | Progressive (5-35%) |
| BPJS Kesehatan | 1% (0.5% emp) |
| BPJS Ketenagakerjaan | 2% (1% emp) |
| Loan Repayment | Per agreement |
| BPJS Kesehatan (Company) | 4% (employer) |

### Net Pay Formula
```
Gross Earnings
- Tax (PPh 21)
- BPJS Employee Share
- Loan/Other Deductions
= NET PAY
```

## Payslip Access

1. **Payroll → Payslips**
2. Select month → **Download PDF** / **View Details**
3. **Annual Recap**: Tax → Annual Tax (1721-A1)

## Payroll Schedule

| Period | Cutoff | Payslip Available |
|--------|--------|-------------------|
| Monthly | 25th prev month | 5th current month |
| THR | Per regulation | 7 days before holiday |
| Bonus | Per company policy | Per schedule |

## Tax (PPh 21) - 2024 Rates

| Annual Taxable Income | Rate |
|-----------------------|------|
| ≤ 60M | 5% |
| 60M - 250M | 15% |
| 250M - 500M | 25% |
| 500M - 5B | 30% |
| > 5B | 35% |

*PTKP (Non-taxable): Single 54M, Married +1 4.5M, Child 4.5M (max 3)*

## Bank Transfer

- **File Format**: BCA/BCA Bisnis / Mandiri / BNI / BRI / Custom CSV
- **Generated**: After payroll **Publish**
- **Download**: Payroll → Runs → [Run] → Generate Bank Transfer

## Annual Tax (1721-A1)

- **Available**: March following year
- **Download**: Tax → Annual Tax Report
- **Employer Copy**: Auto-sent to registered email

---

## FAQ

**Q: Why is my tax different this month?**
A: Progressive calculation + annualization. Check Tax → Monthly Detail.

**Q: Can I split salary to 2 accounts?**
A: Yes, Profile → Bank Accounts → Add secondary (max 20%).

**Q: BPJS not deducted?**
A: Check enrollment date. New hires: next payroll cycle.

---

*All salary data encrypted at rest (AES-256-GCM). Payslip PDFs watermarked.*