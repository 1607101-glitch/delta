export interface LocalSolveResult {
  parsedProblem: string;
  topic: string;
  deltaMathFormatAnswer: string;
  displayLatexAnswer: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    content: string;
    mathLatex?: string;
  }>;
  alternativeForms?: string[];
  commonMistakes?: string[];
  deltaMathInputTip?: string;
}

export function solveLocally(problemText: string, topicHint?: string): LocalSolveResult | null {
  if (!problemText) return null;
  const clean = problemText.trim();

  // Pattern 1: Linear Equation e.g. "3x - 7 = 14" or "Solve for x: 5x + 3 = 2x + 18"
  // Format: A x + B = C x + D
  const linearMatch = clean.match(/(?:solve\s*(?:for\s*[a-z])?[:\s]*)?([+-]?\s*\d*\.?\d*)\s*([a-z])\s*([+-]\s*\d+\.?\d*)?\s*=\s*([+-]?\s*\d*\.?\d*)\s*([a-z])?\s*([+-]\s*\d+\.?\d*)?/i);

  if (linearMatch) {
    const varName = linearMatch[2] || 'x';
    // parse coeff left
    let c1Str = (linearMatch[1] || '1').replace(/\s+/g, '');
    if (c1Str === '' || c1Str === '+') c1Str = '1';
    if (c1Str === '-') c1Str = '-1';
    const c1 = parseFloat(c1Str) || 1;

    // const left
    const const1Str = (linearMatch[3] || '0').replace(/\s+/g, '');
    const k1 = parseFloat(const1Str) || 0;

    // coeff right
    const hasRightVar = Boolean(linearMatch[5]);
    let c2 = 0;
    if (hasRightVar) {
      let c2Str = (linearMatch[4] || '1').replace(/\s+/g, '');
      if (c2Str === '' || c2Str === '+') c2Str = '1';
      if (c2Str === '-') c2Str = '-1';
      c2 = parseFloat(c2Str) || 1;
    }

    // const right
    let k2 = 0;
    if (hasRightVar) {
      const const2Str = (linearMatch[6] || '0').replace(/\s+/g, '');
      k2 = parseFloat(const2Str) || 0;
    } else {
      k2 = parseFloat((linearMatch[4] || '0').replace(/\s+/g, '')) || 0;
    }

    const netCoeff = c1 - c2;
    const netConst = k2 - k1;

    if (netCoeff !== 0) {
      const solutionVal = netConst / netCoeff;
      let formattedAns = '';
      if (Number.isInteger(solutionVal)) {
        formattedAns = `${varName} = ${solutionVal}`;
      } else {
        // Find fraction representation
        const gcd = (a: number, b: number): number => (!b ? a : gcd(b, a % b));
        const num = Math.round(netConst);
        const den = Math.round(netCoeff);
        const divisor = Math.abs(gcd(num, den));
        formattedAns = `${varName} = ${num / divisor}/${den / divisor}`;
      }

      return {
        parsedProblem: clean,
        topic: topicHint || 'Linear Equations',
        deltaMathFormatAnswer: formattedAns,
        displayLatexAnswer: `${varName} = ${Number.isInteger(solutionVal) ? solutionVal : `\\frac{${Math.round(netConst)}}{${Math.round(netCoeff)}}`}`,
        steps: [
          {
            stepNumber: 1,
            title: 'Group variable terms on the left side',
            content: `Subtract ${c2 !== 0 ? `${c2}${varName}` : 'terms'} to collect like terms: (${c1} - ${c2})${varName} = ${netCoeff}${varName}.`,
            mathLatex: `${netCoeff}${varName} + ${k1} = ${k2}`,
          },
          {
            stepNumber: 2,
            title: 'Isolate constant terms on the right side',
            content: `Subtract ${k1} from both sides to get ${netCoeff}${varName} = ${netConst}.`,
            mathLatex: `${netCoeff}${varName} = ${netConst}`,
          },
          {
            stepNumber: 3,
            title: `Divide by the coefficient ${netCoeff}`,
            content: `Divide both sides by ${netCoeff} to isolate ${varName}.`,
            mathLatex: `${varName} = ${Number.isInteger(solutionVal) ? solutionVal : `${netConst}/${netCoeff}`}`,
          },
        ],
        commonMistakes: [
          'Forgetting to invert signs when moving terms across the equals sign',
          'Entering as decimal when DeltaMath requires simplified fraction form',
        ],
        deltaMathInputTip: `Type "${formattedAns}" directly into DeltaMath. Use "/" if typing a fraction.`,
      };
    }
  }

  // Pattern 2: Quadratic Factoring x^2 + bx + c
  const quadMatch = clean.match(/x\^?2\s*([+-]\s*\d+)?x\s*([+-]\s*\d+)/i);
  if (quadMatch) {
    const b = parseFloat((quadMatch[1] || '+0').replace(/\s+/g, '')) || 0;
    const c = parseFloat((quadMatch[2] || '+0').replace(/\s+/g, '')) || 0;

    // Find factor pairs of c that sum to b
    for (let f1 = -Math.abs(c); f1 <= Math.abs(c); f1++) {
      if (f1 !== 0 && c % f1 === 0) {
        const f2 = c / f1;
        if (f1 + f2 === b) {
          const s1 = f1 >= 0 ? `+ ${f1}` : `- ${Math.abs(f1)}`;
          const s2 = f2 >= 0 ? `+ ${f2}` : `- ${Math.abs(f2)}`;
          const factored = `(x ${s1})(x ${s2})`;

          return {
            parsedProblem: clean,
            topic: 'Factoring Trinomials (a = 1)',
            deltaMathFormatAnswer: factored,
            displayLatexAnswer: factored,
            steps: [
              {
                stepNumber: 1,
                title: 'Identify coefficients b and c',
                content: `Here b = ${b} and c = ${c}.`,
                mathLatex: `b = ${b}, \\quad c = ${c}`,
              },
              {
                stepNumber: 2,
                title: 'Find two factors of c that add up to b',
                content: `${f1} and ${f2} multiply to ${c} and add to ${b}.`,
                mathLatex: `(${f1}) \\times (${f2}) = ${c}, \\quad (${f1}) + (${f2}) = ${b}`,
              },
              {
                stepNumber: 3,
                title: 'Write in factored form',
                content: `Combine into binomial factors: ${factored}`,
                mathLatex: factored,
              },
            ],
            deltaMathInputTip: 'Type (x - a)(x + b) with parentheses.',
          };
        }
      }
    }
  }

  return null;
}
