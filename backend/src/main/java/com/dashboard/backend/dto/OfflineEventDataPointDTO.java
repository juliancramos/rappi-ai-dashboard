package com.dashboard.backend.dto;

import java.time.LocalDateTime;

public record OfflineEventDataPointDTO(
        LocalDateTime timestamp,
        long offlineCount
) {
}
