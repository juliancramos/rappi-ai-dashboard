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
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AvailabilityLogRepository repository;

    public GlobalAvailabilityDTO getGlobalAvailability() {
        long totalEvents  = repository.count();
        long offlineEvents = repository.countByStatusValue(0L);
        long onlineEvents  = totalEvents - offlineEvents;

        double availabilityRate = totalEvents > 0
                ? (double) onlineEvents / totalEvents * 100.0
                : 0.0;

        return new GlobalAvailabilityDTO(availabilityRate, totalEvents, offlineEvents);
    }

    public List<OfflineEventDataPointDTO> getOfflineEventsSeries() {
        List<Object[]> results = repository.countOfflineEventsGroupedByDay();
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

        return results.stream().map(row -> {
            String dayStr = (String) row[0];
            if (dayStr == null || dayStr.isBlank()) {
                log.warn("Null or empty date string in offline-series result — skipping row.");
                return null;
            }

            // status_value = 0 rows are always counted; null safety on the count column.
            Number count = (Number) row[1];
            if (count == null) {
                log.warn("Null count for date '{}' — skipping row.", dayStr);
                return null;
            }

            try {
                LocalDate date = LocalDate.parse(dayStr.trim(), formatter);
                return new OfflineEventDataPointDTO(date.atStartOfDay(), count.longValue());
            } catch (Exception e) {
                log.warn("Failed to parse date string '{}': {} — skipping row.", dayStr, e.getMessage());
                return null;
            }
        })
        .filter(Objects::nonNull)
        // DB already orders by day ASC; .sorted() is a defensive safety net.
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
