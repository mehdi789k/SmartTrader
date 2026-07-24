# Quick Start Guide - راهنمای سریع شروع

## خلاصه / Summary

یک رابط کاربری وب حرفه‌ای برای اتصال به MetaTrader5 و مدیریت حساب‌های تجاری.

A professional web interface to connect to MetaTrader5 and manage trading accounts.

## Features / ویژگی‌ها

✅ Professional login interface - رابط ورود حرفه‌ای
✅ Real-time account data - اطلاعات حساب بلادرنگ
✅ Position management - مدیریت موقعیت‌ها
✅ Order monitoring - نظارت بر سفارش‌ها
✅ Responsive design - طراحی پاسخگو
✅ Secure JWT auth - احراز هویت ایمن
✅ Auto-refresh - تازه‌سازی خودکار

## Installation / نصب

### Prerequisites / پیش‌نیازها
- Python 3.8+
- Node.js 16+
- MetaTrader5 installed - نصب‌شده بر روی سیستم
- Windows OS (for MT5)

### Step 1: Clone/Download the project
```bash
cd "d:/Nojom mali/robat metatreder5/Smart Tred"
```

### Step 2: Backend Setup
```bash
cd app

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Optional: install backend as editable package
pip install -e .

# Setup environment
copy .env.example .env
```

### Step 3: Frontend Setup
```bash
cd ../ui

# Install dependencies
npm install
```

## Running / اجرا

### Method 1: Windows Batch File
```bash
# From project root
run.bat
```

### Method 2: Manual Start

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

### Method 3: Docker
```bash
docker-compose up
```

## Access / دسترسی

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| API Redoc | http://localhost:8000/redoc |

## Login / ورود

1. Navigate to http://localhost:3000
2. Enter your MetaTrader5 credentials:
   - Account number
   - Password
   - Server (Demo/Live)
3. Click Login

## Common Issues / مشاکل رایج

### Issue: "MetaTrader5 not found"
**Solution:** Ensure MT5 is running on your Windows machine

### Issue: "Connection refused"
**Solution:** Check if backend is running on port 8000

### Issue: CORS errors
**Solution:** Ensure CORS_ORIGINS in `.env` includes frontend URL

### Issue: Login fails
**Solution:** Verify credentials and selected server

## Project Structure / ساختار پروژه

```
Smart Tred/
├── app/              # Python FastAPI backend
├── ui/               # React frontend
├── docs/             # Documentation
├── README.md         # Full documentation
├── INSTALLATION.md   # Installation guide
├── API_REFERENCE.md  # API documentation
└── run.bat          # Quick launcher
```

## Building for Production / برای تولید

### Backend:
```bash
cd app
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Frontend:
```bash
cd ui
npm run build
# Output in ui/dist/
```

## Support / پشتیبانی

- Check `INSTALLATION.md` for detailed setup
- Check `API_REFERENCE.md` for API endpoints
- Check `docs/DEBUGGING.md` for troubleshooting

## Next Steps / مراحل بعدی

1. ✅ Installation completed
2. 📝 Customize server list in LoginPage.jsx
3. 🔒 Change SECRET_KEY for production
4. 📊 Add more dashboard widgets
5. 🔔 Implement real-time notifications
6. 📱 Build mobile version

---

**Ready to trade! راه‌اندازی شد!**
