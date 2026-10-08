# Penetration Testing Schedule

**Version: 1.0 | October 2026**

## Overview

| Item | Detail |
|------|--------|
| **Scope** | Flexy HRMS API (api.flexy-hrms.com), Web App (app.flexy-hrms.com), API Gateway |
| **Type** | Black-box + Gray-box (API credentials provided) |
| **Standard** | OWASP ASVS 4.0 Level 2, OWASP Top 10 2021 |
| **Frequency** | Annual + after major releases |
| **Retest** | Included within 30 days |

---

## Schedule

### Annual Penetration Test
| Phase | Timeline | Activities |
|-------|----------|------------|
| **Planning** | Week 1 | Scope confirmation, rules of engagement, credential provisioning |
| **Reconnaissance** | Week 2 | Passive/active reconnaissance, API enumeration |
| **Vulnerability Assessment** | Week 3-4 | Automated scanning + manual testing |
| **Exploitation** | Week 5 | Controlled exploitation of confirmed vulns |
| **Reporting** | Week 6 | Draft report, review, final report |
| **Remediation** | Week 7-10 | Fix verification, retest |
| **Final Report** | Week 11 | Executive summary, technical findings, remediation guide |

**Total Duration**: 11 weeks
**Preferred Window**: January-February (post-holiday) or July-August (mid-year)

### Ad-hoc / Triggered Tests
| Trigger | Timeline |
|---------|----------|
| Major release (architectural changes) | Within 2 weeks of release |
| New major feature (payroll, recruitment) | Within 1 week of release |
| Security incident | Immediate (within 24h) |
| Regulatory requirement | As mandated |

---

## Scope Details

