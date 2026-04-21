package com.dashboard.backend.service;

import com.dashboard.backend.dto.GlobalAvailabilityDTO;
import com.dashboard.backend.dto.OfflineEventDataPointDTO;
import com.dashboard.backend.dto.StoreOfflineRankingDTO;
import com.dashboard.backend.repository.AvailabilityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
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
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEE MMM dd yyyy", Locale.ENGLISH);

        return results.stream().map(row -> {
            String dayStr = (String) row[0];
            if (dayStr == null || dayStr.trim().isEmpty()) {
                log.warn("Null or empty date found. Skipping.");
                return null;
            }
            
            Number count = (Number) row[1];
            try {
                return new OfflineEventDataPointDTO(
                        LocalDate.parse(dayStr.trim(), formatter).atStartOfDay(),
                        count.longValue()
                );
            } catch (Exception e) {
                log.warn("Failed to parse date string: '{}'. Skipping record.", dayStr);
                return null;
            }
        })
        .filter(Objects::nonNull)
        .sorted(Comparator.comparing(OfflineEventDataPointDTO::timestamp))
        .collect(Collectors.toList());
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
