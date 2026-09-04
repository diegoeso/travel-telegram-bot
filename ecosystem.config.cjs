module.exports = {
  apps: [
    {
      name: "travel-telegram-bot",
      cwd: __dirname,
      interpreter: process.env.DEPLOY_NODE_BIN || "node",
      script: "dist/index.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env_production: {
        NODE_ENV: "production",
        LOG_LEVEL: "warn",
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
