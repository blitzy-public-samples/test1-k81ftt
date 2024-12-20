import React, { useRef, useEffect, useMemo } from 'react';
import { Chart, ChartConfiguration, ChartOptions } from 'chart.js/auto';
import styled from '@emotion/styled';
import {
  AnalyticsMetrics,
  ChartDataset,
  AnalyticsTimeRange,
} from '../../types/analytics.types';

// Styled components for chart container and loading state
const ChartContainer = styled.div`
  width: 100%;
  height: 400px;
  background-color: var(--color-background-paper);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-sm);
  position: relative;
  transition: all 0.3s ease;
`;

const LoadingContainer = styled.div`
  width: 100%;
  height: 400px;
  background-color: var(--color-background-paper);
  border-radius: var(--border-radius-large);
  animation: pulse 1.5s ease-in-out infinite;
  opacity: 0.7;

  @keyframes pulse {
    0% { opacity: 0.7; }
    50% { opacity: 0.4; }
    100% { opacity: 0.7; }
  }
`;

// Interface for component props
interface PerformanceChartProps {
  data: AnalyticsMetrics[];
  timeRange: AnalyticsTimeRange;
  loading?: boolean;
  className?: string;
}

// Chart configuration constants
const CHART_COLORS = {
  primary: 'rgba(63, 131, 248, 1)',
  secondary: 'rgba(130, 71, 229, 1)',
  tertiary: 'rgba(236, 72, 153, 1)',
  success: 'rgba(34, 197, 94, 1)',
  warning: 'rgba(234, 179, 8, 1)',
  background: 'rgba(63, 131, 248, 0.1)',
};

const CHART_OPTIONS: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index',
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
};

// Process analytics data into chart datasets
const processChartData = (data: AnalyticsMetrics[]): ChartDataset[] => {
  const timestamps = data.map((_, index) => index);
  
  // Calculate moving averages for trend analysis
  const calculateMovingAverage = (values: number[], window: number = 3): number[] => {
    return values.map((_, index, array) => {
      const start = Math.max(0, index - window + 1);
      const slice = array.slice(start, index + 1);
      return slice.reduce((sum, val) => sum + val, 0) / slice.length;
    });
  };

  // Productivity trend dataset
  const productivityData = data.map(item => item.productivityScore);
  const productivityTrend = calculateMovingAverage(productivityData);

  // Delay reduction dataset
  const delayData = data.map(item => item.delayReduction);
  const delayTrend = calculateMovingAverage(delayData);

  // Task visibility dataset
  const visibilityData = data.map(item => item.visibilityScore);
  const visibilityTrend = calculateMovingAverage(visibilityData);

  return [
    {
      label: 'Productivity Score',
      data: productivityData,
      backgroundColor: CHART_COLORS.background,
      borderColor: CHART_COLORS.primary,
      fill: true,
      tension: 0.4,
    },
    {
      label: 'Delay Reduction',
      data: delayData,
      backgroundColor: 'transparent',
      borderColor: CHART_COLORS.secondary,
      borderDash: [5, 5],
      tension: 0.4,
    },
    {
      label: 'Task Visibility',
      data: visibilityData,
      backgroundColor: 'transparent',
      borderColor: CHART_COLORS.tertiary,
      tension: 0.4,
    },
    // Trend lines
    {
      label: 'Productivity Trend',
      data: productivityTrend,
      backgroundColor: 'transparent',
      borderColor: CHART_COLORS.success,
      borderWidth: 1,
      pointRadius: 0,
      tension: 0.4,
    },
  ];
};

// Memoized Performance Chart component
const PerformanceChart: React.FC<PerformanceChartProps> = React.memo(({
  data,
  timeRange,
  loading = false,
  className,
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Process chart data with memoization
  const chartDatasets = useMemo(() => processChartData(data), [data]);

  // Initialize and update chart
  useEffect(() => {
    if (loading || !chartRef.current) return;

    // Cleanup previous chart instance
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart instance
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(item => new Date(timeRange.startDate.getTime() + 
          (timeRange.endDate.getTime() - timeRange.startDate.getTime()) * 
          (data.indexOf(item) / (data.length - 1))
        ).toLocaleDateString()),
        datasets: chartDatasets,
      },
      options: CHART_OPTIONS,
    };

    chartInstance.current = new Chart(ctx, config);

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, timeRange, chartDatasets, loading]);

  // Handle responsive behavior
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    });

    if (chartRef.current) {
      resizeObserver.observe(chartRef.current.parentElement as Element);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (loading) {
    return <LoadingContainer className={className} />;
  }

  return (
    <ChartContainer className={className}>
      <canvas ref={chartRef} />
    </ChartContainer>
  );
});

// Display name for debugging
PerformanceChart.displayName = 'PerformanceChart';

export default PerformanceChart;