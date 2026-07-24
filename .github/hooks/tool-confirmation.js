const fs = require('fs');

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  try {
    const raw = await readStdin();
    const input = raw ? JSON.parse(raw) : {};
    const toolName = input.toolName || 'ابزار نامشخص';
    const prompt = input.userPrompt || '';

    const message = `تأیید قبل از اجرای ابزار: ${toolName}\nمتن درخواست کاربر: ${prompt}`;
    const output = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: message
      }
    };

    process.stdout.write(JSON.stringify(output));
    process.exit(0);
  } catch (err) {
    console.error('خطا در Hook:', err.message);
    process.exit(2);
  }
}

main();
