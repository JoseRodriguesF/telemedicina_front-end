"use client";

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

type Props = {
    data: Array<{ name: string; consultas: number }>;
};

export default function FrequencyChart({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-tertiary)',
                fontSize: '0.9rem'
            }}>
                Aguardando atendimentos...
            </div>
        );
    }

    return (
        <div className="frequency-chart-wrapper" style={{ width: '100%', height: '100%', minHeight: '200px', outline: 'none' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 20,
                        left: -20,
                        bottom: 20,
                    }}
                    style={{ outline: 'none' }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #e5e7eb)" opacity={0.3} />
                    <XAxis
                        dataKey="name"
                        hide={true}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-secondary, #6b7280)', fontSize: 10 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--bg-primary, #ffffff)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color, #e5e7eb)',
                            boxShadow: 'var(--shadow-lg)',
                            padding: '8px 12px',
                            outline: 'none'
                        }}
                        itemStyle={{ color: 'var(--text-primary, #111827)', fontWeight: 600, outline: 'none' }}
                        labelStyle={{ color: 'var(--text-secondary, #6b7280)', marginBottom: '4px', outline: 'none' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="consultas"
                        stroke="var(--color-primary-500, #0ea5e9)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "var(--color-primary-500)", strokeWidth: 2, stroke: "var(--chart-dot-stroke)" }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        animationDuration={1500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
