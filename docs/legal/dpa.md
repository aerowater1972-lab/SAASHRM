# Data Processing Agreement (DPA)

**Version: 1.0 | Effective: October 1, 2026**

## 1. Parties

**Controller**: The Customer (entity signing Order Form)
**Processor**: PT Flexy Teknologi Indonesia ("Flexy HRMS")
Jalan Sudirman No. 123, Jakarta Selatan, DKI Jakarta 12950, Indonesia

## 2. Definitions

- **Personal Data**: Any information relating to identified/identifiable natural person
- **Processing**: Any operation on Personal Data
- **Data Subject**: Natural person whose Personal Data is Processed
- **Sub-processor**: Third party engaged by Processor
- **Security Incident**: Breach leading to accidental/unlawful destruction, loss, alteration, disclosure

## 2. Scope & Duration

**Subject Matter**: HRMS Service provision
**Duration**: Duration of Master Agreement + 30 days post-termination
**Categories of Data Subjects**: Employees, candidates, managers, HR admins
**Categories of Personal Data**: See Appendix A
**Purpose**: HRMS Service delivery (payroll, leave, attendance, recruitment, performance)

## 3. Processor Obligations

### 3.1 Processing Instructions
Processor processes only on documented Controller instructions (Master Agreement + DPA). No incompatible processing.

### 3.2 Confidentiality
Processor ensures persons authorized to process are committed to confidentiality.

### 3.3 Security Measures (Art 32 GDPR / Art 15 UU PDP)
- Encryption at rest (AES-256-GCM) and transit (TLS 1.3)
- Pseudonymization where feasible
- Resilience, availability, restore capability
- Regular testing/evaluation (annual pen test)
- ISO 27001 certified infrastructure

### 3.4 Sub-processors
- List maintained at flexy-hrms.com/subprocessors
- 30 days prior written notice for new/changes
- Controller may object within 14 days (termination right if unresolved)
- Written agreements with same obligations

### 3.5 Data Subject Rights Support
Processor assists Controller with:
- Access, rectification, erasure, restriction, portability, objection
- Within 10 business days of request
- At no additional cost (reasonable volume)

### 3.6 Breach Notification (Art 33/34 GDPR / Art 11 UU PDP)
- Notify Controller without undue delay, max 72 hours
- Include: nature, categories, affected count, consequences, measures taken
- Cooperation in Controller's notification to authorities/subjects

### 3.7 Data Deletion/Return
- Delete/return all Personal Data within 30 days of termination
- Certification of deletion upon request
- Retain only if required by law (notify Controller)

### 3.8 Audits & Inspections
- Controller may audit (annually, 30 days notice)
- Processor provides SOC 2 Type II report (annual)
- Enterprise: On-site audit available (Controller expense)

## 5. International Transfers

### Adequacy
- Singapore (adequate per PDPC)
- EU (SCC + supplementary measures)

### Safeguards
- Standard Contractual Clauses (EU Commission 2021/914)
- Supplementary measures: encryption, access controls
- Transfer Impact Assessment (annual)

## 6. Liability & Indemnification

### 6.1 Processor Liability
- Cap: 12 months fees (per Master Agreement)
- Direct damages only
- No liability for Controller's instruction compliance

### 6.2 Indemnification
Processor indemnifies Controller for:
- Processor's breach of DPA
- Sub-processor breach
- Security Incident due to Processor negligence

Controller indemnifies Processor for:
- Controller's instructions violating law
- Customer Data content/legality

## 7. General

### 7.1 Governing Law
Indonesian law. Jakarta Selatan courts.

### 7.2 Term
Duration of Master Agreement + 30 days post-termination.

### 7.3 Amendment
Written, signed by both parties.

### 7.4 Severability
Invalid provisions severed; remainder enforced.

### 7.4 Notices
Written, email to registered addresses.

---

## Appendix A: Categories of Personal Data

| Category | Examples |
|----------|----------|
| Identification | Name, NIK, NPWP, BPJS, passport |
| Contact | Email, phone, address, emergency contact |
| Employment | Position, department, grade, salary, join date |
| Financial | Bank account, salary, tax, BPJS, allowances |
| Leave | Requests, balances, history, medical certs |
| Attendance | Clock in/out, GPS, biometric, location |
| Performance | Goals, reviews, feedback, 360 |
| Documents | KTP, NPWP, Ijazah, SKCK, certificates |
| Technical | IP, device, login logs, API calls |

## Appendix B: Sub-processor List (Current)

| Sub-processor | Purpose | Location | Safeguards |
|---------------|---------|----------|------------|
| AWS | Cloud hosting | Jakarta, ID | ISO 27001, SOC 2 |
| Google Cloud | DR/Analytics | Singapore | ISO 27001, SOC 2 |
| SendGrid | Email delivery | US | EU SCC, Privacy Shield |
| Infobip | SMS Gateway | Global | EU SCC |
| Midtrans/Xendit | Payments | Indonesia | PCI DSS |
| Datadog | Monitoring | US | EU SCC |
| Sentry | Error tracking | US | EU SCC |

*Updated quarterly. Full list: flexy-hrms.com/subprocessors*

---

**Signed electronically via Master Agreement acceptance.**

**Flexy HRMS** | **PT Flexy Teknologi Indonesia**

*Version 1.0 | October 1, 2026*