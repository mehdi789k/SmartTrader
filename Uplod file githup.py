import os
import subprocess
import sys
import time
import socket

LOG_FILE = "git_ultra_enterprise.log"

def log(msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{time.ctime()} - {msg}\n")
    print(msg)

def run(cmd, fatal=False):
    log(f">>> {cmd}")
    result = subprocess.run(cmd, shell=True, text=True)
    if result.returncode != 0:
        log(f"⚠️ خطا در اجرای دستور: {cmd}")
        if fatal:
            log("❌ اجرای اسکریپت متوقف شد.")
            sys.exit(result.returncode)
    return result.returncode

# -----------------------------
# 1) بررسی اینترنت
# -----------------------------
def check_internet():
    log("📡 بررسی اتصال اینترنت...")
    try:
        socket.create_connection(("github.com", 443), timeout=5)
        log("✔ اینترنت برقرار است.")
    except:
        log("❌ اینترنت قطع است یا GitHub در دسترس نیست.")
        sys.exit()

# -----------------------------
# 2) بررسی نصب بودن Git
# -----------------------------
def check_git():
    log("🔍 بررسی نصب بودن Git...")
    if run("git --version") != 0:
        log("❌ Git نصب نیست یا در PATH نیست.")
        sys.exit()
    log("✔ Git نصب است.")

# -----------------------------
# 3) بررسی سالم بودن ریپازیتوری
# -----------------------------
def ensure_repo():
    if not os.path.exists(".git"):
        log("📌 پوشه گیت ندارد → ساخت ریپازیتوری جدید...")
        run("git init", fatal=True)
    else:
        log("✔ پوشه دارای گیت است → بررسی سلامت...")
        if run("git status") != 0:
            log("⚠ پوشه گیت خراب است → بازسازی...")
            run("rmdir /s /q .git")
            run("git init", fatal=True)

# -----------------------------
# 4) مدیریت هوشمند ریموت‌ها
# -----------------------------
def ensure_remote(url):
    log("🔗 تنظیم ریموت origin...")
    run("git remote remove origin")
    run(f"git remote add origin {url}", fatal=True)
    log("✔ ریموت origin تنظیم شد.")

# -----------------------------
# 5) تشخیص برنچ فعلی
# -----------------------------
def ensure_branch():
    log("📌 بررسی برنچ فعلی...")
    result = subprocess.run("git branch --show-current", shell=True, capture_output=True, text=True)
    branch = result.stdout.strip()

    if branch == "":
        log("⚠ هیچ برنچی فعال نیست → ساخت برنچ main")
        run("git checkout -b main", fatal=True)
        return "main"

    log(f"✔ برنچ فعلی: {branch}")
    return branch

# -----------------------------
# 6) فعال‌سازی Git LFS برای فایل‌های بزرگ
# -----------------------------
def enable_lfs():
    log("📦 بررسی فایل‌های بزرگ برای Git LFS...")
    large_files = []

    for root, dirs, files in os.walk("."):
        for file in files:
            path = os.path.join(root, file)
            if os.path.getsize(path) > 50 * 1024 * 1024:  # بزرگ‌تر از 50MB
                large_files.append(path)

    if large_files:
        log("⚠ فایل‌های بزرگ شناسایی شدند → فعال‌سازی Git LFS")
        run("git lfs install")
        for lf in large_files:
            run(f"git lfs track \"{lf}\"")
        run("git add .")
        log("✔ Git LFS فعال شد.")
    else:
        log("✔ هیچ فایل بزرگی یافت نشد.")

# -----------------------------
# 7) حل خودکار کانفلیکت‌ها
# -----------------------------
def auto_resolve_conflicts():
    log("⚔ تلاش برای حل خودکار کانفلیکت‌ها...")
    run('git merge --strategy-option theirs')
    run('git add .')
    run('git commit -m "Auto-resolved merge conflicts"')
    log("✔ کانفلیکت‌ها حل شدند.")

# -----------------------------
# 8) اجرای اصلی
# -----------------------------
def main():
    print("=== Ultra Enterprise GitHub Uploader ===")

    github_url = input("لینک ریپازیتوری GitHub را وارد کنید: ").strip()

    check_internet()
    check_git()
    ensure_repo()
    ensure_remote(github_url)

    branch = ensure_branch()

    enable_lfs()

    log("📌 اضافه کردن همه فایل‌ها...")
    run("git add .")

    log("📌 کامیت تغییرات...")
    run('git commit -m "Ultra Enterprise Auto Upload"')

    log("📌 Pull برای جلوگیری از کانفلیکت...")
    pull_code = run(f"git pull origin {branch} --allow-unrelated-histories")

    if pull_code != 0:
        log("⚠ کانفلیکت شناسایی شد → تلاش برای حل خودکار...")
        auto_resolve_conflicts()

    log("📌 پوش نهایی...")
    push_code = run(f"git push -u origin {branch}")

    if push_code != 0:
        log("⚠ پوش ناموفق → تلاش با برنچ main")
        run("git branch -M main")
        run("git push -u origin main")

    log("\n🎉 عملیات Ultra Enterprise با موفقیت انجام شد!")

if __name__ == "__main__":
    main()
