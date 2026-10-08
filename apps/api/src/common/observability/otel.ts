import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

export function initOtel(): NodeSDK | null {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const serviceName = process.env.OTEL_SERVICE_NAME || 'flexy-hrms-api';
  const environment = process.env.NODE_ENV || 'development';

  if (!endpoint || endpoint === 'disabled' || environment === 'test') {
    console.log('[OTel] Disabled (no endpoint or test env)');
    return null;
  }

  if (process.env.OTEL_DEBUG === 'true') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || 'unknown',
    }),
    traceExporter: new OTLPTraceExporter({
      url: endpoint,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log('[OTel] Initialized', { serviceName, environment, endpoint });

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('[OTel] Shutdown complete'))
      .catch(err => console.error('[OTel] Shutdown error:', err))
      .finally(() => process.exit(0));
  });

  return sdk;
}