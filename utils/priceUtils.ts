/**
 * Persian number & decimal utilities for Real Estate pricing
 */

// Convert Persian and Arabic digits and decimal separators to standard English
export function toEnglishDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let result = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const pIdx = persianDigits.indexOf(ch);
    if (pIdx !== -1) {
      result += pIdx;
      continue;
    }
    const aIdx = arabicDigits.indexOf(ch);
    if (aIdx !== -1) {
      result += aIdx;
      continue;
    }
    // Persian decimal separator (momayyez) or slash
    if (ch === '٫' || ch === '/') {
      result += '.';
      continue;
    }
    result += ch;
  }
  return result;
}

// Convert English digits to Persian numerals
export function toPersianDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return s.replace(/\d/g, d => persianDigits[parseInt(d, 10)]);
}

// Format number with 3-digit comma separators and optional decimals
export function formatThousands(val: number | string): string {
  if (val === '' || val === null || val === undefined) return '';
  const clean = toEnglishDigits(val).replace(/,/g, '');
  const parts = clean.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1] : undefined;

  const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
}

// Clean and normalize decimal input (allows digits, at most one dot/comma)
export function normalizeDecimalInput(input: string): string {
  const converted = toEnglishDigits(input).replace(/,/g, '').trim();
  // Keep only digits and decimal point
  let sanitized = '';
  let hasDot = false;
  for (let i = 0; i < converted.length; i++) {
    const char = converted[i];
    if (char >= '0' && char <= '9') {
      sanitized += char;
    } else if (char === '.' && !hasDot) {
      sanitized += '.';
      hasDot = true;
    }
  }
  return sanitized;
}

// Words conversion helper
const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

function chunkToWords(num: number): string {
  const parts: string[] = [];
  const h = Math.floor(num / 100);
  const t = Math.floor((num % 100) / 10);
  const o = num % 10;

  if (h > 0) parts.push(HUNDREDS[h]);

  if (t === 1) {
    parts.push(TEENS[o]);
  } else {
    if (t > 1) parts.push(TENS[t]);
    if (o > 0) parts.push(ONES[o]);
  }

  return parts.join(' و ');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'صفر';
  if (num < 0) return 'منفی ' + numberToWords(Math.abs(num));

  // Round to nearest integer for verbal translation
  const rounded = Math.round(num);
  if (rounded === 0) return 'صفر';

  const chunks: number[] = [];
  let temp = rounded;
  while (temp > 0) {
    chunks.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const words: string[] = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk === 0) continue;
    const chunkWord = chunkToWords(chunk);
    const scale = SCALES[i];
    words.push(scale ? `${chunkWord} ${scale}` : chunkWord);
  }

  return words.join(' و ');
}

/**
 * Returns a human-friendly representation with decimals (e.g. ۳.۵ میلیارد تومان)
 * and full Persian words
 */
export function getPriceSpelling(val: number | string | ''): {
  shortText: string;
  fullWords: string;
  isBillion: boolean;
  isMillion: boolean;
} {
  if (val === '' || val === null || val === undefined) {
    return { shortText: '', fullWords: '', isBillion: false, isMillion: false };
  }

  const num = typeof val === 'number' ? val : Number(toEnglishDigits(val).replace(/,/g, ''));
  if (isNaN(num) || num <= 0) {
    return { shortText: 'توافقی', fullWords: 'توافقی', isBillion: false, isMillion: false };
  }

  if (num >= 1000000000) {
    // Billions with up to 3 decimal digits, stripping trailing zeros
    const bValue = num / 1000000000;
    const bFormatted = bValue.toLocaleString('en-US', { maximumFractionDigits: 3 });
    const shortText = `${toPersianDigits(bFormatted)} میلیارد تومان`;
    const fullWords = `${numberToWords(num)} تومان`;
    return { shortText, fullWords, isBillion: true, isMillion: false };
  }

  if (num >= 1000000) {
    // Millions with up to 2 decimal digits
    const mValue = num / 1000000;
    const mFormatted = mValue.toLocaleString('en-US', { maximumFractionDigits: 2 });
    const shortText = `${toPersianDigits(mFormatted)} میلیون تومان`;
    const fullWords = `${numberToWords(num)} تومان`;
    return { shortText, fullWords, isBillion: false, isMillion: true };
  }

  if (num >= 1000) {
    const kValue = num / 1000;
    const kFormatted = kValue.toLocaleString('en-US', { maximumFractionDigits: 1 });
    const shortText = `${toPersianDigits(kFormatted)} هزار تومان`;
    const fullWords = `${numberToWords(num)} تومان`;
    return { shortText, fullWords, isBillion: false, isMillion: false };
  }

  const shortText = `${toPersianDigits(num)} تومان`;
  const fullWords = `${numberToWords(num)} تومان`;
  return { shortText, fullWords, isBillion: false, isMillion: false };
}
