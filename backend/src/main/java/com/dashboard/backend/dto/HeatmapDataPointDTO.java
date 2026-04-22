package com.dashboard.backend.dto;

public record HeatmapDataPointDTO(
        String date,
        String hour,
        double averageVisibility
) {}
