'use client';

import { motion } from 'framer-motion';
import { Share2, Download, AlertTriangle, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { SecurityBomb } from './SecurityBomb';
import { SpaghettiMeter } from './SpaghettiMeter';
import { PerformanceTurtle } from './PerformanceTurtle';
import { GenericRoast } from './GenericRoast';

interface RoastReportProps {
  score: {
    overall: number;
    grade: string;
    security: number;
    performance: number;
    maintainability: number;
    gradeColor: string;
  };
  issues: any[];
  onReset: () => void;
}

export function RoastReport({ score, issues, onReset }: RoastReportProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const renderWidget = (issue: any, index: number) => {
    const props = {
      title: issue.title,
      roast: issue.roast,
      explanation: issue.explanation,
      severity: issue.severity,
      config: issue.widget_config,
    };
    const key = index;
    switch (issue.widget_type) {
      case 'SecurityBomb':
        return <SecurityBomb key={key} {...props} />;
      case 'SpaghettiMeter':
        return <SpaghettiMeter key={key} {...props} />;
      case 'PerformanceTurtle':
        return <PerformanceTurtle key={key} {...props} />;
      default:
        return <GenericRoast key={key} {...props} />;
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* 1. Header Card */}
      <motion.div
        variants={item}
        className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Trophy className="w-64 h-64 text-foreground" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
          {/* Score Circle */}
          <div className="relative flex-shrink-0">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="transparent"
                className="text-muted/20 stroke-current"
                strokeWidth="12"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="88"
                fill="transparent"
                className={`${score.gradeColor} stroke-current`}
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - score.overall / 100)}
                initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - score.overall / 100) }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-6xl font-black ${score.gradeColor}`}>{score.overall}</span>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Overall Score</span>
            </div>
          </div>

          {/* Report Summary */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-4xl font-black tracking-tight mb-2">
                Grade: <span className={score.gradeColor}>{score.grade}</span>
              </h2>
              <p className="text-lg text-muted-foreground font-medium">
                {score.overall > 80
                  ? 'Your code is surprisingly good. Are you sure you wrote this?'
                  : score.overall > 50
                    ? "It works, but it's not pretty. Like a generic sedan."
                    : "I've seen ransomware with better code structure."}
              </p>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-4 pt-4">
              <button
                onClick={() => alert('Shared! (Mock)')}
                className="flex items-center gap-2 px-6 py-2 bg-foreground text-background rounded-full font-bold hover:scale-105 transition-transform"
              >
                <Share2 className="w-4 h-4" /> Share Roast
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-6 py-2 bg-muted/50 text-foreground rounded-full font-medium hover:bg-muted transition-colors"
              >
                Roast Another
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Metrics Grid */}
      <motion.div variants={item} className="grid md:grid-cols-3 gap-4">
        <MetricCard title="Security" score={score.security} icon={<AlertTriangle className="w-5 h-5" />} />
        <MetricCard title="Performance" score={score.performance} icon={<CheckCircle className="w-5 h-5" />} />
        <MetricCard title="Maintainability" score={score.maintainability} icon={<XCircle className="w-5 h-5" />} />
      </motion.div>

      {/* 3. Detailed Roasts */}
      <motion.div variants={item} className="space-y-6">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <span className="bg-red-500/10 text-red-500 p-2 rounded-lg">🔥</span>
          Critical Issues ({issues.length})
        </h3>

        <div className="grid gap-6">
          {issues.map((issue, index) => (
            <div key={index} className="transform transition-all hover:scale-[1.01]">
              {renderWidget(issue, index)}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetricCard({ title, score, icon }: { title: string; score: number; icon: React.ReactNode }) {
  const getColor = (s: number) => (s > 80 ? 'bg-green-500' : s > 50 ? 'bg-yellow-500' : 'bg-red-500');

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="font-bold flex items-center gap-2 text-muted-foreground">
          {icon} {title}
        </span>
        <span className="font-mono font-bold text-xl">{score}/100</span>
      </div>
      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className={`h-full ${getColor(score)}`}
        />
      </div>
    </div>
  );
}
