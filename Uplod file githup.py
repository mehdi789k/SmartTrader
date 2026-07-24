import os
import subprocess
import sys
import time

LOG_FILE = "git_auto_upload.log"

def log(msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{time.ctime()} - {msg}\n")
    print(msg)

def run(cmd):
    log(f">>> اجرای دستور: {cmd}")
    result = subprocess.run(cmd, shell=True, text=True)
    if result.returncode != 0:
        log(f"⚠️ خطا در اجرای دستور: {cmd}")
    return result.returncode

def check_git():
    if run("git --version") != 0:
        log("❌ Git نصب نیست یا در PATH نیست.")
        sys.exit()

def ensure_repo():
    if not os.path.exists(".git"):
        log("📌 پوشه گیت ندارد → ساخت ریپازیتوری جدید...")
        run("git init")
    else:
        log("✔ پوشه دارای گیت است → بررسی سلامت...")
        if run("git status") != 0:
            log("⚠ پوشه گیت خراب است → بازسازی...")
            run("rmdir /s /q .git")
            run("git init")

def ensure_remote(url):
    run("git remote remove origin")
    run(f"git remote add origin {url}")

def ensure_branch():
    log("📌 بررسی برنچ فعلی...")
    result = subprocess.run("git branch --show-current", shell=True, capture_output=True, text=True)
    branch = result.stdout.strip()

    if branch == "":
        log("⚠ هیچ برنچی فعال نیست → ساخت برنچ main")
        run("git checkout -b main")
        return "main"

    log(f"✔ برنچ فعلی: {branch}")
    return branch

def auto_resolve_conflicts():
    log("📌 تلاش برای حل خودکار کانفلیکت‌ها...")
    run('git merge --strategy-option theirs')
    run('git add .')
    run('git commit -m "Auto-resolved merge conflicts"')

def main():
    print("=== نسخه پیشرفته انتقال پروژه‌های بزرگ به GitHub ===")

    github_url = input("لینک ریپازیتوری GitHub را وارد کنید: ").strip()

    check_git()
    ensure_repo()
    ensure_remote(github_url)

    branch = ensure_branch()

    log("📌 اضافه کردن همه فایل‌ها...")
    run("git add .")

    log("📌 کامیت تغییرات...")
    run('git commit -m "Enterprise Auto Upload"')

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

    log("\n🎉 نسخه پیشرفته با موفقیت اجرا شد!")

if __name__ == "__main__":
    main()
