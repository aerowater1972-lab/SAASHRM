# Leave Management

## Leave Types

| Type | Code | Paid | Max Consecutive | Carry Forward | Requires Doc |
|------|------|------|-----------------|---------------|--------------|
| Annual Leave | LV-ANNUAL | ✅ | 14 days | 5 days | ❌ |
| Sick Leave | LV-SICK | ✅ | 30 days | 0 days | ✅ (>2 days) |
| Marriage Leave | LV-MARRIAGE | ✅ | 3 days | 0 days | ✅ |
| Maternity Leave | LV-MATERNITY | ✅ | 90 days | 0 days | ✅ |
| Permission | LV-PERMIT | ❌ | 3 days | 0 days | ❌ |

## Requesting Leave

1. Go to **Leave → New Request**
2. Select **Leave Type**
3. Set **Start Date** & **End Date** (auto-calculates working days)
3. Enter **Reason**
4. Attach document if required (sick >2 days, marriage, maternity)
5. Submit → Auto-routes to manager

## Rules & Policies

| Rule | Detail |
|------|--------|
| Advance Notice | Annual: 14 days, Sick: ASAP, Others: 3 days |
| Half Day | Allowed for Annual & Permission |
| Negative Balance | Not allowed (configurable) |
| Carry Forward | Max 5 days Annual, expires 31 Mar next year |
| Overlap | System prevents overlapping requests |

## Approval Flow

```
Employee → Direct Manager → HR (if >14 days) → Approved
```

## Calendar View

- **My Leave**: Your requests (color-coded by status)
- **Team**: Your direct reports (managers)
- **Company**: All leave (HR Admin)

## Cancellation

- **Before Start**: Self-cancel if Pending
- **After Start**: Contact HR + Manager approval

---

## Entitlement Calculation

```
Annual Leave = 12 days/year (pro-rated by join date)
+ 1 day per year of service (max +6)
```

*Check **Leave → Balance** for your current entitlement.*