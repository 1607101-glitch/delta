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
 * 1. OCR Normalization & Sanitization
 */
export function sanitizeMathOcrText(rawText: string): string {
  let cleaned = rawText;

  // Remove filler DeltaMath UI chrome text
  cleaned = cleaned.replace(/score:\s*\d+(\/\d+)?/gi, '');
  cleaned = cleaned.replace(/penalty:\s*[\d.]+\s*(%|off)?/gi, '');
  cleaned = cleaned.replace(/watch\s*video/gi, '');
  cleaned = cleaned.replace(/show\s*example[s]?/gi, '');
  cleaned = cleaned.replace(/attempt\s*\d+\s*(of\s*\d+)?/gi, '');
  cleaned = cleaned.replace(/next\s*problem/gi, '');
  cleaned = cleaned.replace(/submit\s*answer/gi, '');
  cleaned = cleaned.replace(/delta\s*math/gi, '');
  cleaned = cleaned.replace(/calculator/gi, '');

  // Replace unicode dashes & minus signs
  cleaned = cleaned.replace(/[−–—]/g, '-');

  // Normalize exponents: x², x2 right after x, x^2
  cleaned = cleaned.replace(/([a-zA-Z])[²2]/g, '$1^2');
  cleaned = cleaned.replace(/([a-zA-Z])\s*\^\s*2/g, '$1^2');

  // Fix common OCR number confusion:
  // 'O' or 'o' between digits or right after minus/plus or next to digits -> 0
  cleaned = cleaned.replace(/(\d)[Oo]/g, '$10');
  cleaned = cleaned.replace(/[Oo](\d)/g, '0$1');
  cleaned = cleaned.replace(/([+\-=]\s*)[Oo](?!\w)/g, '$10');

  // Isolated lowercase 'l' or pipe '|' or 'I' next to numbers or operators -> 1
  cleaned = cleaned.replace(/(^|\s)[l|I](\s|$|[+\-*/=])/g, '$11$2');

  // Replace common unicode multiplication
  cleaned = cleaned.replace(/[×•]/g, '*');

  // Trim whitespace
  return cleaned.trim();
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
 * Matches equations like ax^2 + bx + c = 0
 */
export function solveQuadratic(text: string): MathCalculatorResult | null {
  // Pattern 1: ax^2 + bx + c = 0
  const quadRegex = /([+-]?\s*\d*)\s*x\^2\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)\s*=\s*0/i;
  const match = text.match(quadRegex);

  // Pattern 2: ax^2 + c = 0 or ax^2 + bx = 0
  const quadSimpleRegex = /([+-]?\s*\d*)\s*x\^2\s*([+-]\s*\d+)\s*=\s*0/i;
  const quadNoConstRegex = /([+-]?\s*\d*)\s*x\^2\s*([+-]\s*\d*)\s*x\s*=\s*0/i;

  let a = 1, b = 0, c = 0;
  let equationFound = false;
  let matchedStr = '';

  if (match) {
    a = parseCoeff(match[1]);
    b = parseCoeff(match[2]);
    c = parseFloat(match[3].replace(/\s+/g, ''));
    equationFound = true;
    matchedStr = match[0];
  } else {
    const mSimple = text.match(quadSimpleRegex);
    if (mSimple) {
      a = parseCoeff(mSimple[1]);
      b = 0;
      c = parseFloat(mSimple[2].replace(/\s+/g, ''));
      equationFound = true;
      matchedStr = mSimple[0];
    } else {
      const mNoConst = text.match(quadNoConstRegex);
      if (mNoConst) {
        a = parseCoeff(mNoConst[1]);
        b = parseCoeff(mNoConst[2]);
        c = 0;
        equationFound = true;
        matchedStr = mNoConst[0];
      }
    }
  }

  // Also match general ax^2 + bx + c with RHS != 0: ax^2 + bx + c = d
  if (!equationFound) {
    const generalQuad = /([+-]?\s*\d*)\s*x\^2\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)?\s*=\s*([+-]?\s*\d+)/i;
    const gMatch = text.match(generalQuad);
    if (gMatch) {
      a = parseCoeff(gMatch[1]);
      b = gMatch[2] ? parseCoeff(gMatch[2]) : 0;
      const lhsC = gMatch[3] ? parseFloat(gMatch[3].replace(/\s+/g, '')) : 0;
      const rhs = parseFloat(gMatch[4].replace(/\s+/g, ''));
      c = lhsC - rhs;
      equationFound = true;
      matchedStr = gMatch[0];
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
      content: `Extract coefficients from ${a}x² ${b >= 0 ? `+ ${b}` : b}x ${c >= 0 ? `+ ${c}` : c} = 0`,
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
