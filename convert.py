import re

with open('hagatna_plain.sql', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"\\'", "''", content)
content = re.sub(r'`', '"', content)
content = re.sub(r' ENGINE=\S+', '', content)
content = re.sub(r' DEFAULT CHARSET=\S+', '', content)
content = re.sub(r' COLLATE[\s=]\S+', '', content)
content = re.sub(r'\bunsigned\b', '', content)
content = re.sub(r'AUTO_INCREMENT=\d+', '', content)
content = re.sub(r'\bAUTO_INCREMENT\b', '', content)
content = re.sub(r'\bint\(\d+\)', 'INTEGER', content)
content = re.sub(r'\btinyint\(\d+\)', 'SMALLINT', content)
content = re.sub(r'\bdatetime\b', 'TIMESTAMP', content, flags=re.IGNORECASE)

with open('hagatna_converted.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ تم التحويل! الملف: hagatna_converted.sql")
