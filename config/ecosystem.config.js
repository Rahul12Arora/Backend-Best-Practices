module.exports = {
  apps: {
    name: 'Quotation Application',
    script: 'app.js',
    env: {
      "PORT": 3000,
      NODE_ENV: 'development',
      database: 'mongodb://localhost:27017/quotation_tool_fresh',
    },
    env_testing: {
      "PORT": 3000,
      NODE_ENV: 'testing',
      database: 'mongodb://localhost:27017/quotation_tool_fresh',
    },
    env_production: {
      "PORT": 8080,
      NODE_ENV: 'production',
      database: 'mongodb+srv://qtUser:6DzYIdXeuCHaCxSX@quotationtoolproduction.vbhrq.mongodb.net/quotation_tool?retryWrites=true&w=majority',
    }
  },
// This is for the older quotation tool
  // deploy: {
  //   production: {
  //     user: 'node',
  //     host: '212.83.163.1',
  //     ref: 'origin/master',
  //     repo: 'git@github.com:repo.git',
  //     path: '/var/www/production',
  //     'post-deploy': 'npm install && pm2 reload ./config/ecosystem.config.js --env production'
  //   }
  // }
};
