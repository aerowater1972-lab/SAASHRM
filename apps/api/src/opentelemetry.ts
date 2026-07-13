import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const isProd = process.env.NODE_ENV === 'production';

const spanProcessor = isProd
  ? new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      })
    )
  : new BatchSpanProcessor(new ConsoleSpanExporter());

const sdk = new NodeSDK({
  spanProcessor,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
    }),
    new PrismaInstrumentation(),
  ],
});

if (process.env.OTEL_ENABLED === 'true') {
  sdk.start();
  process.on('SIGTERM', () => sdk.shutdown().catch(() => {}));
}
