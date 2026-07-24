import os
import sys
import uvicorn

if __name__ == '__main__':
    project_root = r'D:\Nojom mali\robat metatreder5\Smart Tred1'
    app_dir = os.path.join(project_root, 'app')
    os.chdir(project_root)
    sys.path.insert(0, project_root)
    sys.path.insert(0, app_dir)
    from app.main import app
    uvicorn.run(app, host='0.0.0.0', port=8000, reload=False)
