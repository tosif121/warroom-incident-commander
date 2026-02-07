'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface DataHoloDeckProps {
  type: 'line' | 'bar' | 'pie' | 'area' | 'table';
  data: any[];
  config: {
    xAxisKey: string;
    dataKeys: string[];
    colors?: string[];
  };
}

const CYBER_COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DataHoloDeck({ type, data, config }: DataHoloDeckProps) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-full text-gray-500 font-mono text-sm">
        NO DATA SIGNAL RECEIVED
      </div>
    );

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/20 p-3 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider">{label}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm font-mono">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-white">{entry.name}:</span>
              <span className="text-cyan-400">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const commonProps = {
    data,
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
  };

  return (
    <div className="w-full h-full min-h-[300px] animate-in fade-in duration-700">
      <ResponsiveContainer width="100%" height="100%">
        {(() => {
          switch (type) {
            case 'line':
              return (
                <LineChart {...commonProps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey={config.xAxisKey}
                    stroke="#525252"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip content={renderTooltip} cursor={{ stroke: '#ffffff20' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {config.dataKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={config.colors?.[i] || CYBER_COLORS[i % CYBER_COLORS.length]}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              );

            case 'area':
              return (
                <AreaChart {...commonProps}>
                  <defs>
                    {config.dataKeys.map((key, i) => (
                      <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={config.colors?.[i] || CYBER_COLORS[i % CYBER_COLORS.length]}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={config.colors?.[i] || CYBER_COLORS[i % CYBER_COLORS.length]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey={config.xAxisKey}
                    stroke="#525252"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip content={renderTooltip} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {config.dataKeys.map((key, i) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={config.colors?.[i] || CYBER_COLORS[i % CYBER_COLORS.length]}
                      fillOpacity={1}
                      fill={`url(#color${key})`}
                    />
                  ))}
                </AreaChart>
              );

            case 'bar':
              return (
                <BarChart {...commonProps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey={config.xAxisKey}
                    stroke="#525252"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip cursor={{ fill: '#ffffff05' }} content={renderTooltip} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {config.dataKeys.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={config.colors?.[i] || CYBER_COLORS[i % CYBER_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              );

            case 'pie':
              return (
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey={config.dataKeys[0]}
                    nameKey={config.xAxisKey}
                    stroke="none"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CYBER_COLORS[index % CYBER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={renderTooltip} />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              );

            default:
              return (
                <div className="w-full h-full overflow-auto bg-white/5 rounded-xl border border-white/10 p-1">
                  <table className="w-full text-left text-sm font-mono">
                    <thead className="bg-white/5 text-gray-400">
                      <tr>
                        {Object.keys(data[0] || {}).map((k) => (
                          <th key={k} className="p-3 font-normal">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-gray-300">
                      {data.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="p-3">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
          }
        })()}
      </ResponsiveContainer>
    </div>
  );
}
