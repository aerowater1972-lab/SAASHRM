# Production Environment Configuration

## Sentry Configuration

### Environment Variables (Production)
```bash
# Sentry DSN (Required)
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456

# Optional: Release tracking
APP_VERSION=1.0.0
GIT_COMMIT=abc123def

# Optional: Environment
SENTRY_ENVIRONMENT=production

# Optional: Sample rates (production)
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### Sentry Project Setup
1. Create project at sentry.io: `flexy-hrms-api` (Node.js)
2. Configure DSN in environment
3. Set up alerts:
   - Error rate > 1%/5min → PagerDuty/Slack
   - New issue → Slack #alerts
   - Regression → Email team

### Release Tracking
```bash
# In CI/CD pipeline
SENTRY_AUTH_TOKEN=xxx sentry-cli releases new $APP_VERSION
sentry-cli releases set-commits $APP_VERSION --auto
sentry-cli releases finalize $APP_VERSION
sentry-cli releases deploys $APP_VERSION new -e production
```

---

## OpenTelemetry Configuration

### Environment Variables (Production)
```bash
# OTLP Exporter
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.yourdomain.com:4318
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer ${OTEL_TOKEN}

# Service Identity
OTEL_SERVICE_NAME=flexy-hrms-api
OTEL_SERVICE_VERSION=${APP_VERSION}
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.namespace=flexy-hrms

# Sampling (Production: 10%)
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# Exporters
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp

# Resource Attributes
OTEL_RESOURCE_ATTRIBUTES=service.name=flexy-hrms-api,service.version=${APP_VERSION},deployment.environment=production,service.namespace=flexy-hrms
```

### Collector Configuration (otel-collector-config.yaml)
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_max_size: 1000
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert
      - key: service.namespace
        value: "flexy-hrms"
        action: upsert

exporters:
  otlp:
    endpoint: "https://tempo.yourdomain.com:4317"
    headers:
      Authorization: "Bearer ${TEMPO_TOKEN}"
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp, logging]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

### Kubernetes Deployment (Production)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.106.0
        command: ["otelcol-contrib", "--config=/etc/otel/config.yaml"]
        volumeMounts:
        - name: config
          mountPath: /etc/otel
        ports:
        - containerPort: 4317
        - containerPort: 4318
        - containerPort: 8888
        resources:
          limits:
            memory: 512Mi
            cpu: 500m
          requests:
            memory: 256Mi
            cpu: 250m
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  ports:
  - port: 4317
    name: grpc
  - port: 4318
    name: http
  selector:
    app: otel-collector
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    # (paste collector config above)
```

---

## Environment Variables Summary (Production)

### Required
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/flexy_hrms?schema=public

# JWT
JWT_SECRET=your-64-char-secret
JWT_REFRESH_SECRET=your-64-char-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
DATA_ENCRYPTION_KEY=your-32-char-encryption-key
SALARY_ENCRYPTION_ENABLED=true

# Security
CORS_ORIGIN=https://app.flexy-hrms.com
ALLOW_PUBLIC_REGISTER=false
CSRF_SECRET=your-csrf-secret

# Sentry
SENTRY_DSN=https://key@o123456.ingest.sentry.io/123456
APP_VERSION=1.0.0

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.yourdomain.com:4318
OTEL_SERVICE_NAME=flexy-hrms-api
OTEL_SERVICE_VERSION=1.0.0

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Feature Flags
DB_RLS_ENABLED=false
```

### Optional (Production)
```bash
# OpenTelemetry Auth
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer ${OTEL_TOKEN}

# Sentry Advanced
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_DEBUG=false

# OpenTelemetry Advanced
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp

# Logging
LOG_LEVEL=info
```

---

## Verification Checklist

### Pre-deployment
- [ ] Sentry DSN configured in production env
- [ ] OTLP endpoint accessible from cluster
- [ ] Sentry release tracking in CI/CD
- [ ] OTel collector deployed and healthy
- [ ] Dashboards created (Sentry + Grafana)
- [ ] Alerts configured (error rate, latency, throughput)

### Post-deployment
- [ ] Test error captured in Sentry
- [ ] Trace visible in Tempo/Grafana
- [ ] Metrics flowing to Prometheus
- [ ] Alerts firing correctly

---

## Monitoring Dashboards

### Sentry
- Error rate by endpoint
- User impact (unique users affected)
- Release health (crash-free sessions)
- Performance (p50, p95, p99)

### Grafana (via Tempo/Prometheus)
- Request rate / latency / error rate (RED)
- JVM/Node.js metrics (heap, GC, event loop)
- Database query latency
- Queue depth

### Alerting Rules (Example)
```yaml
groups:
- name: flexy-hrms
  rules:
  - alert: HighErrorRate
    expr: rate(sentry_errors_total[5m]) > 0.01
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate on {{ $labels.project }}"
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency on {{ $labels.endpoint }}"
```

---

*Last Updated: October 2026*
*Version: 1.0*