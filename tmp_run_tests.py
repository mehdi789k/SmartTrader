import subprocess
import sys
from pathlib import Path

root = Path(r'd:\Nojom mali\robat metatreder5\Smart Tred')
python_exe = root / '.venv' / 'Scripts' / 'python.exe'
cmd = [str(python_exe), '-m', 'pytest', '-q', 'tests/test_symbol_timeframe_export.py', 'tests/test_symbol_timeframe_resolution.py', 'tests/test_symbol_data_export.py']
print('Running:', ' '.join(cmd))
completed = subprocess.run(cmd, cwd=root, capture_output=True, text=True)
print(completed.stdout)
print(completed.stderr)
raise SystemExit(completed.returncode)
