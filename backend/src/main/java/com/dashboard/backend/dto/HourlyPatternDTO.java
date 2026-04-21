package com.dashboard.backend.dto;

public record HourlyPatternDTO(
        String hourOfDay,
        double averageVisibility
) {}
