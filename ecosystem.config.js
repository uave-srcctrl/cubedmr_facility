/**
 * PM2 Ecosystem Configuration for wounddatacenter
 * 
 * Usage:
 *   npm run build                    # Build the application
 *   npm run start:pm2                # Start with PM2
 *   npm run restart                  # Restart the application
 *   npm run stop                     # Stop the application
 *   npm run logs                     # View logs
 *   npm run status                   # Check status
 * 
 * Setup automatic restart on server reboot:
 *   pm2 startup
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      // Application name
      name: "wounddatacenter",
      
      // Entry point
      script: "dist/index.cjs",
      
      // Environment variables
      env: {
        NODE_ENV: "production",
      },
      
      // Number of instances (1 = single process, 'max' = use all CPU cores)
      instances: 1,
      
      // Execution mode ('fork' or 'cluster')
      exec_mode: "fork",
      
      // Maximum memory before restart (in MB)
      max_memory_restart: "1G",
      
      // Logging
      error_file: "/var/log/pm2/wounddatacenter-error.log",
      out_file: "/var/log/pm2/wounddatacenter-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // Watch for file changes (useful during development, disable in production)
      watch: false,
      ignore_watch: ["node_modules", "dist"],
      
      // Restart delay (milliseconds)
      restart_delay: 3000,
      
      // Max restarts before crash
      max_restarts: 10,
      
      // Min uptime before considering app "started"
      min_uptime: "10s",
      
      // Time to wait before force kill on restart
      kill_timeout: 3000,
      
      // Listen for SIGTERM signal
      wait_ready: false,
      
      // Autorestart on crash
      autorestart: true,
      
      // Log stream
      instance_var: "INSTANCE_ID",
    },
  ],
};
