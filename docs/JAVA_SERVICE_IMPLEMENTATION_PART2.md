# Java Service Implementation - Part 2

## 3. Payment Service

### Model: Payment.java

```java
package com.carrental.payment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "payment_id")
    private UUID paymentId;
    
    @Column(name = "rental_id", nullable = false)
    private UUID rentalId;
    
    @Column(name = "customer_id", nullable = false)
    private UUID customerId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false)
    private PaymentType paymentType;
    
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus;
    
    @Column(name = "transaction_id")
    private String transactionId;
    
    @Column(name = "payment_date")
    private LocalDateTime paymentDate;
    
    @Column(name = "payment_gateway")
    private String paymentGateway;
    
    @Column(name = "gateway_response", columnDefinition = "TEXT")
    private String gatewayResponse;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        paymentStatus = PaymentStatus.PENDING;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

enum PaymentType {
    DEPOSIT, RENTAL_FEE, PENALTY, REFUND
}

enum PaymentMethod {
    CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, E_WALLET
}

enum PaymentStatus {
    PENDING, COMPLETED, FAILED, REFUNDED
}
```

### Service: PaymentService.java

```java
package com.carrental.payment.service;

import com.carrental.payment.client.PaymentGatewayClient;
import com.carrental.payment.dto.PaymentDTO;
import com.carrental.payment.dto.PaymentProcessDTO;
import com.carrental.payment.event.PaymentEventPublisher;
import com.carrental.payment.model.*;
import com.carrental.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    
    private final PaymentRepository paymentRepository;
    private final PaymentGatewayClient gatewayClient;
    private final PaymentEventPublisher eventPublisher;
    
    @Transactional
    public Payment createPayment(PaymentDTO dto) {
        log.info("Creating payment for rental: {}, type: {}, amount: {}", 
                 dto.getRentalId(), dto.getPaymentType(), dto.getAmount());
        
        Payment payment = Payment.builder()
            .rentalId(dto.getRentalId())
            .customerId(dto.getCustomerId())
            .paymentType(dto.getPaymentType())
            .amount(dto.getAmount())
            .paymentMethod(dto.getPaymentMethod())
            .build();
        
        payment = paymentRepository.save(payment);
        
        // Generate payment URL for online payments
        if (isOnlinePaymentMethod(payment.getPaymentMethod())) {
            String paymentUrl = gatewayClient.createPaymentUrl(payment);
            payment.setPaymentGateway(gatewayClient.getGatewayName());
            paymentRepository.save(payment);
        }
        
        log.info("Payment created with ID: {}", payment.getPaymentId());
        return payment;
    }
    
    @Transactional
    public Payment processPayment(UUID paymentId, PaymentProcessDTO processDTO) {
        log.info("Processing payment: {}", paymentId);
        
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new PaymentNotFoundException(paymentId));
        
        payment.setTransactionId(processDTO.getTransactionId());
        payment.setPaymentStatus(PaymentStatus.COMPLETED);
        payment.setPaymentDate(LocalDateTime.now());
        payment.setGatewayResponse(processDTO.getGatewayResponse());
        
        payment = paymentRepository.save(payment);
        
        // Publish event
        eventPublisher.publishPaymentCompleted(payment);
        
        log.info("Payment {} processed successfully", paymentId);
        return payment;
    }
    
    @Transactional
    public Payment createRefund(UUID originalPaymentId, BigDecimal amount, String reason) {
        log.info("Creating refund for payment: {}, amount: {}", originalPaymentId, amount);
        
        Payment originalPayment = paymentRepository.findById(originalPaymentId)
            .orElseThrow(() -> new PaymentNotFoundException(originalPaymentId));
        
        Payment refund = Payment.builder()
            .rentalId(originalPayment.getRentalId())
            .customerId(originalPayment.getCustomerId())
            .paymentType(PaymentType.REFUND)
            .amount(amount)
            .paymentMethod(originalPayment.getPaymentMethod())
            .paymentStatus(PaymentStatus.PENDING)
            .build();
        
        refund = paymentRepository.save(refund);
        
        // Process refund via gateway
        if (originalPayment.getTransactionId() != null) {
            boolean success = gatewayClient.processRefund(
                originalPayment.getTransactionId(), 
                amount
            );
            
            if (success) {
                refund.setPaymentStatus(PaymentStatus.COMPLETED);
                refund.setPaymentDate(LocalDateTime.now());
                refund = paymentRepository.save(refund);
                
                // Publish event
                eventPublisher.publishRefundCompleted(refund);
            }
        }
        
        log.info("Refund created with ID: {}", refund.getPaymentId());
        return refund;
    }
    
    @Transactional(readOnly = true)
    public Payment getPayment(UUID paymentId) {
        return paymentRepository.findById(paymentId)
            .orElseThrow(() -> new PaymentNotFoundException(paymentId));
    }
    
    private boolean isOnlinePaymentMethod(PaymentMethod method) {
        return method == PaymentMethod.CREDIT_CARD || 
               method == PaymentMethod.DEBIT_CARD || 
               method == PaymentMethod.E_WALLET;
    }
}
```

