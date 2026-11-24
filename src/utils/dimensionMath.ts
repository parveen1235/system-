/**
 * Dimension Math & Expression Evaluator for uPVC CAD & Fabrication
 * 
 * Safely evaluates arithmetic expressions, unit conversions (feet, inches to mm),
 * and live calculations entered by fabricators and designers.
 */

// Converts feet/inch patterns to mm or evaluates math expressions
export function evaluateDimensionMath(input: string | number): number | null {
  if (typeof input === 'number') {
    return isNaN(input) ? null : input;
  }
  if (!input) return null;

  let raw = String(input).trim();
  if (!raw) return null;

  // 1. Check for Feet & Inch syntax: e.g. 4'6", 4' 6", 4ft 6in, 4 ft 6 in
  // Pattern: X' Y" or X ft Y in
  const feetInchMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)?$/i);
  if (feetInchMatch) {
    const feet = parseFloat(feetInchMatch[1]);
    const inches = parseFloat(feetInchMatch[2]);
    if (!isNaN(feet) && !isNaN(inches)) {
      return Math.round(feet * 304.8 + inches * 25.4);
    }
  }

  // 2. Check for Pure Feet syntax: e.g. 4', 4.5', 4ft, 4.5 ft
  const feetMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)$/i);
  if (feetMatch) {
    const feet = parseFloat(feetMatch[1]);
    if (!isNaN(feet)) {
      return Math.round(feet * 304.8);
    }
  }

  // 3. Check for Pure Inches syntax: e.g. 48", 48in, 48 in
  const inchMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)$/i);
  if (inchMatch) {
    const inches = parseFloat(inchMatch[1]);
    if (!isNaN(inches)) {
      return Math.round(inches * 25.4);
    }
  }

  // 4. Strip out optional 'mm' suffix if present (e.g. 1200mm -> 1200)
  raw = raw.replace(/\s*mm$/i, '');

  // 5. Replace 'x' or 'X' with '*'
  raw = raw.replace(/[xX]/g, '*');

  // 6. Replace site measurement feet/inches inline inside formulas:
  // e.g. "4*304.8" or "4ft + 2in"
  raw = raw.replace(/(\d+(?:\.\d+)?)\s*(?:'|ft|feet)/gi, (_, val) => `(${val}*304.8)`);
  raw = raw.replace(/(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)/gi, (_, val) => `(${val}*25.4)`);

  // 7. Validate that only safe math characters remain: 0-9, ., +, -, *, /, (, ), spaces
  if (!/^[\d\.\+\-\*\/\(\)\s]+$/.test(raw)) {
    return null;
  }

  try {
    const val = safeCalculate(raw);
    if (val !== null && !isNaN(val) && isFinite(val)) {
      return Math.round(val);
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Determines if an input string is an active calculation expression
 */
export function getLiveMathPreview(input: string | number): {
  calculated: number | null;
  isExpression: boolean;
} {
  const str = String(input ?? '').trim();
  if (!str) {
    return { calculated: null, isExpression: false };
  }

  // Check if it contains operators or unit indicators
  const isExpression = /[\+\-\*\/\(\)xX'"ftin]/.test(str);
  const calculated = evaluateDimensionMath(str);

  return {
    calculated,
    isExpression,
  };
}

/**
 * Safe Arithmetic Parser & Evaluator (Shunting-yard / Recursive descent)
 * Completely eliminates risks of code injection while supporting +, -, *, /, and ()
 */
function safeCalculate(expr: string): number | null {
  // Tokenize
  const tokens: string[] = [];
  let i = 0;
  expr = expr.replace(/\s+/g, '');

  while (i < expr.length) {
    const char = expr[i];

    if ('+-*/()'.includes(char)) {
      // Check for unary minus: at start or right after another operator or '('
      if (
        char === '-' &&
        (tokens.length === 0 || '+-*/('.includes(tokens[tokens.length - 1]))
      ) {
        // Collect negative number
        let numStr = '-';
        i++;
        while (i < expr.length && /[\d.]/.test(expr[i])) {
          numStr += expr[i];
          i++;
        }
        if (numStr === '-') return null; // trailing minus
        tokens.push(numStr);
        continue;
      }
      tokens.push(char);
      i++;
    } else if (/[\d.]/.test(char)) {
      let numStr = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push(numStr);
    } else {
      return null;
    }
  }

  if (tokens.length === 0) return null;

  // Evaluate using recursive descent parser
  let pos = 0;

  function parseExpression(): number {
    let result = parseTerm();
    while (pos < tokens.length) {
      const op = tokens[pos];
      if (op === '+' || op === '-') {
        pos++;
        const nextTerm = parseTerm();
        if (op === '+') result += nextTerm;
        else result -= nextTerm;
      } else {
        break;
      }
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (pos < tokens.length) {
      const op = tokens[pos];
      if (op === '*' || op === '/') {
        pos++;
        const nextFactor = parseFactor();
        if (op === '*') {
          result *= nextFactor;
        } else {
          if (nextFactor === 0) return 0;
          result /= nextFactor;
        }
      } else {
        break;
      }
    }
    return result;
  }

  function parseFactor(): number {
    if (pos >= tokens.length) throw new Error('Unexpected end');
    const token = tokens[pos];

    if (token === '(') {
      pos++; // consume '('
      const val = parseExpression();
      if (pos < tokens.length && tokens[pos] === ')') {
        pos++; // consume ')'
      }
      return val;
    }

    if (token === '+') {
      pos++;
      return parseFactor();
    }
    if (token === '-') {
      pos++;
      return -parseFactor();
    }

    const num = parseFloat(token);
    if (isNaN(num)) throw new Error(`Invalid token: ${token}`);
    pos++;
    return num;
  }

  try {
    const res = parseExpression();
    if (pos < tokens.length) return null; // Unparsed tokens remaining
    return res;
  } catch {
    return null;
  }
}
