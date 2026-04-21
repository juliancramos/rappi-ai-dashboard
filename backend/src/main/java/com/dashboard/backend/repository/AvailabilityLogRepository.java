package com.dashboard.backend.repository;

import com.dashboard.backend.model.AvailabilityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AvailabilityLogRepository extends JpaRepository<AvailabilityLog, Long> {

    long countByStatusValue(Long statusValue);

    @Query(value = "SELECT SUBSTR(timestamp, 1, 10) as day, COUNT(id) FROM availability_logs WHERE status_value = 0 AND timestamp IS NOT NULL GROUP BY day ORDER BY day ASC", nativeQuery = true)
    List<Object[]> countOfflineEventsGroupedByDay();

    @Query("SELECT a.plotName, COUNT(a) as offline_count FROM AvailabilityLog a WHERE a.statusValue = 0 GROUP BY a.plotName ORDER BY offline_count DESC")
    List<Object[]> findTopStoresByOfflineEvents(Pageable pageable);
}
