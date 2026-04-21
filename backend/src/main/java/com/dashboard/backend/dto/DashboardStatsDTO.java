package com.dashboard.backend.dto;

/**
 *
 * @param uptimePercentage   
 * @param peakVisibility     
 * @param totalCriticalOutages 
 */
public record DashboardStatsDTO(
        double uptimePercentage,
        long   peakVisibility,
        long   totalCriticalOutages
) {}
