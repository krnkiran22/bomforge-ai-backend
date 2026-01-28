# 🚀 BOMForge AI - Single Command Startup Guide

## ✅ What's Been Implemented

Your BOMForge AI system now has **complete one-command startup** with automatic health monitoring!

---

## 📦 What Gets Started

When you run `npm run dev:full`, the system automatically starts:

1. **Ollama Server** (or detects if already running)
2. **Express Backend** (with multi-model AI)
3. **Health Monitor** (continuous system checks)

---

## 🎯 Available Commands

### **Start Everything (One Command)**
```bash
cd backend
npm run dev:full
```

### **Verify System Before Starting**
```bash
npm run verify
```

### **First-Time Setup**
```bash
# Downloads model + starts everything
npm run setup
```

### **Individual Components**
```bash
npm run dev           # Just backend
npm run ollama:start  # Just Ollama
npm run ollama:check  # Check Ollama status
npm run health:check  # Health monitoring only
```

---

## 📊 What You'll See

When you run `npm run dev:full`:

```
[OLLAMA] ✅ Ollama already running on port 11434

[BACKEND] ✅ Ollama service initialized
[BACKEND] 📍 Ollama URL: http://localhost:11434
[BACKEND] 🤖 Model: llama3.1:8b
[BACKEND] ✅ MongoDB connected successfully
[BACKEND] 🌱 Seeded 5 initial knowledge entries
[BACKEND] 🤖 Multi-Model AI: ENABLED (5 specialized models)
[BACKEND] 🚀 BOMForge AI Backend running on port 3001

[HEALTH] 🏥 Running Health Checks...
[HEALTH] ✅ Backend Health
[HEALTH]    Database: connected
[HEALTH] ✅ Multi-Model Status
[HEALTH]    Models: 5/5 operational
[HEALTH] ✅ Learning Stats
[HEALTH]    Feedbacks: 0
[HEALTH]    Corrections: 0
[HEALTH] 
[HEALTH] ✅ All systems operational!
[HEALTH] 📊 Monitoring health every 30 seconds...
```

---

## 🔧 System Verification

The `npm run verify` command checks:

✅ Node.js version (v18+)  
✅ .env file exists  
✅ Required environment variables  
✅ Ollama installed  
✅ llama3.1 model downloaded  
✅ Required directories (uploads/, scripts/)  
✅ All 7 AI service files  
✅ All dependencies installed  

**Example Output:**
```
╔════════════════════════════════════════════╗
║     BOMForge AI - System Verification     ║
╚════════════════════════════════════════════╝

[1/7] Checking Node.js version...
  ✅ Node.js v20.18.1 (OK)

[2/7] Checking .env file...
  ✅ .env file exists
     ✓ MONGODB_URI
     ✓ GROQ_API_KEY
     ✓ PORT

[3/7] Checking Ollama installation...
  ✅ Ollama is installed

[4/7] Checking Ollama models...
  ✅ llama3.1 model found

[5/7] Checking required directories...
  ✅ uploads/ exists
  ✅ scripts/ exists

[6/7] Checking service files...
  ✅ nlp.service.ts
  ✅ classification.service.ts
  ✅ sequencing.service.ts
  ✅ clustering.service.ts
  ✅ knowledge.service.ts
  ✅ multi-model.service.ts
  ✅ learning.service.ts

[7/7] Checking dependencies...
  ✅ mongoose
  ✅ express
  ✅ dotenv
  ✅ cors
  ✅ axios

════════════════════════════════════════════
✅ All checks passed! System ready to start.
```

---

## 📁 Created Files

### **Helper Scripts** (`backend/scripts/`)

1. **`check-ollama.js`**
   - Checks if Ollama is running
   - Lists installed models
   - Usage: `npm run ollama:check`

2. **`health-check.js`**
   - Continuous health monitoring
   - Checks backend, multi-model, and learning stats
   - Runs every 30 seconds

3. **`pre-start.js`**
   - Complete system verification
   - Checks all prerequisites
   - Usage: `npm run verify`

