const { Client } = require('pg');
const { execSync } = require('child_process');

function isSectionHeader(line) {
  const trimmed = line.trim().replace(/^[\*\-•#\s]+/, '').trim();
  const headerPatterns = [
    /^(المواصفات الفنية|المواصفات الأساسية|المواصفات العامة|المواصفات|المميزات|أهم المميزات|الخصائص|مميزات المنتج)\s*:?$/i,
    /^(Technical Specifications|Specifications|General Specifications|Key Features|Features|Product Details)\s*:?$/i,
    /^(الأبعاد|الأبعاد والحجم|القياسات|Dimensions|Size & Dimensions)\s*:?$/i,
  ];
  return headerPatterns.some(p => p.test(trimmed));
}

function fixGluedSpec(str) {
  if (str.includes(':')) return str;
  let m = str.match(/^([A-Za-z\s]+?)([0-9]+(?:\.[0-9]+)?\s*.*)$/);
  if (m && m[1].trim().length >= 3) {
    return `${m[1].trim()}: ${m[2].trim()}`;
  }
  m = str.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)([A-Z][a-z].*)$/);
  if (m && m[1].trim().length >= 3 && m[2].trim().length >= 2) {
    return `${m[1].trim()}: ${m[2].trim()}`;
  }
  return str;
}

function parseFaq(text) {
  const items = [];
  const regex = /[\*\-•]?\s*(?:س|Q):\s*(.+?)(?:[\r\n]+\s*|\s+)(?:ج|A):\s*(.+?)(?=(?:[\r\n]+\s*[\*\-•]?\s*(?:س|Q):|$))/gis;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const q = match[1].trim();
    let a = match[2].trim().replace(/[\r\n]+/g, ' ').trim();
    
    const isEmptyAnswer = !a || a === '.' || 
      /^(المقاس هو \.?|المقاس أو السعة هو \.?|The size is \.?|The size\/capacity is \.?)$/i.test(a);

    if (!isEmptyAnswer) {
      items.push({ q, a });
    }
  }
  return items;
}

function formatTable(html) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowContent = trMatch[1];
    const cells = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      const cellText = tdMatch[1].replace(/<[^>]+>/g, '').trim();
      if (cellText) cells.push(cellText);
    }
    if (cells.length >= 2) {
      rows.push(`<li><strong>${cells[0]}:</strong> ${cells.slice(1).join(' - ')}</li>`);
    } else if (cells.length === 1) {
      rows.push(`<li>${cells[0]}</li>`);
    }
  }
  return rows.length > 0 ? `<ul>${rows.join('')}</ul>` : '';
}

