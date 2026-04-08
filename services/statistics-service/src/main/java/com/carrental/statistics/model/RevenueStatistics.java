package com.carrental.statistics.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "revenue_statistics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueStatistics {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "stat_id", updatable = false, nullable = false)
    private String statId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "period_type", nullable = false)
    private PeriodType periodType;
    
    @Column(name = "year", nullable = false)
    private Integer year;
    
    @Column(name = "period", nullable = false)
    private Integer period; // Month (1-12) or Quarter (1-4)
    
    @Column(name = "period_start", nullable = false)
    private LocalDateTime periodStart;
    
    @Column(name = "period_end", nullable = false)
    private LocalDateTime periodEnd;
    
    @Column(name = "total_revenue", precision = 15, scale = 2)
    private BigDecimal totalRevenue = BigDecimal.ZERO;
    
    @Column(name = "rental_revenue", precision = 15, scale = 2)
    private BigDecimal rentalRevenue = BigDecimal.ZERO;
    
    @Column(name = "deposit_revenue", precision = 15, scale = 2)
    private BigDecimal depositRevenue = BigDecimal.ZERO;
    
    @Column(name = "penalty_revenue", precision = 15, scale = 2)
    private BigDecimal penaltyRevenue = BigDecimal.ZERO;
    
    @Column(name = "refund_amount", precision = 15, scale = 2)
    private BigDecimal refundAmount = BigDecimal.ZERO;
    
    @Column(name = "net_revenue", precision = 15, scale = 2)
    private BigDecimal netRevenue = BigDecimal.ZERO;
    
    @Column(name = "total_rentals")
    private Integer totalRentals = 0;
    
    @Column(name = "completed_rentals")
    private Integer completedRentals = 0;
    
    @Column(name = "cancelled_rentals")
    private Integer cancelledRentals = 0;
    
    @Column(name = "total_penalties")
    private Integer totalPenalties = 0;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        calculateNetRevenue();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculateNetRevenue();
    }
    
    public void calculateNetRevenue() {
        this.netRevenue = totalRevenue.subtract(refundAmount);
    }
    
    public void calculateTotalRevenue() {
        BigDecimal total = BigDecimal.ZERO;
        if (rentalRevenue != null) total = total.add(rentalRevenue);
        if (depositRevenue != null) total = total.add(depositRevenue);
        if (penaltyRevenue != null) total = total.add(penaltyRevenue);
        this.totalRevenue = total;
    }
}