4. **`start-ollama.sh`**
   - Smart Ollama startup
   - Detects if already running
   - Prevents port conflicts

---

## 🐛 Troubleshooting

### **"Port 11434 already in use"**
✅ **FIXED!** The system now detects if Ollama is running and uses it instead of failing.

### **"Port 3001 already in use"**
```bash
lsof -ti:3001 | xargs kill -9
npm run dev:full
```

### **MongoDB Connection Failed**
```
❌ Could not connect to MongoDB Atlas
```

**Solution:** Add your IP to MongoDB Atlas whitelist:
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Network Access → IP Whitelist
3. Add Current IP Address
4. Wait 1-2 minutes
5. Restart: `npm run dev:full`

### **Model Not Found**
```bash
# Download the model first
npm run ollama:pull

# Or use the full setup
npm run setup
```

### **Scripts Not Executable**
```bash
chmod +x backend/scripts/*.js
chmod +x backend/scripts/*.sh
```

---

## 🎯 Quick Start (First Time)

```bash
# 1. Navigate to backend
cd backend

# 2. Verify everything is ready
npm run verify

# 3. Fix any issues shown above

# 4. Start everything with one command
npm run dev:full
```

---

## 🔄 Development Workflow

### **Morning Startup**
```bash
cd backend
npm run dev:full
```

### **Check System Health**
Open another terminal:
```bash
cd backend
npm run ollama:check

# Or check backend
curl http://localhost:3001/health
curl http://localhost:3001/api/convert/multi-model/status
```

### **Shutdown**
Just press `Ctrl+C` once - it kills all processes!

---

## 📈 Advanced Features

### **Automatic Model Download + Startup**
```bash
npm run setup
```
This will:
1. Download `llama3.1:8b` if not present
2. Start Ollama server
3. Start backend with multi-model AI
4. Begin health monitoring

### **Continuous Health Monitoring**
The health check runs automatically and displays:
- Backend status
- Database connection
- Multi-model AI status (5/5 models)
- Learning system stats
- Updates every 30 seconds

### **Graceful Failure Handling**
If any component fails, all others shut down gracefully:
```bash
--kill-others-on-fail
```

---

## 🎉 Benefits

✅ **One Command** - Start entire system  
✅ **Smart Detection** - Doesn't conflict with running services  
✅ **Health Monitoring** - Continuous system checks  
✅ **Color-Coded Output** - Easy to read logs  
✅ **Graceful Shutdown** - Ctrl+C kills everything cleanly  
✅ **Pre-Flight Checks** - Verify before starting  
✅ **Production Ready** - Handles edge cases  

---

## 📝 Environment Variables

Make sure your `.env` has:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# AI Configuration
GROQ_API_KEY=your_groq_api_key
USE_MULTI_MODEL=true
SEED_KNOWLEDGE=true

# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Server
PORT=3001
NODE_ENV=development
```

---

## 🚀 Next Steps

1. **Fix MongoDB IP Whitelist** (if needed)
   - Go to MongoDB Atlas
   - Add your current IP
   - Restart: `npm run dev:full`

2. **Test with Large BOM**
   - Upload a CSV with 200+ parts
   - Watch the multi-model processing
   - Check logs for all 6 steps

3. **Monitor Learning**
   - Submit feedback corrections
   - Check: `curl http://localhost:3001/api/convert/learning/stats`
   - See AI improve over time

---

## 📞 Support

If you see errors:

1. Run `npm run verify` to diagnose
2. Check the output colors:
   - 🔵 `[OLLAMA]` - Ollama logs
   - 🟣 `[BACKEND]` - Backend logs
   - 🟢 `[HEALTH]` - Health check logs
3. Press `Ctrl+C` to stop everything
4. Fix the issue
5. Run `npm run dev:full` again

---

## ✨ Summary

You now have a **production-grade single-command startup system**!

```bash
# That's it!
npm run dev:full
```

Everything starts, monitors itself, and shuts down cleanly. 🎉
