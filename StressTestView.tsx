import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import type { StressResult } from '../../types';

const GRID_SIZE = 20;

export function StressTestView() {
  const { plan, setStressResults, stressResults } = useAppStore();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Real analysis: beam bending over each wall span (self-weight + roof load)
  const runStressTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setShowResults(false);

    const results: StressResult[] = [];
    const totalWalls = plan.walls.length;
    const g = 9.81;
    const concreteDensity = 2400; // kg/m³

    for (let i = 0; i < totalWalls; i++) {
      // simulate per-element compute steps for the sweep animation
      await new Promise((resolve) => setTimeout(resolve, 160));

      const wall = plan.walls[i];
      const L = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) +
        Math.pow(wall.end.y - wall.start.y, 2)
      ) / GRID_SIZE; // span in meters
      if (L <= 0) continue;

      const h = wall.height || 2.8;
      const t = wall.thickness || 0.2;

      // Self weight + a realistic 5 kPa roof/floor load over a 3 m tributary
      const selfWeight = concreteDensity * L * h * t * g / 1000; // kN/m
      const roofLoad = 5 * 3; // kN/m
      const w = selfWeight + roofLoad; // kN/m total line load

      // Simple beam bending: M = wL²/8, σ = M·c/I, I = t·h³/12
      const M = (w * L * L) / 8; // kN·m
      const I = (t * Math.pow(h, 3)) / 12; // m⁴
      const sigma = (M * (h / 2)) / I; // kPa
      const stressMpa = sigma / 1000;
      const allowable = 1500; // kPa — masonry/concrete flexural capacity
      const stressLevel = Math.min(1, Math.max(0.02, stressMpa / allowable));

      // Midspan deflection: δ = 5wL⁴/(384EI), E ≈ 30 GPa
      const E = 30e6; // kPa
      const deflection = (5 * w * Math.pow(L, 4)) / (384 * E * I); // m

      let recommendation = '';
      if (stressLevel > 0.85) {
        recommendation = 'Critical: increase thickness or add a support column';
      } else if (stressLevel > 0.55) {
        recommendation = 'Moderate: consider a midspan stiffener';
      } else {
        recommendation = 'Safe: within flexural capacity';
      }

      results.push({
        elementId: wall.id,
        stressLevel,
        displacement: Math.max(0, deflection),
        recommendation,
      });

      setProgress(((i + 1) / totalWalls) * 100);
    }

    setStressResults(results);
    setIsRunning(false);
    setShowResults(true);
  };

  // Get color based on stress level
  const getStressColor = (level: number): string => {
    if (level < 0.3) return '#2ed573'; // Green - safe
    if (level < 0.6) return '#ffb800'; // Yellow - moderate
    return '#ff4757'; // Red - critical
  };

  // Calculate overall building score
  const overallScore = useMemo(() => {
    if (stressResults.length === 0) return 0;
    const avgStress = stressResults.reduce((sum, r) => sum + r.stressLevel, 0) / stressResults.length;
    return Math.round((1 - avgStress) * 100);
  }, [stressResults]);

  return (
    <motion.div
      className="flex-1 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="glass-strong p-4 border-b border-glass-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Structural Analysis</h2>
            <p className="text-xs text-gray-400 mt-1">
              {plan.walls.length} elements to analyze
            </p>
          </div>
          <motion.button
            onClick={runStressTest}
            disabled={isRunning || plan.walls.length === 0}
            className={`
              px-6 py-2.5 rounded-xl font-medium text-sm transition-all
              ${isRunning || plan.walls.length === 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-cyan/20 border border-cyan/40 text-cyan hover:bg-cyan/30 glow-cyan'
              }
            `}
            whileHover={!isRunning && plan.walls.length > 0 ? { scale: 1.05 } : {}}
            whileTap={!isRunning && plan.walls.length > 0 ? { scale: 0.95 } : {}}
          >
            {isRunning ? 'Running...' : 'Run Analysis'}
          </motion.button>
        </div>

        {/* Progress bar */}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4"
          >
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Analyzing structural integrity...</span>
              <span className="text-cyan">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-blueprint rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan to-cyan-dim"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Results area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!showResults && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <motion.div
              className="w-24 h-24 rounded-full bg-cyan/10 flex items-center justify-center mb-6"
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(0, 212, 255, 0.2)',
                  '0 0 0 20px rgba(0, 212, 255, 0)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg className="w-12 h-12 text-cyan/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </motion.div>
            <h3 className="text-lg font-medium text-white mb-2">Ready for Analysis</h3>
            <p className="text-sm text-gray-400 max-w-md">
              Click "Run Analysis" to simulate structural loads and visualize stress distribution across your building elements.
            </p>
          </div>
        )}

        {showResults && (
          <div className="space-y-6">
            {/* Overall Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 text-center"
            >
              <h3 className="text-sm font-medium text-gray-400 mb-4">Structural Integrity Score</h3>
              <div className="relative inline-block">
                <svg className="w-32 h-32" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#1a2436"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={overallScore > 70 ? '#2ed573' : overallScore > 40 ? '#ffb800' : '#ff4757'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${overallScore * 2.83} 283`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{overallScore}</span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-300">
                {overallScore > 70
                  ? '✓ Structure meets safety requirements'
                  : overallScore > 40
                  ? '⚠ Some areas need attention'
                  : '✕ Critical structural issues detected'}
              </p>
            </motion.div>

            {/* Element Results */}
            <div className="grid gap-4">
              {stressResults.map((result, index) => (
                <motion.div
                  key={result.elementId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getStressColor(result.stressLevel) }}
                      />
                      <span className="text-sm font-medium text-white">
                        Element #{index + 1}
                      </span>
                    </div>
                    <span
                      className="text-xs font-mono px-2 py-1 rounded"
                      style={{
                        backgroundColor: getStressColor(result.stressLevel) + '33',
                        color: getStressColor(result.stressLevel),
                      }}
                    >
                      {Math.round(result.stressLevel * 100)}% stress
                    </span>
                  </div>

                  {/* Stress bar */}
                  <div className="h-2 bg-blueprint rounded-full overflow-hidden mb-3">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: getStressColor(result.stressLevel) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${result.stressLevel * 100}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Displacement: {result.displacement.toFixed(4)}m</span>
                    <span className="text-cyan">{result.recommendation}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
