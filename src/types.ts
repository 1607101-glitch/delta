export interface SolverStep {
  stepNumber: number;
  title: string;
  content: string;
  mathLatex?: string;
}

export interface SolverResult {
  parsedProblem: string;
  topic?: string;
  deltaMathFormatAnswer: string;
  displayLatexAnswer?: string;
  steps: SolverStep[];
  alternativeForms?: string[];
  commonMistakes?: string[];
  deltaMathInputTip?: string;
}
