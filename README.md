# BOMForge AI Backend

**AI-powered BOM (Bill of Materials) conversion service** - Transform Engineering BOMs (eBOM) into Manufacturing BOMs (mBOM) using Groq AI.

---

## 🚀 Features

- **File Upload** - Support for Excel (.xlsx, .xls) and CSV formats
- **AI Conversion** - Powered by Groq AI (llama-3.3-70b-versatile model)
- **Real-time Processing** - Track conversion progress with live updates
- **Explainable AI** - Detailed reasoning for each transformation
- **MongoDB Integration** - Flexible NoSQL database for BOM data
- **RESTful API** - 10 comprehensive endpoints
- **Manufacturing Intelligence** - Automatic work center assignment, tooling detection, and sub-assembly grouping

---

## 📋 Prerequisites

- **Node.js** 18+ 
- **MongoDB** 5.0+ (local or Atlas)
- **Groq API Key** - Get from [console.groq.com](https://console.groq.com/keys)

---

## 🔧 Installation

### 1. Clone Repository
```bash
git clone https://github.com/krnkiran22/BomForge_AI_backend.git
cd BomForge_AI_backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create `.env` file:
```env
# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/bomforge

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### 4. Install MongoDB

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Linux:**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**Or use MongoDB Atlas (cloud):**
- Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Create free cluster
- Get connection string and update `MONGODB_URI` in `.env`

---

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

Server will start on `http://localhost:3001`

### Production Build
```bash
npm run build
npm start
```

---

## 📡 API Endpoints

### Upload
- `POST /api/upload` - Upload BOM file

### Conversion
- `POST /api/convert` - Start BOM conversion
- `GET /api/convert/status/:id` - Get conversion status
- `GET /api/convert/bom/:id` - Get BOM data (eBOM + mBOM)
- `GET /api/convert/explanation/:id` - Get AI reasoning
- `PATCH /api/convert/bom/:id` - Save BOM edits
- `POST /api/convert/feedback` - Submit user feedback

### History
- `GET /api/history` - Get conversion history (paginated)
- `DELETE /api/history/:id` - Delete conversion

### Health
- `GET /health` - Health check (includes DB status)

---

## 📚 Technology Stack

- **Framework:** Express.js + TypeScript
- **Database:** MongoDB + Mongoose ODM
- **AI Service:** Groq Cloud API (llama-3.3-70b-versatile)
- **File Processing:** Multer, xlsx, papaparse
- **Validation:** Zod
- **Logging:** Custom logger utility

---

## 📊 Database Schema

### Collections

**uploads**
- File metadata (name, path, size, type)

**conversions**
- Conversion status and progress
- eBOM and mBOM data
- AI explanations and confidence scores

**feedbacks**
- User corrections for AI learning

---

## 🔍 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts           # MongoDB connection
│   ├── controllers/
│   │   ├── upload.controller.ts  # File upload logic
│   │   ├── convert.controller.ts # Conversion logic
│   │   └── history.controller.ts # History management
│   ├── middleware/
│   │   ├── error.middleware.ts   # Error handling
│   │   └── upload.middleware.ts  # Multer config
│   ├── models/
│   │   └── schemas.ts            # Mongoose schemas
│   ├── routes/
│   │   ├── upload.routes.ts
│   │   ├── convert.routes.ts
│   │   └── history.routes.ts
│   ├── services/
│   │   ├── groq.service.ts       # AI integration
│   │   ├── parser.service.ts     # File parsing
│   │   └── database.service.ts   # DB operations
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   ├── utils/
│   │   ├── logger.ts             # Logging utility
│   │   └── helpers.ts            # Helper functions
│   └── index.ts                  # Main server file
├── uploads/                       # Uploaded files
├── .env                           # Environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Upload File
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "bomFile=@path/to/your/bom.csv"
```

### Start Conversion
```bash
curl -X POST http://localhost:3001/api/convert \
  -H "Content-Type: application/json" \
  -d '{"uploadId": "your-upload-id"}'
```

---

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
brew services list | grep mongodb  # macOS
sudo systemctl status mongod        # Linux

# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change PORT in .env
```

### Groq API Errors
- Verify `GROQ_API_KEY` in `.env`
- Check rate limits at [console.groq.com](https://console.groq.com)

---

## 📈 Performance

- **Conversion Speed:** 5-15 seconds for 200-300 part BOMs
- **File Size Limit:** 10MB
- **Supported Formats:** .xlsx, .xls, .csv
- **Max Parts:** 500+ (depends on Groq token limits)

---

## 🔐 Security

- File validation (type and size)
- Environment variable protection
- Error sanitization
- CORS configuration
- Input validation with Zod

---

## 📝 License

MIT

---

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/krnkiran22/BomForge_AI_backend/issues)
- **Documentation:** See migration guides in root directory

---

## 🔗 Related Repositories

- **Frontend:** [BOMForge AI Frontend](https://github.com/krnkiran22/BomForge_AI_frontend)

---

**Built with ❤️ using Groq AI and MongoDB**

