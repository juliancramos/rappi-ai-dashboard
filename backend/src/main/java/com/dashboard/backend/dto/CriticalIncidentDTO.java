package com.dashboard.backend.dto;

/**
 * 
 *
 * @param id          
 * @param plotName    
 * @param metric      
 * @param statusValue 
 */
public record CriticalIncidentDTO(
        long   id,
        String plotName,
        String metric,
        String timestamp,
        long   statusValue
) {}
