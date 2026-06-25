import re

with open('hagatna_plain.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# إزالة MySQL-specific syntax
content = re.sub(r'\\r\\n', '\n', content)
content = re.sub(r"\\'", "''", content)          # escape single quotes
content = re.sub(r'`', '"', content)              # backticks → double quotes
content = re.sub(r' ENGINE=\S+', '', content)     # إزالة ENGINE=InnoDB
content = re.sub(r' DEFAULT CHARSET=\S+', '', content)
content = re.sub(r' COLLATE=\S+', '', content)
content = re.sub(r'unsigned', '', content)
content = re.sub(r'AUTO_INCREMENT=\d+', '', content)
content = re.sub(r'AUTO_INCREMENT', 'SERIAL', content)
content = re.sub(r'int\(\d+\)', 'INTEGER', content)
content = re.sub(r'tinyint\(\d+\)', 'SMALLINT', content)

with open('hagatna_converted.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("تم التحويل! الملف: hagatna_converted.sql")

11:20 AMClaude responded: المشكلة واضحة!المشكلة واضحة! الـ table مش فيها column اسمه type - اتحذف أو اتسمى حاجة تانية لما الـ schema اتعمل على السيرفر.
شغّل الأمر ده عشان تضيف الـ column الناقص: