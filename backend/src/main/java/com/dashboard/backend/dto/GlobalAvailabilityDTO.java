package com.dashboard.backend.dto;

public record GlobalAvailabilityDTO(
        double availabilityRate,
        long totalEvents,
        long offlineEvents
) {
}
