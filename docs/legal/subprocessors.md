# Sub-processor List

**Last Updated: October 2026**
**Version: 1.0**

## Current Sub-processors

| Sub-processor | Purpose | Location | Certifications | Agreement |
|---------------|---------|----------|----------------|-----------|
| **Amazon Web Services (AWS)** | Cloud Infrastructure (Primary) | Jakarta, Indonesia | ISO 27001, SOC 2 Type II, PCI DSS | DPA + SCC |
| **Google Cloud Platform** | Disaster Recovery / Analytics | Singapore | ISO 27001, SOC 2 Type II, ISO 27017 | DPA + SCC |
| **SendGrid (Twilio)** | Transactional Email Delivery | United States | SOC 2 Type II, EU SCC | DPA + SCC |
| **Mailgun** | Backup Email Delivery | United States | SOC 2 Type II, EU SCC | DPA + SCC |
| **Infobip** | SMS Gateway / WhatsApp API | Global | ISO 27001, SOC 2, EU SCC | DPA + SCC |
| **Twilio** | Backup SMS / Voice | United States | SOC 2 Type II, ISO 27001 | DPA + SCC |
| **Midtrans** | Payment Gateway (ID) | Indonesia | PCI DSS Level 1, Bank Indonesia | DPA |
| **Xendit** | Payment Gateway (ID) | Indonesia | PCI DSS Level 1, Bank Indonesia | DPA |
| **Datadog** | Infrastructure Monitoring | United States | SOC 2 Type II, ISO 27001 | DPA + SCC |
| **Sentry** | Error Tracking / APM | United States | SOC 2 Type II, ISO 27001 | DPA + SCC |
| **Midtrans/Xendit** | Bank Transfer Integration | Indonesia | PCI DSS, Bank Indonesia | DPA |
| **PostgreSQL (Managed)** | Database (AWS RDS) | Jakarta | AWS SOC 2, ISO 27001 | DPA |
| **Redis (Managed)** | Caching (AWS ElastiCache) | Jakarta | AWS SOC 2 | DPA |
| **Cloudflare** | CDN / WAF / DNS | Global | SOC 2, ISO 27001, PCI DSS | DPA + SCC |

---

## Sub-processor Management

### Addition Process
1. **Assessment**: Security review, DPA negotiation
2. **Notification**: 30-day written notice to Controllers
3. **Objection Period**: 14 days for Controller objection
4. **Contracting**: DPA + SCC executed
5. **Onboarding**: Technical integration, monitoring setup

### Objection Rights
- Controllers may object within 14 days of notice
- If objection unresolved: Controller may terminate affected Service
- No penalty for termination due to sub-processor objection

### Review Cycle
- Quarterly review of sub-processor list
- Annual re-assessment of security posture
- Incident response coordination tested quarterly

---

## Data Flow by Sub-processor

| Sub-processor | Data Categories | Transfer Basis | Retention |
|---------------|-----------------|----------------|-----------|
| AWS/GCP | All Customer Data | Contract (Art 28) | Contract + 30d |
| SendGrid/Mailgun | Email, Notification Data | SCC + DPA | 30 days |
| Infobip/Twilio | Phone, SMS Content | SCC + DPA | 90 days |
| Midtrans/Xendit | Payment Data (no HR) | PCI DSS + DPA | 7 years (regulatory) |
| Datadog/Sentry | Technical Logs (no PII) | SCC + DPA | 30 days |
| Midtrans/Xendit (Bank) | Bank Account, Amount | PCI DSS + DPA | 7 years |

---

## Security Requirements for Sub-processors

| Requirement | Standard |
|-------------|----------|
| Encryption at Rest | AES-256 minimum |
| Encryption in Transit | TLS 1.2+ |
| Access Control | RBAC + MFA |
| Audit Logging | Tamper-proof, 1yr retention |
| Incident Response | 72h notification |
| Annual Audit | SOC 2 Type II or ISO 27001 |
| Business Continuity | RPO < 1hr, RTO < 4hr |
| Data Deletion | Cryptographic erasure |

---

## Notification Process

### New Sub-processor
1. **T-30 days**: Email to all Controller admins
2. **Details**: Name, purpose, location, data categories, safeguards
3. **Objection Window**: 14 calendar days
3. **No Objection**: Auto-approved after window
4. **Objection Received**: 30-day resolution period

### Change to Existing
- Material changes (location, data categories): Same as new
- Non-material (capacity, performance): 7-day notice

### Termination
- 30-day notice
- Data return/deletion within 30 days
- Transition assistance (30 days)

---

## Contact

**Sub-processor Management**: privacy@flexy-hrms.com
**Security Incidents**: security@flexy-hrms.com (24/7)
**DPO**: dpo@flexy-hrms.com

---

*Last Updated: October 2026*
*Next Review: January 2027*
*Version: 1.0*