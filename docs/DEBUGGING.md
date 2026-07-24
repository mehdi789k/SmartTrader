# راهنمای دیباگ و جمع‌آوری لاگ — Smart Tred

هدف
- این سند راهنمای گام‌به‌گام برای بازتولید، ایزوله‌سازی، تشخیص ریشه و رفع خطاها در پروژهٔ «Smart Tred» (نرم‌افزار مالی با استفاده از MetaTrader 5 و Python) به زبان فارسی است.

چه چیزی ثبت شود (الگوی گزارش باگ)
- عنوان (Title):
- نسخه/شاخه (Affected version/branch):
- اولویت پیشنهادی: blocker / major / minor
- قدم‌های بازتولید (Steps to reproduce): شماره‌گذاریِ گام‌ها با ورودی‌ها و زمان‌ها
- رفتار مورد انتظار (Expected behavior):
- رفتار مشاهده‌شده (Actual behavior):
- لاگ‌ها و استک‌ترِیس (attach): مسیر فایل‌ها یا بخش‌های کلیدی
- نمونهٔ کمینهٔ بازتولید (Minimal repro): قطعه‌کد یا فایل ورودی
- اطلاعات محیط: نسخهٔ Python، نسخهٔ MT5، سیستم‌عامل، اکانت MT5 (شناسه)، EA name

قواعد عمومی جمع‌آوری لاگ
- فرمت پیشنهادی لاگ: JSON ساختاریافته با فیلدهای زیر:
  - `timestamp` (ISO8601)
  - `level` (DEBUG/INFO/WARN/ERROR)
  - `module`، `func`
  - `symbol`, `timeframe`
  - `order_id`/`ticket`, `side`, `price`, `volume`
  - `mt5_account`, `ea_name`, `correlation_id`
  - `message`, `stack_trace` (در صورت وجود)
- لاگ‌های پایتون را همراه با لاگ‌های متاتریدر (terminal/expert logs) جمع‌آوری کنید.
- هر لاگ ورودی/خروجی به سرور یا اجرای سفارش باید حاوی `correlation_id` باشد تا بتوان رخدادهای مرتبط را دنبال کرد.

نمونهٔ سریع: تنظیم لاگر پایتون (JSON)
```python
import logging
import json

class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'module': record.module,
            'func': record.funcName,
            'message': record.getMessage(),
        }
        if record.exc_info:
            payload['stack_trace'] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)

handler = logging.FileHandler('logs/ea.log', encoding='utf-8')
handler.setFormatter(JsonFormatter())
logger = logging.getLogger('smarttred')
logger.setLevel(logging.DEBUG)
logger.addHandler(handler)

logger.info('EA started', extra={'symbol':'EURUSD', 'timeframe':'M1'})
```

گام‌های دیباگ پیشنهادی
1. ثبت گزارش اولیه با تمام فیلدهای بالا.
2. تلاش برای بازتولید محلی طبق قدم‌ها.
   - اگر بازتولید شد → گام 3.
   - اگر نشد → از گزارش‌دهنده درخواست نمونهٔ ورودی یا ویدئو/لاگ بیشتر کنید.
3. ایزوله‌سازی: نمونهٔ کمینه بسازید (minimal repro).
4. اجرای تست‌های واحد/یکپارچه محلی و افزودن لاگ‌های بیشتر در نقاط مشکوک.
5. استفاده از git bisect در صورت احتمال مرتبط بودن commitها.
6. شناسایی ریشه و پیشنهاد fix یا workaround.
7. نوشتن تست خودکار که مشکل را پوشش دهد، و اجرای CI.
8. ارسال PR همراه با توضیحات، لینک issue و چک‌لیست QA.

چک‌لیست سریع برای ارسال issue
- عنوان واضح و مختصر
- قدم‌های بازتولید با نمونه‌ورودی
- لاگ‌های مرتبط (ضمیمه یا لینک به فایل)
- اطلاعات محیط
- پیشنهاد اولویت

چک‌لیست PR قبل از merge
- توضیح مشکل و راه‌حل
- لینک به issue
- تست‌های خودکار اضافه شده یا اصلاح شده
- مستندات (`docs/DEBUGGING.md`) به‌روز شده
- حداقل یک ریویور و علامت CI سبز

نکات مخصوص MetaTrader5
- ترمینال MT5 را با فعال‌سازی logging و خروجی فایل پیکربندی کنید.
- جمع‌آوری لاگ Expert و Journal از پوشهٔ ترمینال (متداول: MQL5/Logs یا terminal logs).
- هنگام بازتولید، زمان دقیق سرور و timezone را ثبت کنید.

دستورات پیشنهادی برای جمع‌آوری سریع لاگ
- لیست آخرین فایل‌های لاگ در ویندوز (PowerShell):
```powershell
Get-ChildItem -Path "C:\Users\%USERNAME%\AppData\Roaming\MetaQuotes\Terminal\*\MQL5\Logs" -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 20
```

پیشنهادهای توسعه‌ای
- ایجاد قالب issue در `.github/ISSUE_TEMPLATE/bug_report.md` با فیلدهای بالا.
- اضافه کردن اسکریپت `tools/collect_logs.py` برای جمع‌آوری خودکار لاگ‌ها و بسته‌بندی آن‌ها برای ارسال.
- ادغام اجرای تست‌های جدید با CI قبل از merge.

تماس و نگهداری
- نگهدارنده سند: تیم فنی
- تاریخ ایجاد: 2026-07-17
