import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GlobalAvailabilityDTO, OfflineEventDataPointDTO, StoreOfflineRankingDTO } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getGlobalAvailability(): Observable<GlobalAvailabilityDTO> {
    return this.http.get<GlobalAvailabilityDTO>(`${this.apiUrl}/global-availability`);
  }

  getOfflineEventsSeries(): Observable<OfflineEventDataPointDTO[]> {
    return this.http.get<OfflineEventDataPointDTO[]>(`${this.apiUrl}/offline-series`);
  }

  getTopOfflineStores(): Observable<StoreOfflineRankingDTO[]> {
    return this.http.get<StoreOfflineRankingDTO[]>(`${this.apiUrl}/top-offline-stores`);
  }
}

