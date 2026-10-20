/**
 * Standalone Internal Math Calculator & Computer Algebra Engine
 * Pure TypeScript — 100% Offline with ZERO external network or API calls.
 */

export interface SolverStep {
  stepNumber: number;
  title: string;
  content: string;
  mathLatex?: string;
}

export interface MathCalculatorResult {
  parsedProblem: string;
  topic: string;
  deltaMathFormatAnswer: string;
  displayLatexAnswer?: string;
  confidence: number;
  steps: SolverStep[];
  rawTextCleaned?: string;
}

/**
 * Greatest Common Divisor (GCD) for Exact Fractions
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

/**
 * Formats numerator/denominator into lowest-term exact fraction or integer.
 */
export function formatFraction(numerator: number, denominator: number): string {
  if (denominator === 0) return 'undefined';
  const num = Math.round(numerator);
  const den = Math.round(denominator);
  if (num % den === 0) return String(num / den);

  const divisor = gcd(num, den);
  const sign = num * den < 0 ? '-' : '';
  return `${sign}${Math.abs(num) / divisor}/${Math.abs(den) / divisor}`;
}

/**
 * Isolates the active equation line from multi-line DeltaMath OCR text.
 * Filters out button text like "No Solution", "Attempt 2", "Watch Video", etc.
 */
export function extractEquationLine(rawText: string): string {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return rawText;

  // Filter out pure UI chrome / button lines
  const mathLines = lines.filter(
    (l) => !/^(score|penalty|attempt|watch|submit|delta|next|no\s*solution)/i.test(l)
  );

  // 1. Look for a line containing '='
  const eqLine = mathLines.find((l) => l.includes('='));
  if (eqLine) return eqLine;

  // 2. Look for lines with math expressions or algebra keywords
  const exprLine = mathLines.find((l) => /[²\^]|factor|solve/i.test(l));
  if (exprLine) return exprLine;

  return mathLines.join(' ');
}

/**
 * 1. OCR Normalization & Sanitization
 * Specifically targets KaTeX italic font misrecognitions (cursive x, exponents).
 */
