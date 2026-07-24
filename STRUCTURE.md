# Smart Tred - Root Directory Structure

## 📂 Organization

```
Smart Tred/
│
├── 📄 README.md              # Main project overview
├── 📄 docker-compose.yml     # Docker configuration
│
├── 📁 app/                   # Python Backend package
│   ├── __init__.py          # Package entrypoint / convenience imports
│   ├── main.py              # FastAPI server
│   ├── api/                 # API routes and endpoints
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── config/              # Configuration and settings
│   │   ├── __init__.py
│   │   └── settings.py
│   ├── core/                # Core services and models
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── logger.py
│   │   ├── models.py
│   │   └── mt5_service.py
│   ├── requirements.txt     # Dependencies
│   ├── pyproject.toml       # Package metadata
│   ├── setup.py             # Installable package setup script
│   ├── .env.example         # Environment template
│   ├── Dockerfile           # Container definition
│   └── logs/                # Application logs
│
├── 📁 ui/                    # React Frontend
│   ├── src/                 # Source code
│   │   ├── main.jsx         # Entry point
│   │   ├── App.jsx          # Main app
│   │   ├── api.js           # API client
│   │   ├── store.js         # State management
│   │   ├── components/      # React components
│   │   ├── pages/           # Pages (Login, Dashboard)
│   │   └── styles/          # CSS/Tailwind
│   ├── package.json         # Dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── tailwind.config.js   # Tailwind config
│   ├── index.html           # HTML template
│   ├── Dockerfile           # Container definition
│   └── dist/                # Built output
│
├── 📁 docs/                  # Documentation
│   ├── INDEX.md             # Documentation index
│   ├── START_HERE.md        # Quick start
│   ├── QUICKSTART.md        # Quick reference
│   ├── SETUP_GUIDE.md       # Detailed setup
│   ├── INSTALLATION.md      # Installation steps
│   ├── API_REFERENCE.md     # API documentation
│   ├── PROJECT_MANIFEST.md  # Project details
│   ├── DOCKER.md            # Docker guide
│   └── DEBUGGING.md         # Debugging guide (Persian)
│
├── 📁 scripts/              # Launch & Setup Scripts
│   ├── run.bat              # Windows launcher
│   ├── run.sh               # Unix launcher
│   ├── setup.py             # Setup wizard
│   └── README.md            # Scripts documentation
│
├── 📁 tests/                # Test artifacts
│   └── hook_test_runs/      # Test results
│
└── 📁 archive/              # Legacy files

```

## 🎯 Key Files by Purpose

### Start Here
- `README.md` - Main documentation
- `docker-compose.yml` - Docker setup

### Documentation
- All docs in `docs/` folder
- Start with `docs/INDEX.md` or `docs/START_HERE.md`

### Launch Scripts
- Windows: `scripts/run.bat`
- Mac/Linux: `scripts/run.sh`
- Setup: `scripts/setup.py`

### Application Code
- Backend: `app/` folder
- Frontend: `ui/` folder

## 🚀 Quick Start

```bash
# Windows
scripts\run.bat

# Mac/Linux
bash scripts/run.sh

# Docker
docker-compose up
```

## 📚 Navigation

| What to do | Where |
|-----------|-------|
| Start project | `docs/START_HERE.md` |
| Quick setup | `scripts/run.bat` or `scripts/run.sh` |
| Full guide | `docs/SETUP_GUIDE.md` |
| API info | `docs/API_REFERENCE.md` |
| Docker setup | `docs/DOCKER.md` |
| All docs | `docs/INDEX.md` |

---

**Clean, organized, and ready to use! 🎯**