---

## 4. Statistics Service

### Model: RevenueStatistics.java

```java
package com.carrental.statistics.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "revenue_statistics", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"period_type", "period_value"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueStatistics {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "stat_id")
    private UUID statId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "period_type", nullable = false)
    private PeriodType periodType;
    
    @Column(name = "period_value", nullable = false)
    private String periodValue;
    
    @Column(name = "total_revenue", precision = 15, scale = 2)
    private BigDecimal totalRevenue;
    
    @Column(name = "rental_revenue", precision = 15, scale = 2)
    private BigDecimal rentalRevenue;
    
    @Column(name = "penalty_revenue", precision = 15, scale = 2)
    private BigDecimal penaltyRevenue;
    
    @Column(name = "total_rentals")
    private Integer totalRentals;
    
    @Column(name = "total_customers")
    private Integer totalCustomers;
    
    @Column(name = "total_vehicles_used")
    private Integer totalVehiclesUsed;
    
    @Column(name = "average_rental_value", precision = 12, scale = 2)
    private BigDecimal averageRentalValue;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        
        if (totalRevenue == null) totalRevenue = BigDecimal.ZERO;
        if (rentalRevenue == null) rentalRevenue = BigDecimal.ZERO;
        if (penaltyRevenue == null) penaltyRevenue = BigDecimal.ZERO;
        if (totalRentals == null) totalRentals = 0;
        if (totalCustomers == null) totalCustomers = 0;
        if (totalVehiclesUsed == null) totalVehiclesUsed = 0;
        if (averageRentalValue == null) averageRentalValue = BigDecimal.ZERO;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

enum PeriodType {
    MONTH, QUARTER, YEAR
}
```

### Service: StatisticsService.java

