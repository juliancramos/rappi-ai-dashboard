import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardStatsDTO, HealthDataPointDTO, CriticalIncidentDTO, HourlyPatternDTO, HeatmapDataPointDTO } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getSystemHealthStats(): Observable<DashboardStatsDTO> {
    return this.http.get<DashboardStatsDTO>(`${this.apiUrl}/stats`);
  }

  getFullHealthSeries(): Observable<HealthDataPointDTO[]> {
    return this.http.get<HealthDataPointDTO[]>(`${this.apiUrl}/health-series`);
  }

  getCriticalIncidentLog(): Observable<CriticalIncidentDTO[]> {
    return this.http.get<CriticalIncidentDTO[]>(`${this.apiUrl}/incidents`);
  }

  getHourlyPatterns(): Observable<HourlyPatternDTO[]> {
    return this.http.get<HourlyPatternDTO[]>(`${this.apiUrl}/analysis/patterns`);
  }

  getIntensityGrid(): Observable<HeatmapDataPointDTO[]> {
    return this.http.get<HeatmapDataPointDTO[]>(`${this.apiUrl}/analysis/intensity-grid`);
  }
}
