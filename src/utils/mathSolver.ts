export interface SolverStep {
  stepNumber: number;
  title: string;
  content: string;
  mathLatex?: string;
}

export interface LocalSolveResult {
  parsedProblem: string;
  topic: string;
  deltaMathFormatAnswer: string;
  displayLatexAnswer: string;
  steps: SolverStep[];
  alternativeForms?: string[];
  deltaMathInputTip?: string;
}

// Greatest Common Divisor
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

// Convert float or fraction to simplified "p/q" string
function toFractionString(val: number): string {
  if (Number.isInteger(val)) return val.toString();
  const tolerance = 1.0e-5;
  for (let d = 2; d <= 250; d++) {
    const n = Math.round(val * d);
    if (Math.abs(val - n / d) < tolerance) {
      const g = gcd(n, d);
      const num = n / g;
      const den = d / g;
      return den === 1 ? `${num}` : `${num}/${den}`;
    }
  }
  return val.toFixed(2).replace(/\.?0+$/, '');
}

// Clean and sanitize OCR string from DeltaMath screen captures
export function sanitizeMathOCR(raw: string): string {
  return raw
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√/g, 'sqrt')
    .replace(/±/g, '+-')
    .replace(/[×✕]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/θ/g, 'theta')
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    .trim();
}

/**
 * Parses a linear expression in one variable (like "7(2x - 3) + 4" or "3x - 7")
 * and computes its net { coeff, constant }.
 */
function parseLinearExpression(expr: string, varChar: string): { coeff: number; constant: number } | null {
  // Replace minus signs with + - to split tokens easily, while handling parentheses
  let text = expr.replace(/\s+/g, '');
  if (!text) return null;

  let totalCoeff = 0;
  let totalConst = 0;

  // 1. Expand distributed patterns like c(ax + b) or -c(ax - b) or +(ax + b)
  const distRegex = /([+-]?\d*)\(([+-]?\d*\.?\d*)([a-z])?([+-]\d*\.?\d*)?\)/gi;
  text = text.replace(distRegex, (match, outerMult, innerA, innerVar, innerB) => {
    let mult = 1;
    if (outerMult === '-' || outerMult === '-1') mult = -1;
    else if (outerMult && outerMult !== '+') mult = parseFloat(outerMult) || 1;

    let a = 0;
    if (innerVar) {
      if (innerA === '' || innerA === '+') a = 1;
      else if (innerA === '-') a = -1;
      else a = parseFloat(innerA) || 0;
    } else {
      // no var inside first term
      innerB = innerA;
    }

    const b = innerB ? parseFloat(innerB) || 0 : 0;
    totalCoeff += mult * a;
    totalConst += mult * b;
    return '+0';
  });

  // 2. Parse remaining linear terms like +3x, -7, 4x
  // Insert '+' before '-' if not at start
  const sanitized = text.replace(/(.)([+-])/g, '$1 $2');
  const tokens = sanitized.split(/\s+/).filter(Boolean);

  for (const tok of tokens) {
    if (!tok || tok === '+') continue;
    if (new RegExp(varChar, 'i').test(tok)) {
      const coeffPart = tok.replace(new RegExp(varChar, 'gi'), '');
      let c = 1;
      if (coeffPart === '' || coeffPart === '+') c = 1;
      else if (coeffPart === '-') c = -1;
      else c = parseFloat(coeffPart) || 0;
      totalCoeff += c;
    } else {
      const val = parseFloat(tok);
      if (!isNaN(val)) totalConst += val;
    }
  }

  return { coeff: totalCoeff, constant: totalConst };
}

/**
 * Universal Standalone Math Solver
 * Solves DeltaMath problem archetypes completely offline without any external API calls.
 */