export function sanitizeMathOcrText(rawText: string): string {
  if (!rawText) return '';

  // Step 1: Line filtering to isolate the equation line from button labels
  let cleaned = extractEquationLine(rawText);

  // Step 2: Remove filler DeltaMath UI chrome & button text (CRITICAL: 'No Solution' is a DeltaMath button!)
  cleaned = cleaned.replace(/no\s*solution/gi, '');
  cleaned = cleaned.replace(/score:\s*\d+(\/\d+)?/gi, '');
  cleaned = cleaned.replace(/penalty:\s*[\d.]+\s*(%|off)?/gi, '');
  cleaned = cleaned.replace(/watch\s*(video|vid)?/gi, '');
  cleaned = cleaned.replace(/stop\s*watching/gi, '');
  cleaned = cleaned.replace(/show\s*example[s]?/gi, '');
  cleaned = cleaned.replace(/attempt\s*\d+\s*(of\s*\d+)?/gi, '');
  cleaned = cleaned.replace(/next\s*problem/gi, '');
  cleaned = cleaned.replace(/submit\s*answer/gi, '');
  cleaned = cleaned.replace(/delta\s*math/gi, '');
  cleaned = cleaned.replace(/calculator/gi, '');

  // Step 3: Replace unicode dashes, minus signs, and math operators
  cleaned = cleaned.replace(/[−–—]/g, '-');
  cleaned = cleaned.replace(/[×•]/g, '*');
  cleaned = cleaned.replace(/[÷]/g, '/');

  // Fix OCR confusion for "= -": Tesseract frequently misreads "= -4" as "= -14" or "= -l4"
  // because the space and negative sign blur together into a "1"
  cleaned = cleaned.replace(/=\s*-[1l](\d+)/g, '= -$1');

  // Fix OCR confusion for leading variable squared: "i x?", "I x?"
  cleaned = cleaned.replace(/\bi\s*x\?/gi, 'x^2');

  // Step 4: KaTeX Italic Exponent / Superscript 2 Normalizations
  // In KaTeX italic math font, x² or x^2 is frequently misread by OCR as:
  // "I 2?", "l 2?", "1 2?", "| 2?", "x 2?", "I 2^", "I 2", "2 2?"
  cleaned = cleaned.replace(/(?:^|(?<=[-+=\s(]))[I|l|1]\s*[2\^]\?/gi, 'x^2');
  cleaned = cleaned.replace(/(?:^|(?<=[-+=\s(]))[I|l|1]\s*2\?/gi, 'x^2');
  cleaned = cleaned.replace(/(?:^|(?<=[-+=\s(]))[I|l|1]\s*\^\s*2\b/gi, 'x^2');
  cleaned = cleaned.replace(/(?:^|(?<=[-+=\s(]))[I|l|1]\s*2(?=\s*[-+*=])/gi, 'x^2');
  cleaned = cleaned.replace(/(?:^|(?<=[-+=\s(]))\b2\s*\?\b/g, 'x^2');
  cleaned = cleaned.replace(/(?:^|(?<=[-+=\s(]))\b2\s*2\?\b/g, 'x^2');

  // Standard exponent normalizations: x², x2, x 2?
  cleaned = cleaned.replace(/([a-zA-Z])\s*2\?/g, '$1^2');
  cleaned = cleaned.replace(/([a-zA-Z])[²2]/g, '$1^2');
  cleaned = cleaned.replace(/([a-zA-Z])\s*\^\s*2/g, '$1^2');

  // Step 5: KaTeX Cursive Italic 'x' Glyph Disambiguation
  // Cursive x has curved loops that OCR often reads as ")c", ")(", "><", "}{"
  cleaned = cleaned.replace(/\)\s*[c\(\)]/g, 'x');
  cleaned = cleaned.replace(/><|></g, 'x');
  cleaned = cleaned.replace(/\}\s*\{/g, 'x');

  // Step 6: KaTeX Cursive Italic 'x' Confused With '2' or 'z' (e.g. "-42-32=0" -> "-4x-32=0")
  // In a quadratic equation context: ax^2 + bx + c = 0
  // When an equation starts with x^2 and is followed by -42-32=0 or -42 - 32 = 0,
  // the '2' right after the coefficient -4 was the italic variable x!
  cleaned = cleaned.replace(/(x\^2\s*[+-]\s*\d*)[2z]\s*([+-]\s*\d+\s*=)/gi, (match, prefix, suffix) => {
    return `${prefix}x ${suffix}`;
  });
  cleaned = cleaned.replace(/(x\^2\s*[+-]\s*)(\d+)2\s*([+-]\s*\d+\s*=)/gi, '$1$2x $3');
  cleaned = cleaned.replace(/([+-]?\s*\d+)[2z]\s*([+-]\s*\d+\s*=)/gi, '$1x $2');

  // If a quadratic has single variable missing like "x^2 - 2 - 32 = 0", replace lone "2" with "x"
  cleaned = cleaned.replace(/(x\^2\s*[+-]\s*)[2z]\s*([+-]\s*\d+\s*=)/gi, '$1x $2');

  // If OCR read variable as 'z' in an equation with 'x' (e.g. "-4z" -> "-4x")
  if (/\bx\^2\b|\bx\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/([+-]?\s*\d*)z\b/gi, '$1x');
  }

  // Step 7: Fix common OCR number confusion:
  // 'O' or 'o' between digits or right after minus/plus or next to digits -> 0
  cleaned = cleaned.replace(/(\d)[Oo]/g, '$10');
  cleaned = cleaned.replace(/[Oo](\d)/g, '0$1');
  cleaned = cleaned.replace(/([+\-=]\s*)[Oo](?!\w)/g, '$10');

  // Isolated lowercase 'l' or pipe '|' or 'I' next to numbers or operators -> 1
  cleaned = cleaned.replace(/(^|\s)[l|I](\s|$|[+\-*/=])/g, '$11$2');

  // Trim and normalize multiple spaces
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Helper to parse coefficient from string (e.g. "+3" -> 3, "-" -> -1, "" -> 1)
 */
function parseCoeff(raw: string): number {
  const s = raw.replace(/\s+/g, '');
  if (!s || s === '+') return 1;
  if (s === '-') return -1;
  const num = parseFloat(s);
  return isNaN(num) ? 1 : num;
}

/**
 * 2. Quadratic Factoring Engine
 * Supports equations like ax^2 + bx + c = d (including non-zero right-hand side)
 */
export function solveQuadratic(text: string): MathCalculatorResult | null {
  // Pre-solve OCR normalizations
  let normalized = text
    .replace(/=\s*-[1l](\d+)/g, '= -$1')
    .replace(/\bi\s*x\?/gi, 'x^2');

  // Primary: Support Equations with Non-Zero Right-Hand Side (ax^2 + bx + c = d)
  // Regex: /([+-]?\s*\d*)\s*x\^?2\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)?\s*=\s*([+-]?\s*\d+)/i
  const quadRegex = /([+-]?\s*\d*)\s*x\^?2\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)?\s*=\s*([+-]?\s*\d+)/i;
  const match = normalized.match(quadRegex);

  let a = 1, b = 0, c = 0;
  let equationFound = false;
  let matchedStr = '';
  let rhs = 0;

  if (match) {
    a = parseCoeff(match[1]);
    b = match[2] ? parseCoeff(match[2]) : 0;
    const lhsC = match[3] ? parseFloat(match[3].replace(/\s+/g, '')) : 0;
    rhs = parseInt(match[4].replace(/\s+/g, ''), 10);
    // Subtract the RHS from the constant term: c_eff = (c || 0) - parseInt(rhs).
    // In x^2 + 2x - 4 = -4: a = 1, b = 2, c = -4 - (-4) = 0.
    c = (lhsC || 0) - rhs;
    equationFound = true;
    matchedStr = match[0];
  } else {
    // Fallback: ax^2 + c = d or ax^2 = d (no linear x term, e.g. x^2 - 16 = 0 or 2x^2 = 18)
    const quadNoLinear = /([+-]?\s*\d*)\s*x\^?2\s*([+-]\s*\d+)?\s*=\s*([+-]?\s*\d+)/i;
    const mSimple = normalized.match(quadNoLinear);
    if (mSimple) {
      a = parseCoeff(mSimple[1]);
      b = 0;
      const lhsC = mSimple[2] ? parseFloat(mSimple[2].replace(/\s+/g, '')) : 0;
      rhs = parseInt(mSimple[3].replace(/\s+/g, ''), 10);
      c = (lhsC || 0) - rhs;
      equationFound = true;
      matchedStr = mSimple[0];
    }
  }

  if (!equationFound || a === 0) return null;

  // Calculate discriminant: D = b^2 - 4ac
  const D = b * b - 4 * a * c;
  if (D < 0) {
    return {
      parsedProblem: matchedStr,
      topic: 'Quadratic Equation (No Real Roots)',
      deltaMathFormatAnswer: 'No real solutions',
      displayLatexAnswer: '\\text{No real solutions (Discriminant } D < 0\\text{)}',
      confidence: 0.95,
      steps: [
        {
          stepNumber: 1,
          title: 'Identify Coefficients',
          content: `a = ${a}, b = ${b}, c = ${c}`,
          mathLatex: `a = ${a},\\ b = ${b},\\ c = ${c}`,
        },
        {
          stepNumber: 2,
          title: 'Compute Discriminant',
          content: `D = b^2 - 4ac = (${b})^2 - 4(${a})(${c}) = ${D}`,
          mathLatex: `D = ${b}^2 - 4(${a})(${c}) = ${D} < 0`,
        },
      ],
    };
  }

  const s = Math.sqrt(D);
  const isPerfectSquare = Math.abs(s - Math.round(s)) < 1e-9;
  const sqrtD = Math.round(s);

  // Exact roots calculation
  const num1 = -b + sqrtD;
  const num2 = -b - sqrtD;
  const den = 2 * a;

  const r1Formatted = formatFraction(num1, den);
  const r2Formatted = formatFraction(num2, den);

  // Distinct roots formatted for DeltaMath (comma-separated, sorted or clean)
  let deltaMathFormatAnswer = '';
  if (r1Formatted === r2Formatted) {
    deltaMathFormatAnswer = r1Formatted;
  } else {
    // DeltaMath accepts comma separated list: "8, -4"
    deltaMathFormatAnswer = `${r1Formatted}, ${r2Formatted}`;
  }

  // Factor step breakdown
  const steps: SolverStep[] = [
    {
      stepNumber: 1,
      title: 'Standard Form & Coefficients',
      content:
        rhs !== 0
          ? `Rearrange ${matchedStr} into standard form: ${a}x² ${b >= 0 ? `+ ${b}` : b}x ${c >= 0 ? `+ ${c}` : c} = 0 (subtract ${rhs} from both sides)`
          : `Extract coefficients from ${a}x² ${b >= 0 ? `+ ${b}` : b}x ${c >= 0 ? `+ ${c}` : c} = 0`,
      mathLatex: `a = ${a},\\ b = ${b},\\ c = ${c}`,
    },
    {
      stepNumber: 2,
      title: 'Calculate Discriminant',
      content: `D = b² - 4ac = (${b})² - 4(${a})(${c}) = ${D}`,
      mathLatex: `D = ${b}^2 - 4(${a})(${c}) = ${D}`,
    },
  ];

  if (isPerfectSquare) {
    const ac = a * c;
    let factorFound = false;
    let f1 = 0, f2 = 0;
    const limit = Math.ceil(Math.sqrt(Math.abs(ac))) + 1;

    for (let test = -limit; test <= limit; test++) {
      if (test !== 0 && ac % test === 0) {
        const other = ac / test;
        if (test + other === b) {
          f1 = test;
          f2 = other;
          factorFound = true;
          break;
        }
      }
    }

    if (factorFound) {
      steps.push({
        stepNumber: 3,
        title: 'Factor Product and Sum',
        content: `Found factors of a·c = ${ac} that sum to b = ${b}: (${f1}) and (${f2})`,
        mathLatex: `(${f1}) \\cdot (${f2}) = ${ac},\\quad (${f1}) + (${f2}) = ${b}`,
      });
    }
  }

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Solve for x (DeltaMath Format)',
    content: `Roots in DeltaMath comma format: ${deltaMathFormatAnswer}`,
    mathLatex: `x = ${deltaMathFormatAnswer}`,
  });

  return {
    parsedProblem: matchedStr,
    topic: 'Quadratic Equation by Factoring',
    deltaMathFormatAnswer,
    displayLatexAnswer: `x = ${deltaMathFormatAnswer}`,
    confidence: 0.98,
    steps,
  };
}

/**
 * 3. Linear Equation Engine
 * Matches equations like ax + b = cx + d (including distributive property a(bx + c) = d)
 */
export function solveLinearEquation(text: string): MathCalculatorResult | null {
  // 1. Distributive property support: a(bx + c) = dx + e or a(bx + c) = d(ex + f) + g
  // We can expand simple linear equations with an expression parser
  const eqIndex = text.indexOf('=');
  if (eqIndex === -1) return null;

  const leftSide = text.slice(0, eqIndex).trim();
  const rightSide = text.slice(eqIndex + 1).trim();

  // Helper to expand and reduce side: returns { xCoeff, constant }
  const parseLinearSide = (side: string): { xCoeff: number; constant: number } | null => {
    let s = side.replace(/\s+/g, '');
    let xCoeff = 0;
    let constant = 0;

    // Expand distributive parentheses: e.g. 7(2x-3) or -3(x+4)
    const parenRegex = /([+-]?\d*)\(([^()]+)\)/g;
    let match: RegExpExecArray | null;
    let parenReplaced = s;

    while ((match = parenRegex.exec(s)) !== null) {
      const multStr = match[1];
      const mult = multStr === '' || multStr === '+' ? 1 : multStr === '-' ? -1 : parseFloat(multStr);
      const inner = match[2];

      // Parse terms inside parenthetical
      const innerTerms = inner.match(/[+-]?[^+-]+/g) || [];
      let expanded = '';
      for (const t of innerTerms) {
        if (/x/i.test(t)) {
          const c = parseCoeff(t.replace(/x/i, ''));
          const prod = c * mult;
          expanded += (prod >= 0 ? '+' : '') + `${prod}x`;
        } else {
          const val = parseFloat(t);
          if (!isNaN(val)) {
            const prod = val * mult;
            expanded += (prod >= 0 ? '+' : '') + `${prod}`;
          }
        }
      }
      parenReplaced = parenReplaced.replace(match[0], expanded);
    }

    // Now collect all terms from parenReplaced
    const allTerms = parenReplaced.match(/[+-]?[^+-]+/g);
    if (!allTerms) return null;

    for (const term of allTerms) {
      if (/x/i.test(term)) {
        xCoeff += parseCoeff(term.replace(/x/i, ''));
      } else {
        const val = parseFloat(term);
        if (!isNaN(val)) {
          constant += val;
        }
      }
    }

    return { xCoeff, constant };
  };

  const left = parseLinearSide(leftSide);
  const right = parseLinearSide(rightSide);

  if (!left || !right) return null;

  // CRITICAL: A linear equation MUST contain the variable 'x' on at least one side.
  // If neither side has any variable term (e.g. OCR misread arithmetic "-42 - 32 = 0"),
  // it is a malformed or misread expression, NEVER a contradiction with "No solution"!
  // Submitting "No solution" when an OCR text has no variable causes failed attempts in DeltaMath.
  if (Math.abs(left.xCoeff) < 1e-9 && Math.abs(right.xCoeff) < 1e-9) {
    return null;
  }

  // ax + b = cx + d
  // (a - c)x = (d - b)
  const aMinusC = left.xCoeff - right.xCoeff;
  const dMinusB = right.constant - left.constant;

  if (Math.abs(aMinusC) < 1e-9) {
    if (Math.abs(dMinusB) < 1e-9) {
      return {
        parsedProblem: `${leftSide} = ${rightSide}`,
        topic: 'Linear Equation (Identity)',
        deltaMathFormatAnswer: 'All real numbers',
        displayLatexAnswer: '\\text{All real numbers (Infinitely many solutions)}',
        confidence: 0.95,
        steps: [
          {
            stepNumber: 1,
            title: 'Simplify Terms',
            content: `Left: ${left.xCoeff}x + ${left.constant}, Right: ${right.xCoeff}x + ${right.constant}`,
          },
          {
            stepNumber: 2,
            title: 'Analyze Result',
            content: 'Coefficients and constants are identical on both sides.',
            mathLatex: '0 = 0',
          },
        ],
      };
    } else {
      return {
        parsedProblem: `${leftSide} = ${rightSide}`,
        topic: 'Linear Equation (Contradiction)',
        deltaMathFormatAnswer: 'No solution',
        displayLatexAnswer: '\\text{No solution}',
        confidence: 0.95,
        steps: [
          {
            stepNumber: 1,
            title: 'Simplify Terms',
            content: `Both sides have equal variable coefficients but differing constants.`,
            mathLatex: `${left.constant} \\neq ${right.constant}`,
          },
        ],
      };
    }
  }

  const ansFraction = formatFraction(dMinusB, aMinusC);

  return {
    parsedProblem: `${leftSide} = ${rightSide}`,
    topic: 'Linear Equation',
    deltaMathFormatAnswer: ansFraction,
    displayLatexAnswer: `x = ${ansFraction}`,
    confidence: 0.98,
    steps: [
      {
        stepNumber: 1,
        title: 'Expand & Simplify Each Side',
        content: `Left side: ${left.xCoeff}x ${left.constant >= 0 ? `+ ${left.constant}` : left.constant}. Right side: ${right.xCoeff}x ${right.constant >= 0 ? `+ ${right.constant}` : right.constant}.`,
        mathLatex: `${left.xCoeff}x + (${left.constant}) = ${right.xCoeff}x + (${right.constant})`,
      },
      {
        stepNumber: 2,
        title: 'Group Variable Terms on Left and Constants on Right',
        content: `(${left.xCoeff} - ${right.xCoeff})x = ${right.constant} - ${left.constant} => ${aMinusC}x = ${dMinusB}`,
        mathLatex: `${aMinusC}x = ${dMinusB}`,
      },
      {
        stepNumber: 3,
        title: 'Solve for x',
        content: `x = ${dMinusB} / ${aMinusC} = ${ansFraction}`,
        mathLatex: `x = ${ansFraction}`,
      },
    ],
  };
}

/**
 * 4. Factoring Trinomials / Expressions (e.g. "Factor completely: x^2 - 5x - 24")
 */
export function solveFactoringExpression(text: string): MathCalculatorResult | null {
  const isFactorTask = /factor\s*(completely)?[:\s]/i.test(text) || !text.includes('=');
  const exprMatch = text.match(/([+-]?\s*\d*)\s*x\^2\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)/i);

  if (!exprMatch || !isFactorTask) return null;

  const a = parseCoeff(exprMatch[1]);
  const b = parseCoeff(exprMatch[2]);
  const c = parseFloat(exprMatch[3].replace(/\s+/g, ''));

  if (a !== 1) {
    // For general trinomials: a*c
    const ac = a * c;
    for (let f1 = -Math.abs(ac); f1 <= Math.abs(ac); f1++) {
      if (f1 !== 0 && ac % f1 === 0) {
        const f2 = ac / f1;
        if (f1 + f2 === b) {
          // Factoring by grouping: ax^2 + f1 x + f2 x + c
          const g1 = gcd(a, f1);
          const p1 = a / g1;
          const q1 = f1 / g1;
          const g2 = gcd(f2, c);
          const ans = `(${g1}x + ${g2})(${p1}x + ${q1})`;
          return {
            parsedProblem: exprMatch[0],
            topic: 'Factoring Trinomial (a ≠ 1)',
            deltaMathFormatAnswer: ans,
            displayLatexAnswer: ans,
            confidence: 0.95,
            steps: [
              {
                stepNumber: 1,
                title: 'Find Factors',
                content: `Factors of ac = ${ac} that add to b = ${b}: ${f1} and ${f2}`,
              },
            ],
          };
        }
      }
    }
    return null;
  }

  // a === 1 case: (x + p)(x + q) where p*q = c and p+q = b
  for (let p = -Math.abs(c); p <= Math.abs(c); p++) {
    if (p !== 0 && c % p === 0) {
      const q = c / p;
      if (p + q === b) {
        const pStr = p >= 0 ? `+ ${p}` : `- ${Math.abs(p)}`;
        const qStr = q >= 0 ? `+ ${q}` : `- ${Math.abs(q)}`;
        const factoredAnswer = `(x ${pStr})(x ${qStr})`;

        return {
          parsedProblem: exprMatch[0],
          topic: 'Factoring Quadratic Trinomial',
          deltaMathFormatAnswer: factoredAnswer,
          displayLatexAnswer: factoredAnswer,
          confidence: 0.98,
          steps: [
            {
              stepNumber: 1,
              title: 'Find Factors of Constant Term',
              content: `Find two integers that multiply to ${c} and add to ${b}.`,
              mathLatex: `p \\cdot q = ${c},\\quad p + q = ${b}`,
            },
            {
              stepNumber: 2,
              title: 'Identify Pairs',
              content: `The integers are ${p} and ${q}.`,
              mathLatex: `p = ${p},\\ q = ${q}`,
            },
            {
              stepNumber: 3,
              title: 'Write Factored Expression',
              content: `DeltaMath Answer: ${factoredAnswer}`,
              mathLatex: factoredAnswer,
            },
          ],
        };
      }
    }
  }

  return null;
}

/**
 * 5. Master Dispatcher: Runs 100% offline math calculations
 */
export function calculateMathProblem(rawOcrText: string): MathCalculatorResult | null {
  if (!rawOcrText || rawOcrText.trim().length === 0) return null;

  const cleaned = sanitizeMathOcrText(rawOcrText);

  // 1. Try Quadratic solver first
  const quadResult = solveQuadratic(cleaned);
  if (quadResult) {
    quadResult.rawTextCleaned = cleaned;
    return quadResult;
  }

  // 2. Try Factoring trinomials
  const factorResult = solveFactoringExpression(cleaned);
  if (factorResult) {
    factorResult.rawTextCleaned = cleaned;
    return factorResult;
  }

  // 3. Try Linear equation
  const linearResult = solveLinearEquation(cleaned);
  if (linearResult) {
    linearResult.rawTextCleaned = cleaned;
    return linearResult;
  }

  // 4. Extended patterns (systems of equations, vertex form, radicals, logs, trig)
  try {
    const { solveMathLocally } = require('./mathSolver');
    const extended = solveMathLocally(cleaned);
    if (extended) {
      return {
        parsedProblem: extended.parsedProblem,
        topic: extended.topic,
        deltaMathFormatAnswer: extended.deltaMathFormatAnswer,
        displayLatexAnswer: extended.displayLatexAnswer,
        confidence: 0.95,
        steps: extended.steps || [],
        rawTextCleaned: cleaned,
      };
    }
  } catch {
    // No-op
  }

  return null;
}
