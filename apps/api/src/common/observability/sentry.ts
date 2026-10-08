import * as Sentry from '@sentry/node';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  if (!dsn || dsn === 'disabled' || environment === 'test') {
    console.log('[Sentry] Disabled (no DSN or test env)');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release: process.env.APP_VERSION || 'unknown',
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      Sentry.prismaIntegration(),
    ],
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profileSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      if (environment !== 'production') {
        console.log('[Sentry] Event captured:', event.exception?.values?.[0]?.value);
      }
      return event;
    },
  });

  console.log('[Sentry] Initialized', { environment, release: process.env.APP_VERSION });
}

export { Sentry };