export function solveMathLocally(input: string): LocalSolveResult | null {
  if (!input || !input.trim()) return null;
  const raw = sanitizeMathOCR(input);

  // =========================================================================
  // 1. SYSTEM OF LINEAR EQUATIONS (e.g. "3x + 2y = 16 and 5x - 2y = 16")
  // =========================================================================
  const systemLines = raw
    .split(/\n|and|,/)
    .map((s) => s.trim())
    .filter((s) => s.includes('='));
  if (systemLines.length >= 2) {
    const eqRegex = /([+-]?\s*\d*\.?\d*)\s*x\s*([+-]\s*\d*\.?\d*)\s*y\s*=\s*([+-]?\s*\d+\.?\d*)/i;
    const m1 = systemLines[0].match(eqRegex);
    const m2 = systemLines[1].match(eqRegex);

    if (m1 && m2) {
      const parseCoeff = (str: string) => {
        const c = str.replace(/\s+/g, '');
        if (c === '' || c === '+') return 1;
        if (c === '-') return -1;
        return parseFloat(c) || 0;
      };

      const a1 = parseCoeff(m1[1]);
      const b1 = parseCoeff(m1[2]);
      const c1 = parseFloat(m1[3].replace(/\s+/g, '')) || 0;

      const a2 = parseCoeff(m2[1]);
      const b2 = parseCoeff(m2[2]);
      const c2 = parseFloat(m2[3].replace(/\s+/g, '')) || 0;

      const det = a1 * b2 - a2 * b1;
      if (det !== 0) {
        const x = (c1 * b2 - c2 * b1) / det;
        const y = (a1 * c2 - a2 * c1) / det;

        const xStr = toFractionString(x);
        const yStr = toFractionString(y);
        const coordAnswer = `(${xStr}, ${yStr})`;

        return {
          parsedProblem: `${systemLines[0]}; ${systemLines[1]}`,
          topic: 'System of Linear Equations',
          deltaMathFormatAnswer: coordAnswer,
          displayLatexAnswer: `(${xStr}, \\; ${yStr})`,
          steps: [
            {
              stepNumber: 1,
              title: 'Write system in standard matrix form',
              content: `Equation 1: ${a1}x + ${b1}y = ${c1}, Equation 2: ${a2}x + ${b2}y = ${c2}.`,
              mathLatex: `\\begin{cases} ${a1}x + ${b1}y = ${c1} \\\\ ${a2}x + ${b2}y = ${c2} \\end{cases}`,
            },
            {
              stepNumber: 2,
              title: "Apply Cramer's Rule or Elimination",
              content: `Determinant D = (${a1})(${b2}) - (${a2})(${b1}) = ${det}. Solve x = Dx/D, y = Dy/D.`,
              mathLatex: `D = ${det}, \\quad D_x = ${c1 * b2 - c2 * b1}, \\quad D_y = ${a1 * c2 - a2 * c1}`,
            },
            {
              stepNumber: 3,
              title: 'Write solution as an ordered pair',
              content: `Ordered pair coordinates (x, y) = (${xStr}, ${yStr}).`,
              mathLatex: `(x, y) = (${xStr}, \\; ${yStr})`,
            },
          ],
          deltaMathInputTip: 'Type as an ordered pair with parentheses: (x, y)',
        };
      }
    }
  }

  // =========================================================================
  // 2. QUADRATICS: Factoring or Solving ax^2 + bx + c = 0
  // =========================================================================
  const isFactoringPrompt = /factor/i.test(raw);
  const quadMatch = raw.match(
    /([+-]?\s*\d*)\s*([a-z])\^?2\s*(?:([+-]\s*\d+)?\s*\2)?\s*([+-]\s*\d+)?(?:\s*=\s*0)?/i
  );

  if (quadMatch) {
    const varName = quadMatch[2] || 'x';
    let aStr = (quadMatch[1] || '1').replace(/\s+/g, '');
    if (aStr === '' || aStr === '+') aStr = '1';
    if (aStr === '-') aStr = '-1';
    const a = parseInt(aStr, 10) || 1;

    let bStr = (quadMatch[3] || '+0').replace(/\s+/g, '');
    const b = parseInt(bStr, 10) || 0;

    let cStr = (quadMatch[4] || '+0').replace(/\s+/g, '');
    const c = parseInt(cStr, 10) || 0;

    const discriminant = b * b - 4 * a * c;

    if (discriminant >= 0) {
      const sqrtD = Math.sqrt(discriminant);

      if (Number.isInteger(sqrtD)) {
        const root1 = (-b + sqrtD) / (2 * a);
        const root2 = (-b - sqrtD) / (2 * a);

        const r1Str = toFractionString(root1);
        const r2Str = toFractionString(root2);

        // Factoring requested: (ax + b)(cx + d)
        if (isFactoringPrompt) {
          let factoredAns = '';
          if (a === 1) {
            const s1 = -root1 >= 0 ? `+ ${-root1}` : `- ${Math.abs(root1)}`;
            const s2 = -root2 >= 0 ? `+ ${-root2}` : `- ${Math.abs(root2)}`;
            factoredAns = `(${varName} ${s1})(${varName} ${s2})`;
          } else {
            // Find integers p, q, r, s such that (px + q)(rx + s)
            let p = 1, q = 0, r = 1, s = 0;
            let found = false;
            for (let testP = 1; testP <= Math.abs(a); testP++) {
              if (a % testP === 0) {
                const testR = a / testP;
                for (let testQ = -Math.abs(c || 1) - 5; testQ <= Math.abs(c || 1) + 5; testQ++) {
                  for (let testS = -Math.abs(c || 1) - 5; testS <= Math.abs(c || 1) + 5; testS++) {
                    if (testQ * testS === c && testP * testS + testR * testQ === b) {
                      p = testP; q = testQ; r = testR; s = testS;
                      found = true;
                      break;
                    }
                  }
                  if (found) break;
                }
              }
              if (found) break;
            }

            if (found) {
              const qStr = q >= 0 ? `+ ${q}` : `- ${Math.abs(q)}`;
              const sStr = s >= 0 ? `+ ${s}` : `- ${Math.abs(s)}`;
              const pStr = p === 1 ? varName : `${p}${varName}`;
              const rStr = r === 1 ? varName : `${r}${varName}`;
              factoredAns = `(${pStr} ${qStr})(${rStr} ${sStr})`;
            } else {
              factoredAns = `(${varName} - ${r1Str})(${varName} - ${r2Str})`;
            }
          }

          return {
            parsedProblem: raw,
            topic: 'Factoring Trinomials',
            deltaMathFormatAnswer: factoredAns,
            displayLatexAnswer: factoredAns,
            steps: [
              {
                stepNumber: 1,
                title: 'Identify coefficients a, b, and c',
                content: `a = ${a}, b = ${b}, c = ${c}. Product ac = ${a * c}, sum b = ${b}.`,
                mathLatex: `a = ${a}, \\quad b = ${b}, \\quad c = ${c}`,
              },
              {
                stepNumber: 2,
                title: 'Find factors and factor completely',
                content: `The factored expression is ${factoredAns}.`,
                mathLatex: factoredAns,
              },
            ],
            deltaMathInputTip: 'Type factored form with parentheses: (x - a)(x + b)',
          };
        }

        // Standard roots format for DeltaMath: comma separated roots, e.g. "8, -4"
        const deltaAns = root1 === root2 ? r1Str : `${r1Str}, ${r2Str}`;

        return {
          parsedProblem: raw,
          topic: 'Quadratic Equation (Roots)',
          deltaMathFormatAnswer: deltaAns,
          displayLatexAnswer: root1 === root2 ? `${varName} = ${r1Str}` : `${varName} = ${r1Str}, \\; ${r2Str}`,
          steps: [
            {
              stepNumber: 1,
              title: 'Identify coefficients from standard form',
              content: `In standard form ax² + bx + c = 0: a = ${a}, b = ${b}, c = ${c}.`,
              mathLatex: `a = ${a}, \\quad b = ${b}, \\quad c = ${c}`,
            },
            {
              stepNumber: 2,
              title: 'Evaluate the discriminant',
              content: `b² - 4ac = (${b})² - 4(${a})(${c}) = ${discriminant}. √${discriminant} = ${sqrtD}.`,
              mathLatex: `\\Delta = b^2 - 4ac = ${discriminant}`,
            },
            {
              stepNumber: 3,
              title: 'Calculate solutions',
              content: `${varName} = (-b ± √Δ) / 2a = (${-b} ± ${sqrtD}) / ${2 * a}.`,
              mathLatex: `${varName} = ${r1Str}, \\quad ${varName} = ${r2Str}`,
            },
          ],
          deltaMathInputTip: 'Enter answers separated by a comma: e.g. 8, -4',
        };
      } else {
        // Radical root: x = (-b +- sqrt(D)) / 2a
        const deltaAns = `${toFractionString(-b / (2 * a))} +- sqrt(${discriminant})/${2 * a}`;
        return {
          parsedProblem: raw,
          topic: 'Quadratic Equation (Radical Form)',
          deltaMathFormatAnswer: deltaAns,
          displayLatexAnswer: `${varName} = \\frac{${-b} \\pm \\sqrt{${discriminant}}}{${2 * a}}`,
          steps: [
            {
              stepNumber: 1,
              title: 'Apply the Quadratic Formula',
              content: `Substitute a = ${a}, b = ${b}, c = ${c} into (-b ± √(b² - 4ac)) / (2a).`,
              mathLatex: `${varName} = \\frac{${-b} \\pm \\sqrt{${discriminant}}}{${2 * a}}`,
            },
          ],
          deltaMathInputTip: 'Enter in radical or simplified form',
        };
      }
    }
  }

  // =========================================================================
  // 3. VERTEX FORM / COMPLETING THE SQUARE: y = a(x - h)^2 + k
  // =========================================================================
  const vertexMatch = raw.match(
    /y\s*=\s*([+-]?\s*\d*)\s*\(x\s*([+-]\s*\d+\.?\d*)\)\^2\s*([+-]\s*\d+\.?\d*)/i
  );
  if (vertexMatch) {
    const hSign = vertexMatch[2].replace(/\s+/g, '');
    const h = -parseFloat(hSign);
    const k = parseFloat(vertexMatch[3].replace(/\s+/g, '')) || 0;
    const vertexStr = `(${h}, ${k})`;

    return {
      parsedProblem: raw,
      topic: 'Vertex Form of a Parabola',
      deltaMathFormatAnswer: vertexStr,
      displayLatexAnswer: `\\text{Vertex} = (${h}, \\; ${k})`,
      steps: [
        {
          stepNumber: 1,
          title: 'Identify (h, k) from Vertex Form y = a(x - h)² + k',
          content: `In y = a(x - h)² + k, the vertex is (h, k). Here h = ${h} and k = ${k}.`,
          mathLatex: `(h, k) = (${h}, \\; ${k})`,
        },
      ],
      deltaMathInputTip: 'Type coordinate pair: (h, k)',
    };
  }

  // =========================================================================
  // 4. MULTI-STEP LINEAR EQUATIONS (supports 7(2x - 3) = 4(3x + 1) + 7 or ax + b = cx + d)
  // =========================================================================
  if (raw.includes('=')) {
    const parts = raw.split('=');
    if (parts.length === 2) {
      // Find the variable letter (x, y, n, t, etc.)
      const varMatch = raw.match(/(?:solve\s*(?:for\s*)?([a-z]))|([a-z])\b/i);
      const varChar = varMatch ? (varMatch[1] || varMatch[2] || 'x') : 'x';

      const lhs = parseLinearExpression(parts[0], varChar);
      const rhs = parseLinearExpression(parts[1], varChar);

      if (lhs && rhs) {
        const netCoeff = lhs.coeff - rhs.coeff;
        const netConst = rhs.constant - lhs.constant;

        if (Math.abs(netCoeff) > 1e-6) {
          const solutionVal = netConst / netCoeff;
          const formattedAns = toFractionString(solutionVal);

          return {
            parsedProblem: raw,
            topic: 'Linear Equation',
            deltaMathFormatAnswer: formattedAns,
            displayLatexAnswer: `${varChar} = ${formattedAns}`,
            steps: [
              {
                stepNumber: 1,
                title: 'Distribute & combine like terms on both sides',
                content: `Left side simplifies to ${lhs.coeff}${varChar} + ${lhs.constant}. Right side simplifies to ${rhs.coeff}${varChar} + ${rhs.constant}.`,
                mathLatex: `${lhs.coeff}${varChar} + ${lhs.constant} = ${rhs.coeff}${varChar} + ${rhs.constant}`,
              },
              {
                stepNumber: 2,
                title: 'Collect variable terms on one side',
                content: `Subtract ${rhs.coeff}${varChar} and subtract constant: ${netCoeff}${varChar} = ${netConst}.`,
                mathLatex: `${netCoeff}${varChar} = ${netConst}`,
              },
              {
                stepNumber: 3,
                title: `Divide by coefficient ${netCoeff}`,
                content: `Divide both sides by ${netCoeff} to isolate ${varChar}: ${varChar} = ${formattedAns}.`,
                mathLatex: `${varChar} = ${formattedAns}`,
              },
            ],
            deltaMathInputTip: `Type "${formattedAns}" directly into DeltaMath. Use "/" for fractions.`,
          };
        }
      }
    }
  }

  // =========================================================================
  // 5. RADICAL EQUATION: sqrt(ax + b) = c
  // =========================================================================
  const radMatch = raw.match(/sqrt\s*\(\s*([+-]?\s*\d*)\s*([a-z])\s*([+-]\s*\d+)?\s*\)\s*=\s*([+-]?\s*\d+)/i);
  if (radMatch) {
    const varName = radMatch[2] || 'x';
    let aStr = (radMatch[1] || '1').replace(/\s+/g, '');
    if (aStr === '' || aStr === '+') aStr = '1';
    if (aStr === '-') aStr = '-1';
    const a = parseFloat(aStr) || 1;
    const b = parseFloat((radMatch[3] || '+0').replace(/\s+/g, '')) || 0;
    const c = parseFloat(radMatch[4].replace(/\s+/g, '')) || 0;

    const rhs = c * c;
    const ans = (rhs - b) / a;
    const ansStr = toFractionString(ans);

    return {
      parsedProblem: raw,
      topic: 'Radical Equation',
      deltaMathFormatAnswer: ansStr,
      displayLatexAnswer: `${varName} = ${ansStr}`,
      steps: [
        {
          stepNumber: 1,
          title: 'Square both sides to eliminate square root',
          content: `(${a}${varName} + ${b}) = (${c})² = ${rhs}.`,
          mathLatex: `${a}${varName} + ${b} = ${rhs}`,
        },
        {
          stepNumber: 2,
          title: `Solve for ${varName}`,
          content: `${a}${varName} = ${rhs - b} => ${varName} = ${ansStr}.`,
          mathLatex: `${varName} = ${ansStr}`,
        },
      ],
      deltaMathInputTip: 'Type the simplified value.',
    };
  }

  // =========================================================================
  // 6. RATIONAL EQUATION: (ax + b) / c = d or a / (bx + c) = d
  // =========================================================================
  const ratMatch = raw.match(/([+-]?\s*\d+)\s*\/\s*\(\s*([+-]?\s*\d*)\s*([a-z])\s*([+-]\s*\d+)?\s*\)\s*=\s*([+-]?\s*\d+)/i);
  if (ratMatch) {
    const num = parseFloat(ratMatch[1]) || 1;
    let bStr = (ratMatch[2] || '1').replace(/\s+/g, '');
    if (bStr === '' || bStr === '+') bStr = '1';
    if (bStr === '-') bStr = '-1';
    const b = parseFloat(bStr) || 1;
    const varName = ratMatch[3] || 'x';
    const c = parseFloat((ratMatch[4] || '+0').replace(/\s+/g, '')) || 0;
    const d = parseFloat(ratMatch[5]) || 1;

    // num / (b*x + c) = d  =>  b*x + c = num / d  =>  b*x = (num/d) - c
    const rhs = num / d;
    const ans = (rhs - c) / b;
    const ansStr = toFractionString(ans);

    return {
      parsedProblem: raw,
      topic: 'Rational Equation',
      deltaMathFormatAnswer: ansStr,
      displayLatexAnswer: `${varName} = ${ansStr}`,
      steps: [
        {
          stepNumber: 1,
          title: 'Cross multiply to eliminate the denominator',
          content: `${d}(${b}${varName} + ${c}) = ${num}.`,
          mathLatex: `${b * d}${varName} + ${c * d} = ${num}`,
        },
        {
          stepNumber: 2,
          title: `Solve for ${varName}`,
          content: `${b}${varName} = ${(num / d) - c} => ${varName} = ${ansStr}.`,
          mathLatex: `${varName} = ${ansStr}`,
        },
      ],
      deltaMathInputTip: 'Enter integer or simplified fraction.',
    };
  }

  // =========================================================================
  // 7. TRIGONOMETRY: tan(theta) = opp / adj or sin / cos
  // =========================================================================
  const trigMatch = raw.match(/(sin|cos|tan)\s*\(\s*(?:theta|θ|[a-z])\s*\)\s*=\s*([+-]?\s*\d+\.?\d*)\s*(?:\/|\s+over\s+)\s*([+-]?\s*\d+\.?\d*)/i);
  if (trigMatch) {
    const func = trigMatch[1].toLowerCase();
    const num = parseFloat(trigMatch[2]) || 1;
    const den = parseFloat(trigMatch[3]) || 1;
    const ratio = num / den;

    let deg = 0;
    if (func === 'tan') deg = (Math.atan(ratio) * 180) / Math.PI;
    else if (func === 'sin') deg = (Math.asin(ratio) * 180) / Math.PI;
    else if (func === 'cos') deg = (Math.acos(ratio) * 180) / Math.PI;

    const roundedDeg = (Math.round(deg * 10) / 10).toFixed(1);

    return {
      parsedProblem: raw,
      topic: 'Right Triangle Trigonometry',
      deltaMathFormatAnswer: roundedDeg,
      displayLatexAnswer: `\\theta = ${roundedDeg}^\\circ`,
      steps: [
        {
          stepNumber: 1,
          title: `Use inverse ${func} (${func}⁻¹)`,
          content: `θ = ${func}⁻¹(${num} / ${den}) = ${func}⁻¹(${ratio.toFixed(4)}).`,
          mathLatex: `\\theta = \\arctan\\left(\\frac{${num}}{${den}}\\right)`,
        },
        {
          stepNumber: 2,
          title: 'Round to the nearest tenth of a degree',
          content: `θ ≈ ${roundedDeg}°.`,
          mathLatex: `\\theta \\approx ${roundedDeg}^\\circ`,
        },
      ],
      deltaMathInputTip: `Enter decimal value rounded to nearest tenth: ${roundedDeg}`,
    };
  }

  // =========================================================================
  // 8. LOGARITHMIC EQUATION: log_b(ax + c) = d
  // =========================================================================
  const logMatch = raw.match(/log_?(\d+)?\s*\(\s*([+-]?\s*\d*)\s*([a-z])\s*([+-]\s*\d+)?\s*\)\s*=\s*([+-]?\s*\d+)/i);
  if (logMatch) {
    const base = parseInt(logMatch[1] || '10', 10);
    let aStr = (logMatch[2] || '1').replace(/\s+/g, '');
    if (aStr === '' || aStr === '+') aStr = '1';
    if (aStr === '-') aStr = '-1';
    const a = parseFloat(aStr) || 1;
    const varName = logMatch[3] || 'x';
    const c = parseFloat((logMatch[4] || '+0').replace(/\s+/g, '')) || 0;
    const d = parseFloat(logMatch[5]) || 0;

    const expVal = Math.pow(base, d);
    const ans = (expVal - c) / a;
    const ansStr = toFractionString(ans);

    return {
      parsedProblem: raw,
      topic: 'Logarithmic Equation',
      deltaMathFormatAnswer: ansStr,
      displayLatexAnswer: `${varName} = ${ansStr}`,
      steps: [
        {
          stepNumber: 1,
          title: 'Convert logarithm to exponential form',
          content: `${a}${varName} + ${c} = ${base}^${d} = ${expVal}.`,
          mathLatex: `${a}${varName} + ${c} = ${expVal}`,
        },
        {
          stepNumber: 2,
          title: `Solve for ${varName}`,
          content: `${a}${varName} = ${expVal - c} => ${varName} = ${ansStr}.`,
          mathLatex: `${varName} = ${ansStr}`,
        },
      ],
      deltaMathInputTip: 'Type the simplified value.',
    };
  }

  return null;
}