### In Scope
| Asset | Type | Credentials |
|-------|------|-------------|
| api.flexy-hrms.com | API | Admin + Employee test accounts |
| app.flexy-hrms.com | Web App | Employee + Admin test accounts |
| api.flexy-hrms.com/api/v1/* | REST API | Valid JWT tokens |
| WebSocket endpoints | Real-time | Valid connections |
| File upload endpoints | Upload | Valid multipart |
| Authentication endpoints | Auth | Valid credentials |

### Out of Scope
- Third-party services (AWS, SendGrid, Infobip, etc.)
- Infrastructure (AWS console, DNS, Cloudflare)
- Corporate network (VPN, office WiFi)
- Physical security
- Social engineering (unless agreed)
- DoS/DDoS testing (separate engagement)

---

## Testing Methodology

### 1. Reconnaissance (Week 2)
- DNS enumeration, subdomain discovery
- API documentation analysis (OpenAPI/Swagger)
- Technology fingerprinting
- Employee OSINT (LinkedIn, GitHub)

### 2. Authentication & Authorization
- JWT validation (alg confusion, none, weak secret)
- Token replay, refresh token rotation
- Role escalation (horizontal/vertical)
- Session fixation, hijacking
- MFA bypass attempts
- Password policy, reset flow

### 3. Input Validation & Injection
- SQL injection (all parameters)
- NoSQL injection (MongoDB if used)
- Command injection (file upload, export)
- LDAP injection (if applicable)
- XSS (reflected, stored, DOM)
- SSRF (file import, webhook URLs)
- XXE (XML imports)
- Prototype pollution

### 4. Business Logic
- Leave balance manipulation
- Payroll calculation bypass
- Approval workflow bypass
- IDOR (Insecure Direct Object References)
- Race conditions (concurrent approvals)
- Workflow state manipulation

### 5. API Security
- Rate limiting bypass
- Mass assignment
- Excessive data exposure
- Broken object-level authorization
- Broken function-level authorization
- Missing rate limiting on auth endpoints

### 5. Client-Side (Web App)
- CSP bypass
- Clickjacking
- CORS misconfiguration
- Subdomain takeover
- Sensitive data in localStorage/sessionStorage

### 6. Infrastructure
- Security headers (HSTS, CSP, X-Frame-Options)
- Cookie flags (Secure, HttpOnly, SameSite)
- SSL/TLS configuration
- CORS policy
- Information disclosure (headers, error pages)

---

## Deliverables

### Executive Summary (1-2 pages)
- Risk posture (Critical/High/Medium/Low count)
- Business impact summary
- Compliance gaps (PDP, GDPR, ISO 27001)
- Strategic recommendations

### Technical Report (15-30 pages)
| Section | Content |
|---------|---------|
| Methodology | Tools, scope, limitations |
| Findings | Per vulnerability: title, severity, CVSS, location, PoC, impact, remediation |
| Evidence | Screenshots, requests/responses, logs |
| Root Cause | Code/config root cause |
| Remediation | Specific code/config fixes |

### Remediation Tracker
| Finding | Severity | Status | Owner | Target Date | Verified |
|---------|----------|--------|-------|-------------|----------|
| F-001 | Critical | Open | Backend Lead | 2026-11-15 | No |
| F-002 | High | Fixed | Frontend Lead | 2026-11-10 | Yes |

### Retest Report
- Verification of each fixed finding
- Regression check
- Updated risk posture

---

## Rules of Engagement

### Communication
- **Primary Contact**: Security Team (security@flexy-hrms.com)
- **Escalation**: Engineering Manager → VP Engineering
- **Status Updates**: Daily during active testing
- **Emergency**: +62 21 5555 0123 (24/7)

### Constraints
- **No DoS/DDoS**: No load testing, bandwidth saturation
- **No Data Exfiltration**: Read-only access to test data
- **No User Impact**: Test accounts only, no real user disruption
- **Business Hours**: Testing 09:00-18:00 WIB (extendable by agreement)
- **Data Handling**: No production data export; use test tenant

### Credentials Provided
| Account | Role | Access |
|---------|------|--------|
| admin@pentest.flexy.local | Super Admin | Full |
| hr@pentest.flexy.local | HR Admin | HR modules |
| manager@pentest.flexy.local | Manager | Team scope |
| employee@pentest.flexy.local | Employee | Self-service |

### Test Environment
- **Staging**: staging.flexy-hrms.com (mirror of prod)
- **Data**: Anonymized production subset
- **Isolation**: Separate VPC, no prod data access

---

## Reporting Timeline

| Milestone | Deadline |
|-----------|----------|
| Kickoff Meeting | Day 1 |
| Interim Briefing | Week 3 |
| Draft Report | Day 45 |
| Review Meeting | Day 50 |
| Final Report | Day 55 |
| Retest Complete | Day 85 |
| Final Sign-off | Day 90 |

---

## Compliance Mapping

| Standard | Coverage |
|----------|----------|
| OWASP Top 10 2021 | 100% |
| OWASP ASVS 4.0 Level 2 | 100% |
| OWASP API Security Top 10 | 100% |
| ISO 27001 Annex A | Relevant controls |
| UU PDP (Indonesia) | Personal data protection |
| PCI DSS (if payments) | Relevant controls |

---

## Budget & Vendor

### Preferred Vendors (Shortlisted)
1. **Local (Indonesia)**: Prive, Binary, DigiCert
2. **Regional**: Horangi, Horangi Cyber Security
3. **Global**: HackerOne, Bugcrowd, Cobalt.io

### Budget Estimate
| Scope | Estimate (USD) |
|-------|----------------|
| Annual (Full scope) | $15,000 - $25,000 |
| Ad-hoc (per feature) | $3,000 - $5,000 |
| Retest | Included |

### Selection Criteria
- Indonesia market experience
- SaaS/HRIS domain knowledge
- Indonesian language capability
- CREST/OSCP certified testers
- References from fintech/HRIS

---

## Next Steps

1. **Approve Scope & Budget** (Week 1)
2. **Select Vendor** (Week 2)
3. **Sign Rules of Engagement** (Week 2)
3. **Provision Test Credentials** (Week 2)
4. **Kickoff** (Week 3)

---

## Appendix: Vulnerability Severity Matrix

| Severity | CVSS | Response Time | Example |
|----------|------|---------------|---------|
| Critical | 9.0-10.0 | 24h | RCE, SQLi, Auth bypass |
| High | 7.0-8.9 | 72h | IDOR, Auth bypass, Stored XSS |
| Medium | 4.0-6.9 | 2 weeks | Reflected XSS, Info disclosure |
| Low | 0.1-3.9 | 30 days | Info disclosure, Missing headers |

---

*Document Version: 1.0*
*Next Review: January 2027*
*Owner: Security Team*