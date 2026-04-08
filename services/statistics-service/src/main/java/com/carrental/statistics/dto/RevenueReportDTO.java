package com.carrental.statistics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueReportDTO {
    private String period;
    private BigDecimal totalRevenue;
    private BigDecimal rentalRevenue;
    private BigDecimal depositRevenue;
    private BigDecimal penaltyRevenue;
    private BigDecimal refundAmount;
    private BigDecimal netRevenue;
    private Integer totalRentals;
    private Integer completedRentals;
    private Integer cancelledRentals;
    private Integer totalPenalties;
}