function formatPlainOrMarkdown(rawText, lang = 'ar') {
  if (!rawText || !rawText.trim()) return '';
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // If text has only 1 line, wrap in <p> if not empty
  if (!text.includes('\n') && !text.startsWith('* ') && !text.startsWith('- ')) {
    return `<p>${text}</p>`;
  }

  // Split FAQ if present
  let mainPart = text;
  let faqPart = '';

  const faqMatch = text.search(/(?:^|\n)\s*[\*\-•#]?\s*(?:الأسئلة الشائعة|الأسئلة المتكررة|Frequently Asked Questions|FAQ)(?:\s*\(FAQ\))?\s*:?\s*\n/i);
  if (faqMatch !== -1) {
    mainPart = text.substring(0, faqMatch).trim();
    faqPart = text.substring(faqMatch).trim();
  }

  const out = [];

  // Process main section
  if (mainPart) {
    const lines = mainPart.split('\n');
    let currentList = [];

    function flushList() {
      if (currentList.length > 0) {
        out.push(`<ul>${currentList.map(li => `<li>${li}</li>`).join('')}</ul>`);
        currentList = [];
      }
    }

    let isIntro = true;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Section header
      if (isSectionHeader(line)) {
        flushList();
        isIntro = false;
        const cleanHeader = line.replace(/^[\*\-•#\s]+/, '').replace(/:\s*$/, '').trim();
        out.push(`<p><strong>${cleanHeader}:</strong></p>`);
        continue;
      }

      // Check if line is a bullet
      const isBullet = /^[\*\-•\+]\s+/.test(line) || /^\d+\.\s+/.test(line);
      let content = line.replace(/^[\*\-•\+]\s+/, '').replace(/^\d+\.\s+/, '').trim();

      // Check for key: value
      const kvMatch = content.match(/^([^:]{2,40}):\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const val = kvMatch[2].trim();
        // Check if value is empty
        if (!val || val === '.' || val === '-' || val === '""' || val === 'null') {
          // Empty spec -> Skip!
          continue;
        }
        isIntro = false;
        currentList.push(`<strong>${key}:</strong> ${val}`);
        continue;
      }

      if (isBullet) {
        isIntro = false;
        currentList.push(content);
        continue;
      }

      // If we are at the beginning and this is a long introductory sentence
      if (isIntro && i === 0 && line.length > 50) {
        flushList();
        out.push(`<p>${line}</p>`);
        isIntro = false;
        continue;
      }

      // Sub-header like "الأبعاد :"
      if (/^([^\s:]{2,20})\s*:$/.test(line)) {
        flushList();
        out.push(`<p><strong>${line.replace(/:\s*$/, '')}:</strong></p>`);
        continue;
      }

      // Treat feature items as list items
      currentList.push(content);
    }
    flushList();
  }

  // Process FAQ section
  if (faqPart) {
    const faqItems = parseFaq(faqPart);
    if (faqItems.length > 0) {
      const headerTitle = lang === 'ar' ? 'الأسئلة الشائعة (FAQ):' : 'Frequently Asked Questions (FAQ):';
      out.push(`<p><strong>${headerTitle}</strong></p>`);
      const lis = faqItems.map(item => {
        const qPrefix = lang === 'ar' ? 'س: ' : 'Q: ';
        const aPrefix = lang === 'ar' ? 'ج: ' : 'A: ';
        const qText = item.q.startsWith(qPrefix) ? item.q : `${qPrefix}${item.q}`;
        const aText = item.a.startsWith(aPrefix) ? item.a : `${aPrefix}${item.a}`;
        return `<li><strong>${qText}</strong><br />${aText}</li>`;
      });
      out.push(`<ul>${lis.join('')}</ul>`);
    }
  }

  return out.join('');
}

function cleanHtml(rawHtml, lang = 'ar') {
  if (!rawHtml || !rawHtml.trim()) return '';
  let html = rawHtml.trim();

  // 1. Table
  if (/<table/i.test(html)) {
    return formatTable(html);
  }

  // 2. Remove empty tags (including nested empty tags)
  let prev;
  do {
    prev = html;
    html = html.replace(/<(span|del|div|b|i|p)[^>]*>\s*(?:<br\s*\/?>|&nbsp;|\s)*<\/\1>/gi, '');
  } while (html !== prev);

  // 3. Handle <p> tags with multiple <br />
  html = html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, inner) => {
    if (inner.includes('<br')) {
      const parts = inner.split(/<br\s*\/?>/gi).map(p => p.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      const isSpecList = parts.length >= 2 && parts.every(p => p.length < 120);
      if (isSpecList) {
        const lis = parts.map(p => {
          let fixed = fixGluedSpec(p);
          const kv = fixed.match(/^([^:]{2,35})\s*:\s*(.+)$/);
          if (kv) {
            return `<li><strong>${kv[1].trim()}:</strong> ${kv[2].trim()}</li>`;
          }
          return `<li>${fixed}</li>`;
        });
        return `<ul>${lis.join('')}</ul>`;
      }
    }
    const cleanText = inner.replace(/<(span|del)[^>]*>\s*<\/\1>/gi, '').trim();
    return cleanText ? `<p>${cleanText}</p>` : '';
  });

  // 4. Handle consecutive <p> tags that are short specs
  const pMatches = html.match(/<p>([\s\S]*?)<\/p>/gi);
  if (pMatches && pMatches.length >= 3) {
    const pTexts = pMatches.map(p => p.replace(/<\/?p>/gi, '').trim());
    const allShort = pTexts.every(t => t.length < 100);
    if (allShort) {
      const lis = pTexts.map(t => {
        let fixed = fixGluedSpec(t);
        fixed = fixed.replace(/\s{2,}/g, ': ');
        const kv = fixed.match(/^([^:]{2,35})\s*:\s*(.+)$/);
        if (kv) {
          return `<li><strong>${kv[1].trim()}:</strong> ${kv[2].trim()}</li>`;
        }
        return `<li>${fixed}</li>`;
      });
      html = `<ul>${lis.join('')}</ul>`;
    }
  }

  // 5. Clean <li> items
  html = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (match, inner) => {
    let cleanInner = inner.replace(/<(span|del|b|i)[^>]*>\s*<\/\1>/gi, '').trim();
    cleanInner = cleanInner.replace(/^[\s\u200B\u00A0]+|[\s\u200B\u00A0]+$/g, '');
    if (!cleanInner) return '';
    const kv = cleanInner.match(/^([^<:]{2,35})\s*:\s*(.+)$/);
    if (kv && !cleanInner.includes('<strong>')) {
      return `<li><strong>${kv[1].trim()}:</strong> ${kv[2].trim()}</li>`;
    }
    return `<li>${cleanInner}</li>`;
  });

  // Clean empty <li></li>
  html = html.replace(/<li>\s*<\/li>/gi, '');

  // Clean whitespace between tags
  html = html.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  return html;
}

function formatDescription(rawText, lang = 'ar') {
  if (!rawText || typeof rawText !== 'string') return '';
  let text = rawText.trim();
  if (!text) return '';

  // Check if pseudo-HTML (e.g. <p>المواصفات الفنية: * ... الأسئلة الشائعة: ...</p>)
  if (/<p/i.test(text) && text.includes('* ') && (text.includes('الأسئلة الشائعة') || text.includes('Frequently Asked Questions') || text.includes('المواصفات الفنية') || text.includes('Technical Specifications'))) {
    text = text.replace(/<[^>]+>/g, ' ');
    text = text.replace(/(?:\s*|\.)\s*(?:الأسئلة الشائعة|Frequently Asked Questions)(?:\s*\(FAQ\))?\s*:?\s*/gi, '\n\nالأسئلة الشائعة (FAQ):\n');
    text = text.replace(/\s*\*\s+/g, '\n* ');
    return formatPlainOrMarkdown(text, lang);
  }

  if (/<(ul|ol|p|table|div|span|br)/i.test(text)) {
    return cleanHtml(text, lang);
  }
  return formatPlainOrMarkdown(text, lang);
}

async function main() {
  const isApply = process.argv.includes('--apply');
  const isDryRun = process.argv.includes('--dry-run') || !isApply;

  const client = new Client({ connectionString: 'postgresql://hagatna:hagatna_password@localhost:5432/hagatna_db' });
  await client.connect();

  console.log(`=== Product Description Formatter [Mode: ${isApply ? 'APPLY (Live DB)' : 'DRY RUN'}] ===\n`);

  // Ensure backup table exists
  await client.query('CREATE TABLE IF NOT EXISTS products_description_backup AS SELECT id, description FROM products;');
  const backupCount = await client.query('SELECT count(*) FROM products_description_backup;');
  console.log(`Verified backup table "products_description_backup": ${backupCount.rows[0].count} rows backed up.\n`);

  // Fetch all products
  const res = await client.query('SELECT id, name->>\'ar\' as name_ar, description FROM products ORDER BY "createdAt" ASC');
  console.log(`Fetched ${res.rows.length} products to evaluate.`);

  const toUpdate = [];

  for (const row of res.rows) {
    const origDesc = row.description || {};
    const origAr = origDesc.ar || '';
    const origEn = origDesc.en || '';

    const newAr = formatDescription(origAr, 'ar');
    const newEn = formatDescription(origEn, 'en');

    if (newAr !== origAr || newEn !== origEn) {
      toUpdate.push({
        id: row.id,
        name: row.name_ar,
        oldDesc: origDesc,
        newDesc: {
          ...origDesc,
          ar: newAr,
          en: newEn
        }
      });
    }
  }

  console.log(`\nEvaluation summary:`);
  console.log(`- Total products: ${res.rows.length}`);
  console.log(`- Products needing update: ${toUpdate.length}`);
  console.log(`- Products already clean: ${res.rows.length - toUpdate.length}`);

  if (isDryRun) {
    console.log(`\n--- Dry Run Sample Diffs (5 items) ---`);
    for (const item of toUpdate.slice(0, 5)) {
      console.log(`\n[Product ID]: ${item.id} - ${item.name}`);
      console.log(`[Before AR]:\n${item.oldDesc.ar?.slice(0, 200)}...`);
      console.log(`[After AR]:\n${item.newDesc.ar?.slice(0, 300)}...`);
      if (item.newDesc.en) {
        console.log(`[After EN]:\n${item.newDesc.en?.slice(0, 200)}...`);
      }
    }
    console.log(`\n[DRY RUN COMPLETE] No changes written to database. Run with --apply to execute.`);
  } else {
    console.log(`\nStarting database update in batches...`);
    await client.query('BEGIN');
    try {
      const batchSize = 100;
      for (let i = 0; i < toUpdate.length; i += batchSize) {
        const batch = toUpdate.slice(i, i + batchSize);
        for (const item of batch) {
          await client.query(
            'UPDATE products SET description = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(item.newDesc), item.id]
          );
        }
        process.stdout.write(`Updated ${Math.min(i + batchSize, toUpdate.length)} / ${toUpdate.length} products...\r`);
      }
      await client.query('COMMIT');
      console.log(`\nSUCCESS: All ${toUpdate.length} product descriptions updated in PostgreSQL!`);

      // Flush redis cache
      try {
        console.log('\nFlushing Redis product cache...');
        execSync('docker exec hagatna_redis redis-cli eval "for _,k in ipairs(redis.call(\'keys\',\'cache:product*\')) do redis.call(\'del\',k) end" 0');
        console.log('Redis product cache cleared successfully.');
      } catch (cacheErr) {
        console.warn('Warning: Failed to flush Redis cache:', cacheErr.message);
      }

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('\nERROR: Update failed! Rolled back transaction.', err);
      process.exit(1);
    }
  }

  await client.end();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { formatDescription, formatPlainOrMarkdown, cleanHtml, fixGluedSpec, parseFaq, isSectionHeader };
