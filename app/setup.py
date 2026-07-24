from setuptools import setup

setup(
    name="smarttred-backend",
    version="0.1.0",
    description="Smart Tred FastAPI backend for MetaTrader5",
    packages=["app", "app.api", "app.config", "app.core", "app.utils"],
    package_dir={"app": "."},
    install_requires=[
        "fastapi==0.104.1",
        "uvicorn==0.24.0",
        "python-multipart==0.0.6",
        "pydantic==2.5.0",
        "pydantic-settings==2.1.0",
        "MetaTrader5==5.0.47",
        "python-jose[cryptography]==3.3.0",
        "passlib[bcrypt]==1.7.4",
        "python-dotenv==1.0.0",
        "aiofiles==23.2.1",
        "cors==1.0.1",
        "httpx==0.25.2",
    ],
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "Framework :: FastAPI",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
)