```java
package com.carrental.statistics.service;

import com.carrental.statistics.dto.RevenueStatisticsDTO;
import com.carrental.statistics.model.*;
import com.carrental.statistics.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatisticsService {
    
    private final RevenueStatisticsRepository revenueRepository;
    private final CustomerRevenueStatsRepository customerRevenueRepository;
    private final VehicleCategoryRevenueRepository vehicleCategoryRepository;
    private final PartnerRevenueStatsRepository partnerRevenueRepository;
    
    @Transactional(readOnly = true)
    @Cacheable(value = "revenueStats", key = "#periodType + '_' + #periodValue")
    public RevenueStatistics getRevenueStatistics(PeriodType periodType, String periodValue) {
        log.info("Getting revenue statistics for {} - {}", periodType, periodValue);
        
        Optional<RevenueStatistics> stats = revenueRepository
            .findByPeriodTypeAndPeriodValue(periodType, periodValue);
        
        if (stats.isEmpty()) {
            // Calculate if not exists
            return calculateRevenueStatistics(periodType, periodValue);
        }
        
        return stats.get();
    }
    
    @Transactional
    public RevenueStatistics calculateRevenueStatistics(PeriodType periodType, String periodValue) {
        log.info("Calculating revenue statistics for {} - {}", periodType, periodValue);
        
        // Get date range
        DateRange dateRange = getDateRange(periodType, periodValue);
        
        // Query rentals (simplified - actual implementation would call Rental Service)
        List<RentalData> rentals = fetchCompletedRentals(
            dateRange.getStartDate(), 
            dateRange.getEndDate()
        );
        
        // Query penalties (simplified - actual implementation would call Penalty Service)
        List<PenaltyData> penalties = fetchPaidPenalties(
            dateRange.getStartDate(), 
            dateRange.getEndDate()
        );
        
        // Calculate totals
        BigDecimal rentalRevenue = rentals.stream()
            .map(RentalData::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal penaltyRevenue = penalties.stream()
            .map(PenaltyData::getPenaltyAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalRevenue = rentalRevenue.add(penaltyRevenue);
        
        int totalRentals = rentals.size();
        
        Set<UUID> uniqueCustomers = new HashSet<>();
        Set<UUID> uniqueVehicles = new HashSet<>();
        
        for (RentalData rental : rentals) {
            uniqueCustomers.add(rental.getCustomerId());
            uniqueVehicles.add(rental.getVehicleId());
        }
        
        BigDecimal averageRentalValue = totalRentals > 0 
            ? rentalRevenue.divide(new BigDecimal(totalRentals), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        
        // Save statistics
        RevenueStatistics stats = RevenueStatistics.builder()
            .periodType(periodType)
            .periodValue(periodValue)
            .totalRevenue(totalRevenue)
            .rentalRevenue(rentalRevenue)
            .penaltyRevenue(penaltyRevenue)
            .totalRentals(totalRentals)
            .totalCustomers(uniqueCustomers.size())
            .totalVehiclesUsed(uniqueVehicles.size())
            .averageRentalValue(averageRentalValue)
            .build();
        
        // Check if already exists
        Optional<RevenueStatistics> existing = revenueRepository
            .findByPeriodTypeAndPeriodValue(periodType, periodValue);
        
        if (existing.isPresent()) {
            stats.setStatId(existing.get().getStatId());
            stats.setCreatedAt(existing.get().getCreatedAt());
        }
        
        stats = revenueRepository.save(stats);
        
        log.info("Revenue statistics calculated: {} VND", totalRevenue);
        return stats;
    }
    
    @Transactional(readOnly = true)
    @Cacheable(value = "customerRevenueStats", key = "#periodType + '_' + #periodValue + '_' + #limit")
    public List<CustomerRevenueStats> getTopCustomersByRevenue(
            PeriodType periodType, 
            String periodValue, 
            int limit) {
        
        return customerRevenueRepository.findTopByPeriodTypeAndPeriodValue(
            periodType, periodValue, limit
        );
    }
    
    @Transactional(readOnly = true)
    @Cacheable(value = "vehicleCategoryStats", key = "#periodType + '_' + #periodValue")
    public List<VehicleCategoryRevenueStats> getVehicleCategoryRevenue(
            PeriodType periodType, 
            String periodValue) {
        
        return vehicleCategoryRepository.findByPeriodTypeAndPeriodValue(
            periodType, periodValue
        );
    }
    
    @Transactional(readOnly = true)
    @Cacheable(value = "partnerRevenueStats", key = "#periodType + '_' + #periodValue")
    public List<PartnerRevenueStats> getPartnerRevenue(
            PeriodType periodType, 
            String periodValue) {
        
        return partnerRevenueRepository.findByPeriodTypeAndPeriodValue(
            periodType, periodValue
        );
    }
    
    @Transactional
    public Map<String, RevenueStatistics> getRevenueComparison(
            String startPeriod, 
            String endPeriod, 
            PeriodType periodType) {
        
        log.info("Getting revenue comparison from {} to {}", startPeriod, endPeriod);
        
        Map<String, RevenueStatistics> comparison = new LinkedHashMap<>();
        
        List<String> periods = generatePeriods(startPeriod, endPeriod, periodType);
        
        for (String period : periods) {
            RevenueStatistics stats = getRevenueStatistics(periodType, period);
            comparison.put(period, stats);
        }
        
        return comparison;
    }
    
    // Scheduled job to update statistics daily at 1 AM
    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void updateAllStatistics() {
        log.info("Starting scheduled statistics update");
        
        LocalDate now = LocalDate.now();
        
        // Update current month
        String currentMonth = now.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        calculateRevenueStatistics(PeriodType.MONTH, currentMonth);
        
        // Update current quarter
        int quarter = (now.getMonthValue() - 1) / 3 + 1;
        String currentQuarter = now.getYear() + "-Q" + quarter;
        calculateRevenueStatistics(PeriodType.QUARTER, currentQuarter);
        
        // Update current year
        String currentYear = String.valueOf(now.getYear());
        calculateRevenueStatistics(PeriodType.YEAR, currentYear);
        
        // Update previous month (in case of late data)
        String previousMonth = now.minusMonths(1)
            .format(DateTimeFormatter.ofPattern("yyyy-MM"));
        calculateRevenueStatistics(PeriodType.MONTH, previousMonth);
        
        log.info("Scheduled statistics update completed");
    }
    
    private DateRange getDateRange(PeriodType periodType, String periodValue) {
        LocalDateTime startDate;
        LocalDateTime endDate;
        
        switch (periodType) {
            case MONTH -> {
                LocalDate date = LocalDate.parse(periodValue + "-01");
                startDate = date.atStartOfDay();
                endDate = date.plusMonths(1).atStartOfDay();
            }
            case QUARTER -> {
                String[] parts = periodValue.split("-Q");
                int year = Integer.parseInt(parts[0]);
                int quarter = Integer.parseInt(parts[1]);
                int startMonth = (quarter - 1) * 3 + 1;
                
                LocalDate date = LocalDate.of(year, startMonth, 1);
                startDate = date.atStartOfDay();
                endDate = date.plusMonths(3).atStartOfDay();
            }
            case YEAR -> {
                int year = Integer.parseInt(periodValue);
                startDate = LocalDate.of(year, 1, 1).atStartOfDay();
                endDate = LocalDate.of(year + 1, 1, 1).atStartOfDay();
            }
            default -> throw new IllegalArgumentException("Invalid period type");
        }
        
        return new DateRange(startDate, endDate);
    }
    
    private List<String> generatePeriods(String start, String end, PeriodType periodType) {
        List<String> periods = new ArrayList<>();
        
        switch (periodType) {
            case MONTH -> {
                LocalDate startDate = LocalDate.parse(start + "-01");
                LocalDate endDate = LocalDate.parse(end + "-01");
                
                while (!startDate.isAfter(endDate)) {
                    periods.add(startDate.format(DateTimeFormatter.ofPattern("yyyy-MM")));
                    startDate = startDate.plusMonths(1);
                }
            }
            case QUARTER -> {
                // Implement quarter generation
            }
            case YEAR -> {
                int startYear = Integer.parseInt(start);
                int endYear = Integer.parseInt(end);
                
                for (int year = startYear; year <= endYear; year++) {
                    periods.add(String.valueOf(year));
                }
            }
        }
        
        return periods;
    }
    
    // Helper methods to fetch data from other services
    private List<RentalData> fetchCompletedRentals(LocalDateTime start, LocalDateTime end) {
        // In actual implementation, call Rental Service API
        // For now, return empty list
        return new ArrayList<>();
    }
    
    private List<PenaltyData> fetchPaidPenalties(LocalDateTime start, LocalDateTime end) {
        // In actual implementation, call Penalty Service API
        // For now, return empty list
        return new ArrayList<>();
    }
}

// Helper classes
@Data
@AllArgsConstructor
class DateRange {
    private LocalDateTime startDate;
    private LocalDateTime endDate;
}

@Data
class RentalData {
    private UUID rentalId;
    private UUID customerId;
    private UUID vehicleId;
    private BigDecimal totalAmount;
}

@Data
class PenaltyData {
    private UUID penaltyId;
    private UUID customerId;
    private BigDecimal penaltyAmount;
}
```

