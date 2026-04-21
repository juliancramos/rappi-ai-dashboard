package com.dashboard.backend.dto;

/**
 * 
 * @param hourBucket 
 * @param avgVisibility 
 * @param sampleCount 
 */
public record HealthDataPointDTO(
        String hourBucket,
        double avgVisibility,
        long   sampleCount
) {}
