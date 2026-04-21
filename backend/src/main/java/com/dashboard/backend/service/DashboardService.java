package com.dashboard.backend.service;

import com.dashboard.backend.dto.GlobalAvailabilityDTO;
import com.dashboard.backend.dto.OfflineEventDataPointDTO;
import com.dashboard.backend.dto.StoreOfflineRankingDTO;
import com.dashboard.backend.repository.AvailabilityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AvailabilityLogRepository repository;

    public GlobalAvailabilityDTO getGlobalAvailability() {
        long totalEvents = repository.count();
        long onlineEvents = repository.countByStatusValue(1L);
        long offlineEvents = totalEvents - onlineEvents;

        double availabilityRate = totalEvents > 0 ? (double) onlineEvents / totalEvents * 100.0 : 0.0;
        
        return new GlobalAvailabilityDTO(availabilityRate, totalEvents, offlineEvents);
    }

    public List<OfflineEventDataPointDTO> getOfflineEventsSeries() {
        List<Object[]> results = repository.countOfflineEventsGroupedByDay();
        return results.stream().map(row -> {
            String dayStr = (String) row[0];
            Number count = (Number) row[1];
            return new OfflineEventDataPointDTO(
                    LocalDate.parse(dayStr, DateTimeFormatter.ISO_LOCAL_DATE).atStartOfDay(),
                    count.longValue()
            );
        }).collect(Collectors.toList());
    }

    public List<StoreOfflineRankingDTO> getTopStoresByOfflineEvents() {
        List<Object[]> results = repository.findTopStoresByOfflineEvents(PageRequest.of(0, 5));
        return results.stream().map(row -> {
            String storeName = (String) row[0];
            Number count = (Number) row[1];
            return new StoreOfflineRankingDTO(storeName, count.longValue());
        }).collect(Collectors.toList());
    }
}
