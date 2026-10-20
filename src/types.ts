export interface DeltaMathStep {
  stepNumber: number;
  title: string;
  content: string;
  mathLatex?: string;
}

export interface DeltaMathGraphData {
  type: 'line' | 'parabola' | 'points' | 'inequality';
  equation?: string;
  points?: [number, number][];
  slope?: number;
  yIntercept?: number;
  vertex?: [number, number];
  axisOfSymmetry?: number;
  zeros?: number[];
}

export interface DeltaMathProblem {
  id: string;
  topic: string;
  category: string;
  gradeLevel: 'Algebra 1' | 'Geometry' | 'Algebra 2' | 'Pre-Calculus' | 'AP Calculus';
  prompt: string;
  promptLatex?: string;
  instructions: string;
  deltaMathFormatAnswer: string;
  displayLatexAnswer?: string;
  alternativeForms?: string[];
  solutionSteps: DeltaMathStep[];
  inputPlaceholder?: string;
  inputType: 'single-value' | 'equation' | 'coordinates' | 'expression' | 'graph' | 'interval';
  graphData?: DeltaMathGraphData;
}

export interface DeltaMathAssignment {
  id: string;
  title: string;
  course: string;
  teacher: string;
  dueDate: string;
  requiredScore: number;
  currentScore: number;
  penaltyPerMistake: number;
  problems: DeltaMathProblem[];
}

export interface StudentSession {
  isLoggedIn: boolean;
  studentName: string;
  email: string;
  teacherName: string;
  schoolName: string;
  period: string;
  classCode: string;
  sessionToken: string;
}

export interface SolverResult {
  parsedProblem: string;
  topic?: string;
  deltaMathFormatAnswer: string;
  displayLatexAnswer?: string;
  steps: DeltaMathStep[];
  alternativeForms?: string[];
  commonMistakes?: string[];
  deltaMathInputTip?: string;
  graphData?: DeltaMathGraphData;
}
