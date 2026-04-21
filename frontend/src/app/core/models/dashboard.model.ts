export interface DashboardStatsDTO {
  uptimePercentage: number;
  peakVisibility: number;
  totalCriticalOutages: number;
}

export interface HealthDataPointDTO {
  hourBucket: string;
  avgVisibility: number;
  sampleCount: number;
}

export interface CriticalIncidentDTO {
  id: number;
  plotName: string;
  metric: string;
  timestamp: string;
  statusValue: number;
}

export interface HourlyPatternDTO {
  hourOfDay: string;
  averageVisibility: number;
}

export interface HeatmapDataPointDTO {
  date: string;
  hour: string;
  averageVisibility: number;
}
