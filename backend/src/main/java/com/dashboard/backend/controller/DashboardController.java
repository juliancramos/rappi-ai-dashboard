package com.dashboard.backend.controller;

import com.dashboard.backend.dto.GlobalAvailabilityDTO;
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
public class DashboardController {

    private final DashboardService service;

    @GetMapping("/global-availability")
    public ResponseEntity<GlobalAvailabilityDTO> getGlobalAvailability() {
        log.info("Fetching global availability metrics");
        return ResponseEntity.ok(service.getGlobalAvailability());
    }

    @GetMapping("/offline-series")
    public ResponseEntity<List<OfflineEventDataPointDTO>> getOfflineEventsSeries() {
        log.info("Fetching offline event time-series data");
        return ResponseEntity.ok(service.getOfflineEventsSeries());
    }

    @GetMapping("/top-offline-stores")
    public ResponseEntity<List<StoreOfflineRankingDTO>> getTopStoresByOfflineEvents() {
        log.info("Fetching ranking for top stores with offline events");
        return ResponseEntity.ok(service.getTopStoresByOfflineEvents());
    }
}
