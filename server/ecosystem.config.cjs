module.exports = {
  apps: [
    {
      name: "jahrestage-server",
      cwd: __dirname,
      script: "server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
