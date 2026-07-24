"""
اسکریپت راه‌اندازی برای اپلیکیشن Smart Tred
Setup script for Smart Tred Application
"""

import os
import sys
import subprocess
from pathlib import Path

def setup_backend():
    """Setup Python backend"""
    print("\n" + "="*50)
    print("تنظیم Backend Python")
    print("Setting up Python Backend")
    print("="*50)
    
    backend_dir = Path(__file__).parent / 'app'
    os.chdir(backend_dir)
    
    # Create virtual environment
    print("\n1. Creating virtual environment...")
    subprocess.run([sys.executable, '-m', 'venv', 'venv'], check=True)
    
    # Determine activation script
    if sys.platform == 'win32':
        pip_exe = backend_dir / 'venv' / 'Scripts' / 'pip.exe'
    else:
        pip_exe = backend_dir / 'venv' / 'bin' / 'pip'
    
    # Install dependencies
    print("2. Installing dependencies...")
    subprocess.run([str(pip_exe), 'install', '-r', 'requirements.txt'], check=True)
    
    # Copy .env
    if not (backend_dir / '.env').exists():
        print("3. Creating .env file...")
        subprocess.run(['copy', '.env.example', '.env'], check=True)
    
    print("\n✅ Backend setup completed!")

def setup_frontend():
    """Setup React frontend"""
    print("\n" + "="*50)
    print("تنظیم Frontend React")
    print("Setting up React Frontend")
    print("="*50)
    
    frontend_dir = Path(__file__).parent / 'ui'
    os.chdir(frontend_dir)
    
    # Check for npm
    try:
        subprocess.run(['npm', '--version'], capture_output=True, check=True)
    except:
        print("❌ npm not found! Please install Node.js first")
        return False
    
    # Install dependencies
    print("\n1. Installing npm dependencies...")
    subprocess.run(['npm', 'install'], check=True)
    
    print("\n✅ Frontend setup completed!")
    return True

def main():
    """Main setup function"""
    print("\n")
    print("╔════════════════════════════════════════╗")
    print("║       Smart Tred Setup Wizard          ║")
    print("║  راهنمای راه‌اندازی Smart Tred        ║")
    print("╚════════════════════════════════════════╝")
    
    try:
        setup_backend()
        setup_frontend()
        
        print("\n" + "="*50)
        print("✅ Setup completed successfully!")
        print("="*50)
        print("\nNext steps:")
        print("1. Edit app/.env with your settings")
        print("2. Start backend: cd app && python -m uvicorn main:app --reload")
        print("3. Start frontend: cd ui && npm run dev")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
