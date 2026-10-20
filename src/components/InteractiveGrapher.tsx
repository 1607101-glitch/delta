import React, { useState, useEffect } from 'react';
import { DeltaMathGraphData } from '../types';
import { RotateCcw, CheckCircle, Crosshair } from 'lucide-react';

interface InteractiveGrapherProps {
  graphData?: DeltaMathGraphData;
  onAnswerChange?: (formattedAnswer: string) => void;
  isAutoSolved?: boolean;
}

export const InteractiveGrapher: React.FC<InteractiveGrapherProps> = ({
  graphData,
  onAnswerChange,
  isAutoSolved = false,
}) => {
  const [userPoints, setUserPoints] = useState<[number, number][]>([]);
  const [hoverCoord, setHoverCoord] = useState<[number, number] | null>(null);

  // Synchronize when auto-solved
  useEffect(() => {
    if (isAutoSolved && graphData?.points && graphData.points.length > 0) {
      setUserPoints(graphData.points);
      if (onAnswerChange) {
        onAnswerChange(formatPointsAnswer(graphData.points, graphData.type));
      }
    }
  }, [isAutoSolved, graphData]);

  // Coordinate system configuration
  const minX = -10;
  const maxX = 10;
  const minY = -10;
  const maxY = 10;
  const width = 440;
  const height = 440;
  const padding = 20;

  const toSvgX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  const toSvgY = (y: number) => padding + ((maxY - y) / (maxY - minY)) * (height - 2 * padding);

  const fromSvgToMath = (svgX: number, svgY: number): [number, number] => {
    const rawX = minX + ((svgX - padding) / (width - 2 * padding)) * (maxX - minX);
    const rawY = maxY - ((svgY - padding) / (height - 2 * padding)) * (maxY - minY);
    // Snap to nearest integer or 0.5
    const snappedX = Math.round(rawX);
    const snappedY = Math.round(rawY);
    return [
      Math.max(minX, Math.min(maxX, snappedX)),
      Math.max(minY, Math.min(maxY, snappedY)),
    ];
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const [mathX, mathY] = fromSvgToMath(clickX, clickY);

    // Toggle point or append (max 4 points)
    const existsIndex = userPoints.findIndex(([px, py]) => px === mathX && py === mathY);
    let nextPoints: [number, number][];

    if (existsIndex >= 0) {
      nextPoints = userPoints.filter((_, idx) => idx !== existsIndex);
    } else {
      if (userPoints.length >= 4) {
        nextPoints = [...userPoints.slice(1), [mathX, mathY]];
      } else {
        nextPoints = [...userPoints, [mathX, mathY]];
      }
    }

    setUserPoints(nextPoints);
    if (onAnswerChange) {
      onAnswerChange(formatPointsAnswer(nextPoints, graphData?.type || 'points'));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const [mathX, mathY] = fromSvgToMath(e.clientX - rect.left, e.clientY - rect.top);
    setHoverCoord([mathX, mathY]);
  };

  const formatPointsAnswer = (pts: [number, number][], type: string) => {
    if (pts.length === 0) return '';
    if (type === 'line' && pts.length >= 2) {
      return `Line passing through (${pts[0][0]}, ${pts[0][1]}) and (${pts[1][0]}, ${pts[1][1]})`;
    }
    if (type === 'parabola' && pts.length >= 2) {
      return `Parabola with vertex (${pts[0][0]}, ${pts[0][1]}) and point (${pts[1][0]}, ${pts[1][1]})`;
    }
    return pts.map(([x, y]) => `(${x}, ${y})`).join(', ');
  };

  const resetGrid = () => {
    setUserPoints([]);
    if (onAnswerChange) onAnswerChange('');
  };

  const autoPlot = () => {
    if (graphData?.points) {
      setUserPoints(graphData.points);
      if (onAnswerChange) {
        onAnswerChange(formatPointsAnswer(graphData.points, graphData.type));
      }
    }
  };

  // Generate grid ticks
  const ticks = Array.from({ length: 21 }, (_, i) => -10 + i);

  // Calculate curve points for parabola
  let parabolaPath = '';
  if (graphData?.type === 'parabola' && userPoints.length >= 2) {
    // Fit y = a(x - h)^2 + k using first point as vertex
    const [h, k] = userPoints[0];
    const [x1, y1] = userPoints[1];
    const denom = Math.pow(x1 - h, 2);
    const a = denom !== 0 ? (y1 - k) / denom : 1;

    const pathPoints: string[] = [];
    for (let x = minX; x <= maxX; x += 0.2) {
      const y = a * Math.pow(x - h, 2) + k;
      if (y >= minY - 2 && y <= maxY + 2) {
        const sx = toSvgX(x);
        const sy = toSvgY(y);
        pathPoints.push(`${pathPoints.length === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
      }
    }
    parabolaPath = pathPoints.join(' ');
  } else if (graphData?.type === 'line' && userPoints.length >= 2) {
    const [x1, y1] = userPoints[0];
    const [x2, y2] = userPoints[1];
    if (x1 === x2) {
      parabolaPath = `M ${toSvgX(x1)} ${toSvgY(minY)} L ${toSvgX(x1)} ${toSvgY(maxY)}`;
    } else {
      const m = (y2 - y1) / (x2 - x1);
      const b = y1 - m * x1;
      const yAtMinX = m * minX + b;
      const yAtMaxX = m * maxX + b;
      parabolaPath = `M ${toSvgX(minX)} ${toSvgY(yAtMinX)} L ${toSvgX(maxX)} ${toSvgY(yAtMaxX)}`;
    }
  }

  return (
    <div className="flex flex-col items-center bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <Crosshair className="w-4 h-4 text-sky-400" />
          <span>
            Cursor: <strong className="text-sky-300">{hoverCoord ? `(${hoverCoord[0]}, ${hoverCoord[1]})` : 'Hover grid'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={autoPlot}
            className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-950/70 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/60 transition flex items-center gap-1 shadow-sm"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Auto-Plot Correct Graph
          </button>
          <button
            type="button"
            onClick={resetGrid}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Clear Points"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative border border-slate-700 rounded-lg overflow-hidden bg-slate-900 cursor-crosshair">
        <svg
          width={width}
          height={height}
          onClick={handleSvgClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoord(null)}
          className="select-none"
        >
          {/* Background grid lines */}
          {ticks.map((t) => {
            const sx = toSvgX(t);
            const sy = toSvgY(t);
            const isAxis = t === 0;
            return (
              <g key={`grid-${t}`}>
                {/* Vertical grid line */}
                <line
                  x1={sx}
                  y1={padding}
                  x2={sx}
                  y2={height - padding}
                  stroke={isAxis ? '#94a3b8' : '#334155'}
                  strokeWidth={isAxis ? 1.75 : 0.75}
                  strokeDasharray={!isAxis ? '2,2' : undefined}
                />
                {/* Horizontal grid line */}
                <line
                  x1={padding}
                  y1={sy}
                  x2={width - padding}
                  y2={sy}
                  stroke={isAxis ? '#94a3b8' : '#334155'}
                  strokeWidth={isAxis ? 1.75 : 0.75}
                  strokeDasharray={!isAxis ? '2,2' : undefined}
                />

                {/* Number labels on axes */}
                {t !== 0 && t % 2 === 0 && (
                  <>
                    <text
                      x={sx}
                      y={toSvgY(0) + 14}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="middle"
                      className="font-mono select-none pointer-events-none"
                    >
                      {t}
                    </text>
                    <text
                      x={toSvgX(0) - 6}
                      y={sy + 3}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="end"
                      className="font-mono select-none pointer-events-none"
                    >
                      {t}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Coordinate axis arrows and labels */}
          <text x={width - 14} y={toSvgY(0) - 5} fill="#94a3b8" fontSize="11" fontWeight="bold">
            x
          </text>
          <text x={toSvgX(0) + 8} y={padding + 5} fill="#94a3b8" fontSize="11" fontWeight="bold">
            y
          </text>

          {/* Drawn Function Path */}
          {parabolaPath && (
            <path
              d={parabolaPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* User Plotted Points */}
          {userPoints.map(([px, py], i) => (
            <g key={`point-${i}`}>
              <circle
                cx={toSvgX(px)}
                cy={toSvgY(py)}
                r="6"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={toSvgX(px) + 8}
                y={toSvgY(py) - 8}
                fill="#e2e8f0"
                fontSize="10"
                fontWeight="bold"
                className="font-mono"
              >
                ({px}, {py})
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="w-full mt-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span>
            Plotted points ({userPoints.length}):{' '}
            <span className="font-mono text-slate-200">
              {userPoints.length > 0
                ? userPoints.map(([x, y]) => `(${x}, ${y})`).join('  ')
                : 'Click on grid to place point'}
            </span>
          </span>
        </div>
        {graphData?.equation && (
          <div className="font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
            {graphData.equation}
          </div>
        )}
      </div>
    </div>
  );
};
