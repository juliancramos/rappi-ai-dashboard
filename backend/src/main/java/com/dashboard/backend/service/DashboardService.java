package com.dashboard.backend.service;

import com.dashboard.backend.dto.CriticalIncidentDTO;
import com.dashboard.backend.dto.DashboardStatsDTO;
import com.dashboard.backend.dto.GlobalAvailabilityDTO;
import com.dashboard.backend.dto.HealthDataPointDTO;
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

        log.info("getGlobalAvailability: total={}, online={}, offline={}, rate={:.4f}%",
                totalEvents, onlineEvents, offlineEvents, availabilityRate);
        return new GlobalAvailabilityDTO(availabilityRate, totalEvents, offlineEvents);
    }

    public List<OfflineEventDataPointDTO> getOfflineEventsSeries() {
        List<Object[]> results = repository.countOfflineEventsGroupedByDay();
    
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

        List<OfflineEventDataPointDTO> series = results.stream().map(row -> {
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

        log.info("getOfflineEventsSeries: {} daily buckets returned.", series.size());
        return series;
    }

    public List<StoreOfflineRankingDTO> getTopStoresByOfflineEvents() {
        List<Object[]> results = repository.findTopStoresByOfflineEvents(PageRequest.of(0, 5));
        log.info("getTopStoresByOfflineEvents: {} store entries returned.", results.size());
        return results.stream().map(row -> {
            String storeName = (String) row[0];
            Number count = (Number) row[1];
            return new StoreOfflineRankingDTO(storeName, count.longValue());
        }).collect(Collectors.toList());
    }

   
    public DashboardStatsDTO getSystemHealthStats() {
        long total = repository.count();
        long offline = repository.countByStatusValue(0L);
        long online = total - offline;

        double uptimePercentage = total > 0 ? ((double) online / total) * 100.0 : 0.0;

        Long maxVal = repository.findMaxStatusValue();
        long peakVisibility = (maxVal != null) ? maxVal : 0L;

        log.info("getSystemHealthStats: total={}, online={}, offline={}, peak={}, uptime={:.4f}%",
                total, online, offline, peakVisibility, uptimePercentage);

        return new DashboardStatsDTO(uptimePercentage, peakVisibility, offline);
    }

    public List<HealthDataPointDTO> getFullHealthSeries() {
        List<Object[]> rows = repository.findHealthSeriesGroupedByHour();

        List<HealthDataPointDTO> series = rows.stream().map(row -> {
            String hourBucket    = (String)  row[0];
            Number avgVisibility = (Number)  row[1];
            Number sampleCount   = (Number)  row[2];

            if (hourBucket == null || avgVisibility == null || sampleCount == null) {
                log.warn("Unexpected null in health-series row — skipping.");
                return null;
            }
            return new HealthDataPointDTO(
                    hourBucket,
                    avgVisibility.doubleValue(),
                    sampleCount.longValue()
            );
        })
        .filter(Objects::nonNull)
        .collect(Collectors.toList());

        long totalRawSamples = series.stream().mapToLong(HealthDataPointDTO::sampleCount).sum();
        log.info("getFullHealthSeries: {} hourly buckets returned, representing {} raw readings.",
                series.size(), totalRawSamples);

        return series;
    }

   
    public List<CriticalIncidentDTO> getCriticalIncidentLog() {
        List<Object[]> rows = repository.findCriticalIncidents();

        List<CriticalIncidentDTO> incidents = rows.stream().map(row -> {
            Number idNum  = (Number) row[0];
            String plot   = (String) row[1];
            String metric = (String) row[2];
            String ts     = (String) row[3];
            Number sv     = (Number) row[4];

            if (idNum == null || ts == null) {
                log.warn("Malformed incident row (null id or timestamp) — skipping.");
                return null;
            }
            return new CriticalIncidentDTO(
                    idNum.longValue(),
                    plot,
                    metric,
                    ts,
                    sv != null ? sv.longValue() : 0L
            );
        })
        .filter(Objects::nonNull)
        .collect(Collectors.toList());

        log.info("getCriticalIncidentLog: {} critical incidents (status_value=0) returned.", incidents.size());
        return incidents;
    }
}
