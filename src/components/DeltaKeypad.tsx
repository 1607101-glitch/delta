import React from 'react';

interface DeltaKeypadProps {
  onInsert: (symbol: string) => void;
  onClear: () => void;
  onBackspace: () => void;
}

export const DeltaKeypad: React.FC<DeltaKeypadProps> = ({
  onInsert,
  onClear,
  onBackspace,
}) => {
  const symbolButtons = [
    { label: 'x', insert: 'x' },
    { label: 'y', insert: 'y' },
    { label: 'x²', insert: '^2' },
    { label: 'xⁿ', insert: '^' },
    { label: '√x', insert: 'sqrt(' },
    { label: '÷', insert: '/' },
    { label: '±', insert: '+-' },
    { label: 'π', insert: 'pi' },
    { label: '∞', insert: 'infinity' },
    { label: '≤', insert: '<=' },
    { label: '≥', insert: '>=' },
    { label: '|x|', insert: '|' },
    { label: '( )', insert: '()' },
    { label: '[ ]', insert: '[]' },
    { label: 'log', insert: 'log(' },
    { label: 'ln', insert: 'ln(' },
    { label: 'sin', insert: 'sin(' },
    { label: 'cos', insert: 'cos(' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          DeltaMath Symbol Quick-Bar
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBackspace}
            className="px-2 py-0.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Backspace"
          >
            ⌫ Back
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-0.5 text-xs rounded bg-slate-800 hover:bg-rose-950 text-rose-300 transition"
            title="Clear Field"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
        {symbolButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => onInsert(btn.insert)}
            className="h-8 rounded bg-slate-800/80 hover:bg-sky-600/30 hover:border-sky-500/50 hover:text-sky-300 text-slate-200 font-mono text-sm border border-slate-700/60 transition active:scale-95 flex items-center justify-center font-medium"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};
