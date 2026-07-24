"""
API اصلی Smart Tred
Main Smart Tred API
"""

import logging
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from .api import router
from .api.v1 import settings as settings_router
from .api.v1 import data_management as data_router
from .config import config
from .core.mt5_service import mt5_service

# تنظیم لاگر
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ایجاد اپلیکیشن FastAPI
app = FastAPI(
    title=config.API_TITLE,
    description=config.API_DESCRIPTION,
    version=config.API_VERSION,
)

# تنظیم CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(settings_router.router)
app.include_router(data_router.router)

# ========================
# Frontend SPA routes
# ========================

@app.get("/")
async def serve_frontend():
    """Serve frontend index.html"""
    dist_dir = Path(__file__).parent.parent / "ui" / "dist" / "index.html"
    if dist_dir.exists():
        return FileResponse(dist_dir, media_type="text/html")
    return JSONResponse({"error": "Frontend not built"}, status_code=404)

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve SPA - fallback to index.html for client-side routing"""
    # Skip API routes
    if full_path.startswith("api"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    
    # Try to serve file from dist
    dist_file = Path(__file__).parent.parent / "ui" / "dist" / full_path
    if dist_file.exists() and dist_file.is_file():
        return FileResponse(dist_file)
    
    # Fallback to index.html for client-side routing
    index_file = Path(__file__).parent.parent / "ui" / "dist" / "index.html"
    if index_file.exists():
        return FileResponse(index_file, media_type="text/html")
    
    return JSONResponse({"detail": "Not Found"}, status_code=404)

# ========================
# مدیریت خطاها
# ========================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "خطای داخلی سرور",
        },
    )

# ========================
# رویدادهای Startup/Shutdown
# ========================

@app.on_event("startup")
async def startup_event():
    logger.info("Smart Tred API starting...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Smart Tred API shutting down...")
    mt5_service.shutdown()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=config.API_HOST,
        port=config.API_PORT,
        log_level=config.LOG_LEVEL.lower(),
    )
