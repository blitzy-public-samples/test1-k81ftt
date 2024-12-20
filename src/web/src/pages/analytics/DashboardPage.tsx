/**
 * @fileoverview Analytics Dashboard Page Component
 * Implements comprehensive analytics visualization with real-time updates,
 * performance monitoring, and interactive data exploration.
 * @version 1.0.0
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, CircularProgress, Alert, Skeleton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import DashboardLayout from '../../layouts/DashboardLayout';
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard';
import {
  selectAnalyticsTimeRange,
  selectAnalyticsLoading,
  selectAnalyticsError,
  selectAnalyticsMetrics
} from '../../store/selectors/analytics.selectors';
import { usePerformanceMonitor } from '@monitoring/performance';

// Styled components with Material Design 3 principles
const DashboardContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  width: '100%',
  maxWidth: 1440,
  margin: '0 auto',
  minHeight: `calc(100vh - 64px)`,
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    gap: theme.spacing(2)
  }
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: 400,
  gap: theme.spacing(2)
}));

// Props interface
interface DashboardPageProps {
  projectId?: string;
  initialTimeRange?: AnalyticsTimeRange;
}

/**
 * Analytics Dashboard Page component with real-time updates and performance monitoring
 */
const DashboardPage: React.FC<DashboardPageProps> = ({
  projectId,
  initialTimeRange
}) => {
  const dispatch = useDispatch();
  const { trackPageLoad, trackMetricUpdate } = usePerformanceMonitor();

  // Redux selectors
  const timeRange = useSelector(selectAnalyticsTimeRange);
  const loading = useSelector(selectAnalyticsLoading);
  const error = useSelector(selectAnalyticsError);
  const metrics = useSelector(selectAnalyticsMetrics);

  // Track page load performance
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      trackPageLoad('analytics-dashboard', performance.now() - startTime);
    };
  }, [trackPageLoad]);

  // Handle analytics data export
  const handleExport = useCallback(async (data) => {
    try {
      const startTime = performance.now();
      await dispatch({ 
        type: 'analytics/exportData',
        payload: { data, format: 'CSV' }
      });
      trackMetricUpdate('analytics-export', performance.now() - startTime);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [dispatch, trackMetricUpdate]);

  // Memoize time range to prevent unnecessary updates
  const currentTimeRange = useMemo(() => ({
    startDate: initialTimeRange?.startDate || timeRange.startDate,
    endDate: initialTimeRange?.endDate || timeRange.endDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }), [initialTimeRange, timeRange]);

  // Render loading state
  if (loading && !metrics) {
    return (
      <DashboardLayout>
        <LoadingContainer>
          <CircularProgress size={40} />
          <Skeleton variant="rectangular" width="100%" height={400} />
        </LoadingContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Analytics Dashboard | Task Management System</title>
        <meta 
          name="description" 
          content="Comprehensive analytics dashboard showing task management metrics and performance indicators"
        />
      </Helmet>

      <DashboardContainer>
        {error && (
          <Alert 
            severity="error" 
            sx={{ gridColumn: '1 / -1' }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <CircularProgress size={20} />
                Retrying...
              </Box>
            }
          >
            {error}
          </Alert>
        )}

        <AnalyticsDashboard
          projectId={projectId}
          timeRange={currentTimeRange}
          onExport={handleExport}
        />
      </DashboardContainer>
    </DashboardLayout>
  );
};

export default React.memo(DashboardPage);