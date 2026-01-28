#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║     BOMForge AI - System Verification     ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

let allGood = true;

// Check 1: Node version
console.log(`${colors.cyan}[1/7]${colors.reset} Checking Node.js version...`);
try {
  const version = process.version;
  const major = parseInt(version.split('.')[0].substring(1));
  if (major >= 18) {
    console.log(`${colors.green}  ✅ Node.js ${version} (OK)${colors.reset}`);
  } else {
    console.log(`${colors.red}  ❌ Node.js ${version} (Need v18+)${colors.reset}`);
    allGood = false;
  }
} catch (e) {
  console.log(`${colors.red}  ❌ Could not check Node version${colors.reset}`);
  allGood = false;
}

// Check 2: .env file
console.log(`\n${colors.cyan}[2/7]${colors.reset} Checking .env file...`);
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log(`${colors.green}  ✅ .env file exists${colors.reset}`);
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredVars = [
    'MONGODB_URI',
    'GROQ_API_KEY',
    'PORT'
  ];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`${colors.green}     ✓ ${varName}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}     ⚠ ${varName} missing${colors.reset}`);
    }
  });
} else {
  console.log(`${colors.red}  ❌ .env file not found${colors.reset}`);
  allGood = false;
}

// Check 3: Ollama installation
console.log(`\n${colors.cyan}[3/7]${colors.reset} Checking Ollama installation...`);
try {
  execSync('which ollama', { stdio: 'ignore' });
  console.log(`${colors.green}  ✅ Ollama is installed${colors.reset}`);
} catch (e) {
  console.log(`${colors.red}  ❌ Ollama not found${colors.reset}`);
  console.log(`${colors.yellow}     Install: brew install ollama${colors.reset}`);
  allGood = false;
}

// Check 4: Ollama model
console.log(`\n${colors.cyan}[4/7]${colors.reset} Checking Ollama models...`);
try {
  const output = execSync('ollama list', { encoding: 'utf-8' });
  if (output.includes('llama3.1')) {
    console.log(`${colors.green}  ✅ llama3.1 model found${colors.reset}`);
  } else {
    console.log(`${colors.yellow}  ⚠️  llama3.1 model not found${colors.reset}`);
    console.log(`${colors.yellow}     Download: ollama pull llama3.1:8b${colors.reset}`);
  }
} catch (e) {
  console.log(`${colors.yellow}  ⚠️  Could not check models (Ollama may not be running)${colors.reset}`);
}

// Check 5: Required directories
console.log(`\n${colors.cyan}[5/7]${colors.reset} Checking required directories...`);
const dirs = ['uploads', 'scripts'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    console.log(`${colors.green}  ✅ ${dir}/ exists${colors.reset}`);
  } else {
    console.log(`${colors.yellow}  ⚠️  Creating ${dir}/...${colors.reset}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Check 6: Service files
console.log(`\n${colors.cyan}[6/7]${colors.reset} Checking service files...`);
const services = [
  'nlp.service.ts',
  'classification.service.ts',
  'sequencing.service.ts',
  'clustering.service.ts',
  'knowledge.service.ts',
  'multi-model.service.ts',
  'learning.service.ts'
];

services.forEach(service => {
  const servicePath = path.join(__dirname, '..', 'src', 'services', service);
  if (fs.existsSync(servicePath)) {
    console.log(`${colors.green}  ✅ ${service}${colors.reset}`);
  } else {
    console.log(`${colors.red}  ❌ ${service} missing${colors.reset}`);
    allGood = false;
  }
});

// Check 7: Dependencies
console.log(`\n${colors.cyan}[7/7]${colors.reset} Checking dependencies...`);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const requiredDeps = ['mongoose', 'express', 'dotenv', 'cors', 'axios'];
requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`${colors.green}  ✅ ${dep}${colors.reset}`);
  } else {
    console.log(`${colors.red}  ❌ ${dep} not installed${colors.reset}`);
    allGood = false;
  }
});

// Summary
console.log(`\n${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);
if (allGood) {
  console.log(`${colors.green}✅ All checks passed! System ready to start.${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}❌ Some checks failed. Please fix issues above.${colors.reset}\n`);
  process.exit(1);
}
