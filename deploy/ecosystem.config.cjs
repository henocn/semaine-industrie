/* PM2 — API Semaine de l'industrie (nom : industrie-api, port 3005 via .env). */
module.exports = {
  apps: [
    {
      name: 'industrie-api',
      cwd: '/var/www/semaine-industrie/backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '5s',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
