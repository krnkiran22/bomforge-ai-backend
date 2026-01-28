#!/usr/bin/env node

const http = require('http');

console.log('🔍 Checking Ollama availability...');

const checkOllama = () => {
  const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/api/tags',
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
        console.log('✅ Ollama is running on port 11434');
        const parsed = JSON.parse(data);
        console.log(`📦 Installed models: ${parsed.models.length}`);
        parsed.models.forEach(model => {
          console.log(`   - ${model.name}`);
        });
        process.exit(0);
      } else {
        console.log('⚠️  Ollama responded but with error:', res.statusCode);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Ollama is not running');
    console.log('💡 Start it with: ollama serve');
    process.exit(1);
  });

  req.on('timeout', () => {
    console.log('⏱️  Ollama check timeout');
    req.destroy();
    process.exit(1);
  });

  req.end();
};

checkOllama();
