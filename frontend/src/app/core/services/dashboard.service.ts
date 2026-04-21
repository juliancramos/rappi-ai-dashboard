import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OfflineEventDataPointDTO {
  timestamp: string; // ISO date string from Java backend
  count: number;
}

export interface StoreOfflineRankingDTO {
  storeName: string;
  offlineCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getOfflineEventsSeries(): Observable<OfflineEventDataPointDTO[]> {
    return this.http.get<OfflineEventDataPointDTO[]>(`${this.apiUrl}/offline-series`);
  }

  getTopOfflineStores(): Observable<StoreOfflineRankingDTO[]> {
    return this.http.get<StoreOfflineRankingDTO[]>(`${this.apiUrl}/top-offline-stores`);
  }
}
