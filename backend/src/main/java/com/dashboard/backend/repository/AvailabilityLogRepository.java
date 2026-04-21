package com.dashboard.backend.repository;

import com.dashboard.backend.model.AvailabilityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AvailabilityLogRepository extends JpaRepository<AvailabilityLog, Long> {
}
