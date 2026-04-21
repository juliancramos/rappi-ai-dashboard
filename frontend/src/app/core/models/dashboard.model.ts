export interface GlobalAvailabilityDTO {
  availabilityRate: number;
  totalEvents: number;
  offlineEvents: number;
}

export interface OfflineEventDataPointDTO {
  timestamp: string;
  offlineCount: number;
}

export interface StoreOfflineRankingDTO {
  storeName: string;
  offlineCount: number;
}
