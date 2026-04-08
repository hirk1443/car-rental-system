package com.carrental.statistics.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rental_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalTransaction {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "transaction_id", updatable = false, nullable = false)
    private String transactionId;
    
    @Column(name = "rental_id", nullable = false)
    private String rentalId;
    
    @Column(name = "customer_id", nullable = false)
    private String customerId;
    
    @Column(name = "vehicle_id")
    private String vehicleId;
    
    @Column(name = "payment_id")
    private String paymentId;
    
    @Column(name = "transaction_type", nullable = false)
    private String transactionType; // RENTAL, DEPOSIT, PENALTY, REFUND
    
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
    
    @Column(name = "transaction_date", nullable = false)
    private LocalDateTime transactionDate;
    
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (transactionDate == null) {
            transactionDate = LocalDateTime.now();
        }
    }
}
