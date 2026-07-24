"""
رشته‌های لاگ برای SmartTred
Logging configuration for SmartTred
"""

import logging
import logging.handlers
import os
from pathlib import Path
from ..config import config

# Create logs directory if it doesn't exist
log_dir = Path(config.LOG_FILE).parent
log_dir.mkdir(parents=True, exist_ok=True)

# Configure logger
logger = logging.getLogger('smarttred')
logger.setLevel(getattr(logging, config.LOG_LEVEL))

# File handler
file_handler = logging.handlers.RotatingFileHandler(
    config.LOG_FILE,
    maxBytes=10*1024*1024,  # 10 MB
    backupCount=5,
    encoding='utf-8'
)

# Console handler
console_handler = logging.StreamHandler()

# Formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers
logger.addHandler(file_handler)
logger.addHandler(console_handler)

def get_logger(name: str = 'smarttred'):
    """Get a logger instance"""
    return logging.getLogger(name)
