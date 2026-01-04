// components/ui/InteractiveBarChart.tsx
import React from 'react';

const CHART_COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#fb923c'];

interface InteractiveBarChartProps {
    title: string;
    data: { code: string; label: string; value: number }[];
    onBarClick: (code: string) => void;
}

const InteractiveBarChart: React.FC<InteractiveBarChartProps> = ({ title, data, onBarClick }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid division by zero

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
            <div className="space-y-4">
                {data.length > 0 ? data.map((item, index) => (
                    <div key={item.label} onClick={() => onBarClick(item.code)} className="cursor-pointer group">
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="font-medium text-gray-600 group-hover:text-green-600">{item.label}</span>
                            <span className="font-semibold text-gray-800">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="h-3 rounded-full transition-all duration-300 group-hover:opacity-80"
                                style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            ></div>
                        </div>
                    </div>
                )) : (
                    <p className="text-gray-500 text-center py-8">No data available to display.</p>
                )}
            </div>
        </div>
    );
};

export default InteractiveBarChart;
