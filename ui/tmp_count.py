from pathlib import Path
p=Path('src/pages/DashboardPage.jsx')
s=p.read_text(encoding='utf-8')
print('len',len(s))
for ch in ['{','}','`','\"','\'"'",'/']:
    print(ch, s.count(ch))