### Controller: StatisticsController.java

```java
package com.carrental.statistics.controller;

import com.carrental.statistics.dto.DashboardSummaryDTO;
import com.carrental.statistics.model.*;
import com.carrental.statistics.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {
    
    private final StatisticsService statisticsService;
    
    @GetMapping("/revenue")
    public ResponseEntity<RevenueStatistics> getRevenueStatistics(
            @RequestParam PeriodType periodType,
            @RequestParam String periodValue) {
        
        RevenueStatistics stats = statisticsService.getRevenueStatistics(
            periodType, periodValue);
        return ResponseEntity.ok(stats);
    }
    
    @GetMapping("/revenue/compare")
    public ResponseEntity<Map<String, RevenueStatistics>> getRevenueComparison(
            @RequestParam String startPeriod,
            @RequestParam String endPeriod,
            @RequestParam PeriodType periodType) {
        
        Map<String, RevenueStatistics> comparison = 
            statisticsService.getRevenueComparison(startPeriod, endPeriod, periodType);
        return ResponseEntity.ok(comparison);
    }
    
    @GetMapping("/revenue/customers")
    public ResponseEntity<List<CustomerRevenueStats>> getTopCustomers(
            @RequestParam PeriodType periodType,
            @RequestParam String periodValue,
            @RequestParam(defaultValue = "10") int limit) {
        
        List<CustomerRevenueStats> customers = 
            statisticsService.getTopCustomersByRevenue(periodType, periodValue, limit);
        return ResponseEntity.ok(customers);
    }
    
    @GetMapping("/revenue/vehicle-categories")
    public ResponseEntity<List<VehicleCategoryRevenueStats>> getVehicleCategoryRevenue(
            @RequestParam PeriodType periodType,
            @RequestParam String periodValue) {
        
        List<VehicleCategoryRevenueStats> categories = 
            statisticsService.getVehicleCategoryRevenue(periodType, periodValue);
        return ResponseEntity.ok(categories);
    }
    
    @GetMapping("/revenue/partners")
    public ResponseEntity<List<PartnerRevenueStats>> getPartnerRevenue(
            @RequestParam PeriodType periodType,
            @RequestParam String periodValue) {
        
        List<PartnerRevenueStats> partners = 
            statisticsService.getPartnerRevenue(periodType, periodValue);
        return ResponseEntity.ok(partners);
    }
    
    @PostMapping("/update")
    public ResponseEntity<Void> triggerStatisticsUpdate() {
        statisticsService.updateAllStatistics();
        return ResponseEntity.ok().build();
    }
}
```

