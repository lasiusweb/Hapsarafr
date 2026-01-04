// components/ui/InteractivePieChart.tsx
import React from 'react';

interface InteractivePieChartProps {
    title: string;
    data: { label: string, value: number, color: string }[];
    onSliceClick: (label: string) => void;
}

const InteractivePieChart: React.FC<InteractivePieChartProps> = ({ title, data, onSliceClick }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-gray-500 text-center py-8">No data to display.</p>
                </div>
            </div>
        );
    }

    let cumulativePercent = 0;
    const segments = data.map(item => {
        const percent = (item.value / total) * 100;
        const start = cumulativePercent;
        cumulativePercent += percent;
        return { ...item, percent, start };
    });

    const conicGradient = segments.map(s => `${s.color} ${s.start}% ${s.start + s.percent}%`).join(', ');

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div
                    className="w-32 h-32 rounded-full flex-shrink-0"
                    style={{ background: `conic-gradient(${conicGradient})` }}
                    role="img"
                    aria-label={`Pie chart for ${title}`}
                ></div>
                <div className="flex-1 space-y-2 w-full">
                    {segments.filter(s => s.value > 0).map(s => (
                        <button key={s.label} onClick={() => onSliceClick(s.label)} className="w-full flex items-center justify-between text-sm p-1 rounded-md hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></span>
                                <span className="text-gray-600">{s.label}</span>
                            </div>
                            <span className="font-semibold text-gray-800">{s.value} <span className="text-gray-500 font-normal">({s.percent.toFixed(1)}%)</span></span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InteractivePieChart;
