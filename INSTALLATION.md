# Smart Tred - Installation Guide

## سریع شروع - Quick Start

### Windows Setup

1. **Install Dependencies:**
   ```bash
   # Python 3.8+ and Node.js 16+ should be installed
   ```

2. **Backend Setup:**
   ```bash
   cd app
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   pip install -e .
   copy .env.example .env
   ```

3. **Frontend Setup:**
   ```bash
   cd ui
   npm install
   ```

4. **Run Both Services:**
   
   **Terminal 1 - Backend:**
   ```bash
   cd app
   venv\Scripts\activate
   python -m uvicorn main:app --reload --port 8000
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd ui
   npm run dev
   ```

5. **Access Application:**
   - Frontend: http://localhost:3000 or http://localhost:5173
   - API Docs: http://localhost:8000/docs

## Configuration Files

### Backend `.env`
```env
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
MT5_PATH=
MT5_TIMEOUT=5000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=INFO
```

### Frontend `.env.local` (Optional)
```env
VITE_API_BASE_URL=http://localhost:8000
```

## MetaTrader5 Configuration

1. Ensure MT5 is installed and running
2. Have a demo/live account ready
3. Note your account number and password
4. Know your server address (e.g., ICMarketsSC-Demo)

## Troubleshooting

### Python Issues
- Ensure Python 3.8+ installed
- Virtual environment activated before pip install
- MetaTrader5 module requires Windows platform

### Node.js Issues
- Ensure Node.js 16+ installed
- npm cache clean if dependencies fail

### Connection Issues
- Backend must run on port 8000
- Frontend configured to proxy /api to backend
- Check firewall settings
