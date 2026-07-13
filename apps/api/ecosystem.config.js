module.exports = {
  apps: [
    {
      name: 'flexy-hrms-api',
      cwd: __dirname,
      script: 'dist/main.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '512M',
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        JOB_WORKER_ENABLED: 'true',
      },
      // Graceful shutdown so in-flight requests finish before PM2 stops the process.
      kill_timeout: 30000,
      wait_ready: false,
      // Expose Prometheus-style / health on the same port; PM2 uses the health endpoint.
      exp_backoff_restart_delay: 100,
    },
  ],
};
