#!/usr/bin/env python3
"""
Parse punishment PDF into JSON. The PDF has a table layout where institution
names and other fields may span multiple lines. We parse each "record block"
anchored by the date line and collect surrounding context lines.
"""
import json
import os
import re
import subprocess

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)
pdf_path = os.path.join(project_dir, 'raw', 'punishment.pdf')
out_path = os.path.join(project_dir, 'data', 'punishment.json')

result = subprocess.run(
    ['pdftotext', '-layout', pdf_path, '-'],
    capture_output=True, text=True
)
text = result.stdout

date_re = re.compile(r'\d{2,3}年\d{1,2}月\d{1,2}日')
inst_re = re.compile(r'((?:私立|市立|縣立|國軍|財團|社團|有限|中華|天主教)[\S]*(?:長照機構|長照服務機構|長期照顧機構|長期照顧服務機構|養護之家|養護中心|安養護機構|老人養護中心|照護中心|服務機構))')
fine_re = re.compile(r'(\d+萬(?:5千)?(?:元)?(?:及\d+萬元)?)')
law_re = re.compile(r'(違反長期照顧服務法[^\s,，]*)')

lines = text.split('\n')

blocks = []
current_city = ''

i = 0
while i < len(lines):
    line = lines[i]

    left = line[:8].strip()
    if left and not any(c.isdigit() for c in left) and '違' not in left and '頁' not in left and '裁' not in left and '縣市' not in left and '各' not in left and len(left) <= 4:
        current_city = left

    dm = date_re.search(line)
    if dm:
        block_lines = []
        j = i - 1
        while j >= 0 and j >= i - 3:
            prev = lines[j].strip()
            if not prev or date_re.search(prev) or '尚無' in prev:
                break
            pl = prev[:8].strip()
            if pl and not any(c.isdigit() for c in pl) and len(pl) <= 4 and not inst_re.search(prev):
                break
            block_lines.insert(0, lines[j])
            j -= 1

        block_lines.append(line)

        k = i + 1
        while k < len(lines) and k <= i + 4:
            nxt = lines[k].strip()
            if not nxt or date_re.search(nxt) or '尚無' in nxt:
                break
            nl = nxt[:8].strip()
            if nl and not any(c.isdigit() for c in nl) and len(nl) <= 4 and not inst_re.search(nxt):
                break
            block_lines.append(lines[k])
            k += 1

        block_text = ' '.join(l for l in block_lines)
        blocks.append((current_city, dm.group(0), block_text))
        i = max(k, i + 1)
    else:
        i += 1

entries = []
for city, date_str, block_text in blocks:
    im = inst_re.search(block_text)
    if not im:
        continue

    inst_name = im.group(1).strip()
    inst_name = re.sub(r'\s+', '', inst_name)

    if '未立案' in inst_name:
        continue

    lm = law_re.search(block_text)
    law_str = lm.group(1) if lm else ''

    fm = fine_re.search(block_text)
    fine_str = fm.group(1) if fm else ''

    reason = ''
    if lm:
        after_law = block_text[lm.end():]
        after_law = re.sub(r'\s+', '', after_law)
        after_law = fine_re.sub('', after_law).strip()
        reason_parts = []
        for segment in re.split(r'[。，]', after_law):
            segment = segment.strip()
            if segment and '第' not in segment[:2] and '頁' not in segment:
                reason_parts.append(segment)
        reason = '，'.join(reason_parts).rstrip('，')

    person = ''
    date_idx = block_text.find(date_str)
    after_date = block_text[date_idx + len(date_str):]
    name_start = after_date.find(inst_name)
    if name_start > 0:
        between = after_date[:name_start].strip()
    else:
        between = ''

    name_end = after_date.find(inst_name) + len(inst_name) if inst_name in after_date else 0
    if name_end > 0:
        after_name = after_date[name_end:].strip()
        pm = re.match(r'\s*(\S{2,4})\s+違反', after_name)
        if pm:
            person = pm.group(1)
    if not person and lm:
        before_law = block_text[:lm.start()]
        pm2 = re.search(r'(\S{2,4})\s*$', before_law.strip())
        if pm2 and not inst_re.search(pm2.group(1)):
            person = pm2.group(1)

    entries.append({
        'name': inst_name,
        'date': date_str,
        'city': city,
        'person': person,
        'law': law_str,
        'reason': reason,
        'fine': fine_str
    })

records = {}
for e in entries:
    name = e['name']
    if name not in records:
        records[name] = []
    records[name].append({
        'date': e['date'],
        'city': e['city'],
        'person': e['person'],
        'law': e['law'],
        'reason': e['reason'],
        'fine': e['fine']
    })

output = []
for name, punishments in records.items():
    output.append({'name': name, 'punishments': punishments})

os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

total_p = sum(len(r['punishments']) for r in output)
print(f'Extracted {len(output)} institutions with {total_p} punishment records')
