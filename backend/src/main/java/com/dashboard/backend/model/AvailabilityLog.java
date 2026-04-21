package com.dashboard.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "availability_logs")
public class AvailabilityLog {

    @Id
    private Long id;

    @Column(name = "plot_name")
    private String plotName;

    private String metric;

    @Column(name = "value_prefix")
    private Double valuePrefix;

    @Column(name = "value_suffix")
    private Double valueSuffix;

    private LocalDateTime timestamp;

    @Column(name = "status_value")
    private Long statusValue;
}
