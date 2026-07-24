import os
import subprocess

def run(cmd):
    print(f"\n>>> {cmd}")
    result = subprocess.run(cmd, shell=True)
    return result.returncode

def main():
    print("=== انتقال خودکار فایل‌ها به GitHub ===")

    github_url = input("لینک ریپازیتوری GitHub را وارد کنید: ").strip()

    # بررسی اینکه گیت نصب است
    if run("git --version") != 0:
        print("❌ Git روی سیستم نصب نیست یا در PATH نیست.")
        return

    # بررسی اینکه پوشه گیت دارد
    if not os.path.exists(".git"):
        print("📌 پوشه گیت ندارد → در حال ساخت ریپازیتوری جدید...")
        run("git init")
    else:
        print("✔️ پوشه دارای گیت است، بررسی صحت...")
        if run("git status") != 0:
            print("⚠️ پوشه گیت خراب است → در حال ساخت مجدد...")
            run("rmdir /s /q .git")
            run("git init")

    # تنظیم ریموت
    run("git remote remove origin")
    run(f"git remote add origin {github_url}")

    # اضافه کردن فایل‌ها
    run("git add .")

    # کامیت
    run('git commit -m "Auto upload"')

    # پوش
    run("git branch -M main")
    run("git push -u origin main")

    print("\n🎉 همه فایل‌ها با موفقیت منتقل شدند!")

if __name__ == "__main__":
    main()
