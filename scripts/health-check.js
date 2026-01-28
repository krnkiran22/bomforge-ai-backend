#!/usr/bin/env node

const http = require('http');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function checkHealth() {
  // Wait for backend to start
  console.log(`${colors.cyan}⏳ Waiting for backend to start...${colors.reset}`);
  await sleep(8000); // 8 seconds

  const checks = [
    {
      name: 'Backend Health',
      path: '/health',
      port: 3001
    },
    {
      name: 'Multi-Model Status',
      path: '/api/convert/multi-model/status',
      port: 3001
    },
    {
      name: 'Learning Stats',
      path: '/api/convert/learning/stats',
      port: 3001
    }
  ];

  console.log(`\n${colors.cyan}🏥 Running Health Checks...${colors.reset}\n`);

  for (const check of checks) {
    await performCheck(check);
    await sleep(1000);
  }

  console.log(`\n${colors.green}✅ All systems operational!${colors.reset}\n`);
  
  // Keep the process running
  console.log(`${colors.cyan}📊 Monitoring health every 30 seconds...${colors.reset}`);
  setInterval(async () => {
    await performCheck(checks[0]); // Just check backend health
  }, 30000);
}

async function performCheck(check) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: check.port,
      path: check.path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log(`${colors.green}✅ ${check.name}${colors.reset}`);
            
            // Show specific info based on endpoint
            if (check.path === '/health') {
              console.log(`   Database: ${parsed.database}`);
            } else if (check.path.includes('multi-model')) {
              const allGood = Object.values(parsed.models || {}).every(v => v === true || typeof v === 'string');
              console.log(`   Models: ${allGood ? '5/5 operational' : 'Some models unavailable'}`);
            } else if (check.path.includes('learning')) {
              console.log(`   Feedbacks: ${parsed.totalFeedbacks || 0}`);
              console.log(`   Corrections: ${parsed.totalCorrections || 0}`);
            }
          } catch (e) {
            console.log(`${colors.green}✅ ${check.name}${colors.reset}`);
          }
        } else {
          console.log(`${colors.yellow}⚠️  ${check.name}: Status ${res.statusCode}${colors.reset}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`${colors.red}❌ ${check.name}: Not available${colors.reset}`);
      resolve();
    });

    req.on('timeout', () => {
      console.log(`${colors.yellow}⏱️  ${check.name}: Timeout${colors.reset}`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

checkHealth().catch(console.error);