---

## Event Publishing and Listening

### Event Publisher Example

```java
package com.carrental.damagpenalty.event;

import com.carrental.damagpenalty.model.DamageReport;
import com.carrental.damagpenalty.model.Penalty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DamageEventPublisher {
    
    private final RabbitTemplate rabbitTemplate;
    
    private static final String EXCHANGE = "car-rental-exchange";
    
    public void publishDamageReported(DamageReport damage) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType", "damage.reported");
        event.put("damageId", damage.getDamageId());
        event.put("vehicleId", damage.getVehicleId());
        event.put("rentalId", damage.getRentalId());
        event.put("severity", damage.getSeverity());
        event.put("repairCost", damage.getRepairCost());
        
        rabbitTemplate.convertAndSend(EXCHANGE, "damage.reported", event);
        log.info("Published damage.reported event for damage: {}", damage.getDamageId());
    }
    
    public void publishDamageUpdated(DamageReport damage) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType", "damage.updated");
        event.put("damageId", damage.getDamageId());
        event.put("status", damage.getStatus());
        
        rabbitTemplate.convertAndSend(EXCHANGE, "damage.updated", event);
        log.info("Published damage.updated event for damage: {}", damage.getDamageId());
    }
}

@Component
@RequiredArgsConstructor
@Slf4j
public class PenaltyEventPublisher {
    
    private final RabbitTemplate rabbitTemplate;
    
    private static final String EXCHANGE = "car-rental-exchange";
    
    public void publishPenaltyCreated(Penalty penalty) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType", "penalty.created");
        event.put("penaltyId", penalty.getPenaltyId());
        event.put("customerId", penalty.getCustomerId());
        event.put("amount", penalty.getPenaltyAmount());
        
        rabbitTemplate.convertAndSend(EXCHANGE, "penalty.created", event);
        log.info("Published penalty.created event for penalty: {}", penalty.getPenaltyId());
    }
    
    public void publishPenaltyPaid(Penalty penalty, BigDecimal amount) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType", "penalty.paid");
        event.put("penaltyId", penalty.getPenaltyId());
        event.put("customerId", penalty.getCustomerId());
        event.put("amount", amount);
        event.put("status", penalty.getPaymentStatus());
        
        rabbitTemplate.convertAndSend(EXCHANGE, "penalty.paid", event);
        log.info("Published penalty.paid event for penalty: {}", penalty.getPenaltyId());
    }
}
```

