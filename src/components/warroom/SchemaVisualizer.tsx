'use client';

import { motion } from 'framer-motion';
import { Database, Check, AlertTriangle, ArrowRight, Table, Activity } from 'lucide-react';
import { useState } from 'react';

interface SchemaVisualizerProps {
  schema: any[];
  onConfirm: (selectedTables: string[]) => void;
}

export function SchemaVisualizer({ schema, onConfirm }: SchemaVisualizerProps) {
  // Auto-select tables with recommendations
  const [selected, setSelected] = useState<string[]>(
    schema.filter((t) => t.recommendations.length > 0).map((t) => t.name),
  );

  const toggleSelection = (name: string) => {
    if (selected.includes(name)) {
      setSelected(selected.filter((s) => s !== name));
    } else {
      setSelected([...selected, name]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-mono mb-4 border border-emerald-500/20">
          <Check className="w-3 h-3" /> Connection Successful
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Database Schema Discovered</h2>
        <p className="text-neutral-400">
          We found <span className="text-white font-bold">{schema.length} tables</span>. Select the ones you want Data
          Guard to monitor for incidents.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {schema.map((table, idx) => (
          <motion.div
            key={table.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => toggleSelection(table.name)}
            className={`relative p-5 rounded-xl border cursor-pointer transition-all group ${
              selected.includes(table.name)
                ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            {/* Selection Indicator */}
            <div
              className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                selected.includes(table.name) ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-600'
              }`}
            >
              {selected.includes(table.name) && <Check className="w-3 h-3 text-black" />}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-lg ${selected.includes(table.name) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}
              >
                <Table className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold">{table.name}</h3>
                <span className="text-[10px] text-neutral-500 font-mono">{table.columns?.length || 0} columns</span>
              </div>
            </div>

            {/* Recommendations */}
            {table.recommendations.length > 0 ? (
              <div className="space-y-2">
                {table.recommendations.map((rec: string) => (
                  <div
                    key={rec}
                    className="flex items-center gap-2 text-xs text-emerald-400/90 bg-emerald-500/5 px-2 py-1.5 rounded-md border border-emerald-500/10"
                  >
                    <Activity className="w-3 h-3" />
                    Monitor {rec}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-neutral-600 px-2 py-1.5 ">
                <span>No active metrics found</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
          className="bg-white text-black font-bold py-3 px-8 rounded-xl hover:bg-neutral-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Monitoring {selected.length} Tables <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
