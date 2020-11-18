module.exports = {
  apps : [{
    name: 'SocketService',
    script: 'index.js',
    args: 'one two',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      port: '8111'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],
};
