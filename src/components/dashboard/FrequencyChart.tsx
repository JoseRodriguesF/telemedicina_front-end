"use client";

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const data = [
    { name: 'Seg', consultas: 4 },
    { name: 'Ter', consultas: 7 },
    { name: 'Qua', consultas: 5 },
    { name: 'Qui', consultas: 8 },
    { name: 'Sex', consultas: 6 },
    { name: 'Sáb', consultas: 3 },
    { name: 'Dom', consultas: 2 },
];

export default function FrequencyChart() {
    return (
        <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 0,
                        left: -20,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={1} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #e5e7eb)" opacity={0.3} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-secondary, #6b7280)', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-secondary, #6b7280)', fontSize: 12 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--bg-tertiary, #f3f4f6)', opacity: 0.5 }}
                        contentStyle={{
                            backgroundColor: 'var(--bg-primary, #ffffff)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color, #e5e7eb)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            padding: '8px 12px',
                        }}
                        itemStyle={{ color: 'var(--text-primary, #111827)', fontWeight: 600 }}
                        labelStyle={{ color: 'var(--text-secondary, #6b7280)', marginBottom: '4px' }}
                    />
                    <Bar
                        dataKey="consultas"
                        fill="url(#colorConsultas)"
                        radius={[6, 6, 6, 6]}
                        barSize={32}
                        animationDuration={1500}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
