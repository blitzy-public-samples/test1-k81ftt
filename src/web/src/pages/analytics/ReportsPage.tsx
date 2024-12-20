import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { 
  Grid, 
  Paper, 
  Typography, 
  Select, 
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert
} from '@mui/material';
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard';
import { analyticsService } from '../../services/analytics.service';
import Button from '../../components/common/Button';
import { AnalyticsTimeRange } from '../../types/analytics.types';
import { ErrorResponse } from '../../types/common.types';
import useTheme from '../../hooks/useTheme';

// Styled components with Material Design 3 compliance
const ReportsContainer = styled.div`
  padding: ${({ theme }) => theme.spacing(4)};
  background-color: ${({ theme }) => theme.palette.background.default};
  min-height: 100vh;
  transition: background-color 0.3s ease;
`;

const FiltersSection = styled(Paper)`
  padding: ${({ theme }) => theme.spacing(3)};
  margin-bottom: ${({ theme }) => theme.spacing(4)};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-top: ${({ theme }) => theme.spacing(3)};
  flex-wrap: wrap;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

// Interface for report filters
interface ReportFilters {
  timeRange: AnalyticsTimeRange;
  projectId: string | null;
  reportType: 'summary' | 'detailed' | 'custom';
  metrics: string[];
  format: 'pdf' | 'excel' | 'csv';
  includeComparisons: boolean;
  groupBy: 'day' | 'week' | 'month';
}

// Default filter values
const defaultFilters: ReportFilters = {
  timeRange: {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  },
  projectId: null,
  reportType: 'summary',
  metrics: ['productivityScore', 'delayReduction', 'visibilityScore'],
  format: 'pdf',
  includeComparisons: true,
  groupBy: 'week'
};

const ReportsPage: React.FC = () => {
  const theme = useTheme();
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Validate report filters
  const validateFilters = useCallback((filters: ReportFilters): boolean => {
    try {
      return analyticsService.validateReportFilters(filters);
    } catch (err) {
      setError(err as ErrorResponse);
      return false;
    }
  }, []);

  // Handle report generation
  const handleGenerateReport = useCallback(async () => {
    if (!validateFilters(filters)) return;

    setLoading(true);
    setError(null);
    setGenerationProgress(0);

    try {
      // Start report generation
      const response = await analyticsService.generateReport({
        timeRange: filters.timeRange,
        projectId: filters.projectId,
        metrics: filters.metrics,
        reportType: filters.reportType,
        format: filters.format,
        includeComparisons: filters.includeComparisons,
        groupBy: filters.groupBy
      });

      // Poll for progress
      const progressInterval = setInterval(async () => {
        const progress = await analyticsService.getReportProgress();
        setGenerationProgress(progress);

        if (progress === 100) {
          clearInterval(progressInterval);
          setLoading(false);
          
          // Trigger download based on format
          const blob = new Blob([response], { 
            type: filters.format === 'pdf' ? 'application/pdf' : 
                  filters.format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                  'text/csv' 
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `analytics-report-${new Date().toISOString()}.${filters.format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      }, 1000);

    } catch (err) {
      setError(err as ErrorResponse);
      setLoading(false);
    }
  }, [filters, validateFilters]);

  // Handle metrics update from dashboard
  const handleMetricUpdate = useCallback((metrics: string[]) => {
    setFilters(prev => ({ ...prev, metrics }));
  }, []);

  return (
    <ReportsContainer>
      <Typography variant="h4" gutterBottom>
        Analytics Reports
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ marginBottom: 2 }}
        >
          {error.message}
        </Alert>
      )}

      <FiltersSection elevation={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={filters.reportType}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  reportType: e.target.value as ReportFilters['reportType']
                }))}
                disabled={loading}
              >
                <MenuItem value="summary">Summary Report</MenuItem>
                <MenuItem value="detailed">Detailed Report</MenuItem>
                <MenuItem value="custom">Custom Report</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={filters.format}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  format: e.target.value as ReportFilters['format']
                }))}
                disabled={loading}
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Group By</InputLabel>
              <Select
                value={filters.groupBy}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  groupBy: e.target.value as ReportFilters['groupBy']
                }))}
                disabled={loading}
              >
                <MenuItem value="day">Daily</MenuItem>
                <MenuItem value="week">Weekly</MenuItem>
                <MenuItem value="month">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <ActionsContainer>
          <Button
            variant="primary"
            onClick={handleGenerateReport}
            loading={loading}
            loadingText="Generating Report..."
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
            disabled={loading}
          >
            Generate Report
          </Button>

          <Button
            variant="outlined"
            onClick={() => setFilters(defaultFilters)}
            disabled={loading}
          >
            Reset Filters
          </Button>
        </ActionsContainer>

        {loading && (
          <Typography variant="body2" sx={{ marginTop: 2, color: 'text.secondary' }}>
            Generating report... {generationProgress}%
          </Typography>
        )}
      </FiltersSection>

      <AnalyticsDashboard
        timeRange={filters.timeRange}
        projectId={filters.projectId || undefined}
        metrics={filters.metrics}
        onMetricUpdate={handleMetricUpdate}
      />
    </ReportsContainer>
  );
};

export default ReportsPage;