### Event Listener Example

```java
package com.carrental.statistics.listener;

import com.carrental.statistics.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class RentalEventListener {
    
    private final StatisticsService statisticsService;
    
    @RabbitListener(queues = "rental.completed.queue")
    public void handleRentalCompleted(Map<String, Object> event) {
        log.info("Received rental.completed event: {}", event);
        
        // Trigger statistics update
        statisticsService.updateAllStatistics();
    }
    
    @RabbitListener(queues = "payment.completed.queue")
    public void handlePaymentCompleted(Map<String, Object> event) {
        log.info("Received payment.completed event: {}", event);
        
        String paymentType = (String) event.get("payment_type");
        if ("RENTAL_FEE".equals(paymentType) || "PENALTY".equals(paymentType)) {
            statisticsService.updateAllStatistics();
        }
    }
}
```

---

## Configuration Files

### application.yml (example for Damage-Penalty Service)

```yaml
spring:
  application:
    name: damage-penalty-service
  
  datasource:
    url: jdbc:postgresql://${DATABASE_HOST:localhost}:${DATABASE_PORT:5432}/${DATABASE_NAME:damage_penalty_db}
    username: ${DATABASE_USER:postgres}
    password: ${DATABASE_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
  
  rabbitmq:
    host: ${RABBITMQ_HOST:localhost}
    port: ${RABBITMQ_PORT:5672}
    username: ${RABBITMQ_USER:guest}
    password: ${RABBITMQ_PASSWORD:guest}
  
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD:}

server:
  port: 8080

logging:
  level:
    com.carrental: INFO
    org.hibernate.SQL: DEBUG
```

### pom.xml dependencies

```xml
<dependencies>
    <!-- Spring Boot Starter Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Spring Boot Starter Data JPA -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    
    <!-- PostgreSQL Driver -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Spring Boot Starter AMQP (RabbitMQ) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-amqp</artifactId>
    </dependency>
    
    <!-- Spring Boot Starter Cache -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-cache</artifactId>
    </dependency>
    
    <!-- Spring Boot Starter Data Redis -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    
    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    
    <!-- Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    
    <!-- Spring Boot Starter Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```
