package com.dashboard.backend.controller;

import com.dashboard.backend.dto.CriticalIncidentDTO;
import com.dashboard.backend.dto.DashboardStatsDTO;
import com.dashboard.backend.dto.GlobalAvailabilityDTO;
import com.dashboard.backend.dto.HealthDataPointDTO;
import com.dashboard.backend.dto.OfflineEventDataPointDTO;
import com.dashboard.backend.dto.StoreOfflineRankingDTO;
import com.dashboard.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DashboardService service;

    @GetMapping("/global-availability")
    public ResponseEntity<GlobalAvailabilityDTO> getGlobalAvailability() {
        log.info("GET /api/dashboard/global-availability");
        return ResponseEntity.ok(service.getGlobalAvailability());
    }

    @GetMapping("/offline-series")
    public ResponseEntity<List<OfflineEventDataPointDTO>> getOfflineEventsSeries() {
        log.info("GET /api/dashboard/offline-series");
        return ResponseEntity.ok(service.getOfflineEventsSeries());
    }

    @GetMapping("/top-offline-stores")
    public ResponseEntity<List<StoreOfflineRankingDTO>> getTopStoresByOfflineEvents() {
        log.info("GET /api/dashboard/top-offline-stores");
        return ResponseEntity.ok(service.getTopStoresByOfflineEvents());
    }


    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsDTO> getSystemHealthStats() {
        log.info("GET /api/dashboard/stats");
        return ResponseEntity.ok(service.getSystemHealthStats());
    }


    @GetMapping("/health-series")
    public ResponseEntity<List<HealthDataPointDTO>> getFullHealthSeries() {
        log.info("GET /api/dashboard/health-series");
        return ResponseEntity.ok(service.getFullHealthSeries());
    }

    @GetMapping("/incidents")
    public ResponseEntity<List<CriticalIncidentDTO>> getCriticalIncidentLog() {
        log.info("GET /api/dashboard/incidents");
        return ResponseEntity.ok(service.getCriticalIncidentLog());
    }
}

