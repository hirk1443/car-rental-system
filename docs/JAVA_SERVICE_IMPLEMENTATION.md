# Service Classes and Methods - Java Implementation

## Technology Stack

- **Language**: Java 17+
- **Framework**: Spring Boot 3.x
- **Database**: PostgreSQL with Spring Data JPA
- **Message Queue**: RabbitMQ with Spring AMQP
- **API**: RESTful APIs with Spring Web
- **Cache**: Redis with Spring Cache
- **Build Tool**: Maven/Gradle

---

## 1. Damage & Penalty Service

### Package Structure
```
src/main/java/com/carrental/damagpenalty/
├── controller/
│   ├── DamageController.java
│   └── PenaltyController.java
├── service/
│   ├── DamageService.java
│   └── PenaltyService.java
├── repository/
│   ├── DamageRepository.java
│   └── PenaltyRepository.java
├── model/
│   ├── DamageReport.java
│   ├── Penalty.java
│   └── PenaltyRule.java
├── dto/
│   ├── DamageReportDTO.java
│   └── PenaltyDTO.java
├── event/
│   ├── DamageEventPublisher.java
│   └── DamageEventListener.java
└── exception/
    └── CustomExceptions.java
```

### Model: DamageReport.java

```java
package com.carrental.damagpenalty.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "damage_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamageReport {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "damage_id", updatable = false, nullable = false)
    private UUID damageId;
    
    @Column(name = "vehicle_id", nullable = false)
    private UUID vehicleId;
    
    @Column(name = "rental_id", nullable = false)
    private UUID rentalId;
    
    @Column(name = "customer_id", nullable = false)
    private UUID customerId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "damage_type", nullable = false)
    private DamageType damageType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "severity")
    private DamageSeverity severity;
    
    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "location_on_vehicle")
    private String locationOnVehicle;
    
    @ElementCollection
    @CollectionTable(name = "damage_images", joinColumns = @JoinColumn(name = "damage_id"))
    @Column(name = "image_url")
    private List<String> imageUrls;
    
    @Column(name = "repair_cost", precision = 10, scale = 2)
    private BigDecimal repairCost;
    
    @Column(name = "reported_date")
    private LocalDateTime reportedDate;
    
    @Column(name = "reported_by")
    private String reportedBy;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private DamageStatus status;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        reportedDate = LocalDateTime.now();
        status = DamageStatus.REPORTED;
        
        // Auto-calculate repair cost if not set
        if (repairCost == null) {
            repairCost = calculateRepairCost();
        }
    }
    
    public BigDecimal calculateRepairCost() {
        BigDecimal baseCost = getBaseCostForDamageType();
        BigDecimal multiplier = getMultiplierForSeverity();
        return baseCost.multiply(multiplier);
    }
    
    private BigDecimal getBaseCostForDamageType() {
        return switch (damageType) {
            case SCRATCH -> new BigDecimal("500000");
            case DENT -> new BigDecimal("1000000");
            case BROKEN_PART -> new BigDecimal("2000000");
            case INTERIOR_DAMAGE -> new BigDecimal("1500000");
            case MECHANICAL -> new BigDecimal("3000000");
            default -> new BigDecimal("1000000");
        };
    }
    
    private BigDecimal getMultiplierForSeverity() {
        return switch (severity) {
            case MINOR -> new BigDecimal("1.0");
            case MODERATE -> new BigDecimal("2.0");
            case MAJOR -> new BigDecimal("4.0");
            case TOTAL_LOSS -> new BigDecimal("10.0");
            default -> new BigDecimal("1.0");
        };
    }
}

enum DamageType {
    SCRATCH, DENT, BROKEN_PART, INTERIOR_DAMAGE, MECHANICAL
}

enum DamageSeverity {
    MINOR, MODERATE, MAJOR, TOTAL_LOSS
}

enum DamageStatus {
    REPORTED, UNDER_REVIEW, REPAIRED, CLOSED
}
```

### Model: Penalty.java

```java
package com.carrental.damagpenalty.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "penalties")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Penalty {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "penalty_id")
    private UUID penaltyId;
    
    @Column(name = "damage_id")
    private UUID damageId;
    
    @Column(name = "rental_id", nullable = false)
    private UUID rentalId;
    
    @Column(name = "customer_id", nullable = false)
    private UUID customerId;
    
    @Column(name = "vehicle_id", nullable = false)
    private UUID vehicleId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "penalty_type", nullable = false)
    private PenaltyType penaltyType;
    
    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "penalty_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal penaltyAmount;
    
    @Column(name = "penalty_date", nullable = false)
    private LocalDate penaltyDate;
    
    @Column(name = "due_date")
    private LocalDate dueDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus;
    
    @Column(name = "paid_amount", precision = 10, scale = 2)
    private BigDecimal paidAmount;
    
    @Column(name = "payment_date")
    private LocalDate paymentDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        penaltyDate = LocalDate.now();
        paymentStatus = PaymentStatus.UNPAID;
        paidAmount = BigDecimal.ZERO;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public void addPayment(BigDecimal amount) {
        this.paidAmount = this.paidAmount.add(amount);
        
        if (this.paidAmount.compareTo(this.penaltyAmount) >= 0) {
            this.paymentStatus = PaymentStatus.PAID;
            this.paymentDate = LocalDate.now();
        } else {
            this.paymentStatus = PaymentStatus.PARTIALLY_PAID;
        }
    }
}

enum PenaltyType {
    DAMAGE, LATE_RETURN, TRAFFIC_VIOLATION, CLEANING, FUEL, OTHER
}

enum PaymentStatus {
    UNPAID, PARTIALLY_PAID, PAID, WAIVED
}
```

### Service: DamageService.java

```java
package com.carrental.damagpenalty.service;

import com.carrental.damagpenalty.dto.DamageReportDTO;
import com.carrental.damagpenalty.event.DamageEventPublisher;
import com.carrental.damagpenalty.model.*;
import com.carrental.damagpenalty.repository.DamageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DamageService {
    
    private final DamageRepository damageRepository;
    private final PenaltyService penaltyService;
    private final DamageEventPublisher eventPublisher;
    
    @Transactional
    public DamageReport createDamageReport(DamageReportDTO dto) {
        log.info("Creating damage report for vehicle: {}, rental: {}", 
                 dto.getVehicleId(), dto.getRentalId());
        
        DamageReport damage = DamageReport.builder()
            .vehicleId(dto.getVehicleId())
            .rentalId(dto.getRentalId())
            .customerId(dto.getCustomerId())
            .damageType(dto.getDamageType())
            .severity(dto.getSeverity())
            .description(dto.getDescription())
            .locationOnVehicle(dto.getLocationOnVehicle())
            .imageUrls(dto.getImageUrls())
            .reportedBy(dto.getReportedBy())
            .build();
        
        // Calculate repair cost
        damage.setRepairCost(damage.calculateRepairCost());
        
        // Save to database
        damage = damageRepository.save(damage);
        
        // Publish event
        eventPublisher.publishDamageReported(damage);
        
        // Auto-create penalty for moderate and major damages
        if (damage.getSeverity() == DamageSeverity.MODERATE || 
            damage.getSeverity() == DamageSeverity.MAJOR) {
            penaltyService.createPenaltyForDamage(damage);
        }
        
        log.info("Damage report created with ID: {}", damage.getDamageId());
        return damage;
    }
    
    @Transactional(readOnly = true)
    public DamageReport getDamageReport(UUID damageId) {
        return damageRepository.findById(damageId)
            .orElseThrow(() -> new DamageNotFoundException(damageId));
    }
    
    @Transactional(readOnly = true)
    public Page<DamageReport> getDamageReports(UUID vehicleId, UUID rentalId, 
                                                DamageStatus status, Pageable pageable) {
        if (vehicleId != null) {
            return damageRepository.findByVehicleId(vehicleId, pageable);
        } else if (rentalId != null) {
            return damageRepository.findByRentalId(rentalId, pageable);
        } else if (status != null) {
            return damageRepository.findByStatus(status, pageable);
        }
        return damageRepository.findAll(pageable);
    }
    
    @Transactional
    public DamageReport updateDamageStatus(UUID damageId, DamageStatus status, 
                                           BigDecimal repairCost) {
        DamageReport damage = getDamageReport(damageId);
        
        damage.setStatus(status);
        if (repairCost != null) {
            damage.setRepairCost(repairCost);
        }
        
        damage = damageRepository.save(damage);
        
        // Publish event
        eventPublisher.publishDamageUpdated(damage);
        
        log.info("Damage report {} updated to status: {}", damageId, status);
        return damage;
    }
}
```

### Service: PenaltyService.java

```java
package com.carrental.damagpenalty.service;

import com.carrental.damagpenalty.dto.PenaltyDTO;
import com.carrental.damagpenalty.dto.PenaltyPaymentDTO;
import com.carrental.damagpenalty.event.PenaltyEventPublisher;
import com.carrental.damagpenalty.model.*;
import com.carrental.damagpenalty.repository.PenaltyRepository;
import com.carrental.damagpenalty.repository.PenaltyRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PenaltyService {
    
    private final PenaltyRepository penaltyRepository;
    private final PenaltyRuleRepository penaltyRuleRepository;
    private final PenaltyEventPublisher eventPublisher;
    
    @Transactional
    public Penalty createPenalty(PenaltyDTO dto) {
        log.info("Creating penalty for rental: {}, type: {}", 
                 dto.getRentalId(), dto.getPenaltyType());
        
        Penalty penalty = Penalty.builder()
            .damageId(dto.getDamageId())
            .rentalId(dto.getRentalId())
            .customerId(dto.getCustomerId())
            .vehicleId(dto.getVehicleId())
            .penaltyType(dto.getPenaltyType())
            .description(dto.getDescription())
            .penaltyAmount(dto.getPenaltyAmount())
            .dueDate(dto.getDueDate())
            .build();
        
        penalty = penaltyRepository.save(penalty);
        
        // Publish event
        eventPublisher.publishPenaltyCreated(penalty);
        
        log.info("Penalty created with ID: {}", penalty.getPenaltyId());
        return penalty;
    }
    
    @Transactional
    public Penalty createPenaltyForDamage(DamageReport damage) {
        PenaltyDTO dto = PenaltyDTO.builder()
            .damageId(damage.getDamageId())
            .rentalId(damage.getRentalId())
            .customerId(damage.getCustomerId())
            .vehicleId(damage.getVehicleId())
            .penaltyType(PenaltyType.DAMAGE)
            .description("Repair cost for " + damage.getDamageType())
            .penaltyAmount(damage.getRepairCost())
            .dueDate(LocalDate.now().plusDays(30))
            .build();
        
        return createPenalty(dto);
    }
    
    @Transactional
    public BigDecimal calculateLateReturnPenalty(UUID rentalId, int daysLate, 
                                                  BigDecimal dailyRate) {
        PenaltyRule rule = penaltyRuleRepository
            .findByPenaltyTypeAndIsActive(PenaltyType.LATE_RETURN, true)
            .orElseThrow(() -> new PenaltyRuleNotFoundException());
        
        return switch (rule.getCalculationMethod()) {
            case PERCENTAGE -> dailyRate
                .multiply(rule.getPercentage().divide(new BigDecimal("100")))
                .multiply(new BigDecimal(daysLate));
            case DAILY_RATE -> dailyRate.multiply(new BigDecimal(daysLate));
            case FIXED -> rule.getBaseAmount().multiply(new BigDecimal(daysLate));
        };
    }
    
    @Transactional
    public Penalty payPenalty(UUID penaltyId, PenaltyPaymentDTO paymentDTO) {
        log.info("Processing payment for penalty: {}, amount: {}", 
                 penaltyId, paymentDTO.getAmount());
        
        Penalty penalty = penaltyRepository.findById(penaltyId)
            .orElseThrow(() -> new PenaltyNotFoundException(penaltyId));
        
        penalty.addPayment(paymentDTO.getAmount());
        penalty = penaltyRepository.save(penalty);
        
        // Publish event
        eventPublisher.publishPenaltyPaid(penalty, paymentDTO.getAmount());
        
        log.info("Penalty {} payment processed. Status: {}", 
                 penaltyId, penalty.getPaymentStatus());
        return penalty;
    }
    
    @Transactional(readOnly = true)
    public Page<Penalty> getPenalties(UUID customerId, UUID rentalId, 
                                       PaymentStatus status, Pageable pageable) {
        if (customerId != null && status != null) {
            return penaltyRepository.findByCustomerIdAndPaymentStatus(
                customerId, status, pageable);
        } else if (customerId != null) {
            return penaltyRepository.findByCustomerId(customerId, pageable);
        } else if (rentalId != null) {
            return penaltyRepository.findByRentalId(rentalId, pageable);
        } else if (status != null) {
            return penaltyRepository.findByPaymentStatus(status, pageable);
        }
        return penaltyRepository.findAll(pageable);
    }
}
```

### Controller: DamageController.java

```java
package com.carrental.damagpenalty.controller;

import com.carrental.damagpenalty.dto.DamageReportDTO;
import com.carrental.damagpenalty.model.DamageReport;
import com.carrental.damagpenalty.model.DamageStatus;
import com.carrental.damagpenalty.service.DamageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/damage-reports")
@RequiredArgsConstructor
public class DamageController {
    
    private final DamageService damageService;
    
    @PostMapping
    public ResponseEntity<DamageReport> createDamageReport(
            @Valid @RequestBody DamageReportDTO dto) {
        DamageReport damage = damageService.createDamageReport(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(damage);
    }
    
    @GetMapping("/{damageId}")
    public ResponseEntity<DamageReport> getDamageReport(@PathVariable UUID damageId) {
        DamageReport damage = damageService.getDamageReport(damageId);
        return ResponseEntity.ok(damage);
    }
    
    @GetMapping
    public ResponseEntity<Page<DamageReport>> getDamageReports(
            @RequestParam(required = false) UUID vehicleId,
            @RequestParam(required = false) UUID rentalId,
            @RequestParam(required = false) DamageStatus status,
            Pageable pageable) {
        Page<DamageReport> damages = damageService.getDamageReports(
            vehicleId, rentalId, status, pageable);
        return ResponseEntity.ok(damages);
    }
    
    @PatchMapping("/{damageId}")
    public ResponseEntity<DamageReport> updateDamageStatus(
            @PathVariable UUID damageId,
            @RequestParam DamageStatus status,
            @RequestParam(required = false) BigDecimal repairCost) {
        DamageReport damage = damageService.updateDamageStatus(
            damageId, status, repairCost);
        return ResponseEntity.ok(damage);
    }
}
```

---

## 2. Rental Service (with State Pattern)

### Package Structure
```
src/main/java/com/carrental/rental/
├── controller/
│   └── RentalController.java
├── service/
│   └── RentalService.java
├── repository/
│   ├── RentalRepository.java
│   └── RentalStateHistoryRepository.java
├── model/
│   ├── Rental.java
│   └── RentalStateHistory.java
├── state/
│   ├── RentalState.java (interface)
│   ├── PendingState.java
│   ├── ConfirmedState.java
│   ├── InProgressState.java
│   ├── InspectionState.java
│   ├── CompletedState.java
│   ├── PenaltyDueState.java
│   └── CancelledState.java
├── dto/
│   └── RentalDTO.java
└── client/
    ├── VehicleServiceClient.java
    └── PaymentServiceClient.java
```

### Model: Rental.java

```java
package com.carrental.rental.model;

import com.carrental.rental.state.*;
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
@Table(name = "rentals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Rental {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "rental_id")
    private UUID rentalId;
    
    @Column(name = "customer_id", nullable = false)
    private UUID customerId;
    
    @Column(name = "vehicle_id", nullable = false)
    private UUID vehicleId;
    
    @Column(name = "booking_date")
    private LocalDateTime bookingDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "booking_type")
    private BookingType bookingType;
    
    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;
    
    @Column(name = "expected_end_date", nullable = false)
    private LocalDateTime expectedEndDate;
    
    @Column(name = "actual_end_date")
    private LocalDateTime actualEndDate;
    
    @Column(name = "pickup_location")
    private String pickupLocation;
    
    @Column(name = "return_location")
    private String returnLocation;
    
    @Column(name = "start_mileage")
    private Integer startMileage;
    
    @Column(name = "end_mileage")
    private Integer endMileage;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "rental_status")
    private RentalStatus rentalStatus;
    
    @Column(name = "daily_rate", precision = 10, scale = 2, nullable = false)
    private BigDecimal dailyRate;
    
    @Column(name = "total_days")
    private Integer totalDays;
    
    @Column(name = "subtotal", precision = 12, scale = 2)
    private BigDecimal subtotal;
    
    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount;
    
    @Column(name = "tax_amount", precision = 10, scale = 2)
    private BigDecimal taxAmount;
    
    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount;
    
    @Column(name = "deposit_amount", precision = 10, scale = 2)
    private BigDecimal depositAmount;
    
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Transient
    private RentalState state;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        bookingDate = LocalDateTime.now();
        rentalStatus = RentalStatus.PENDING;
        state = new PendingState();
        
        if (discountAmount == null) discountAmount = BigDecimal.ZERO;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    @PostLoad
    protected void onLoad() {
        // Restore state based on rental status
        state = switch (rentalStatus) {
            case PENDING -> new PendingState();
            case CONFIRMED -> new ConfirmedState();
            case IN_PROGRESS -> new InProgressState();
            case INSPECTION -> new InspectionState();
            case COMPLETED -> new CompletedState();
            case PENALTY_DUE -> new PenaltyDueState();
            case CANCELLED -> new CancelledState();
        };
    }
    
    // State pattern methods
    public void setState(RentalState newState) {
        this.state = newState;
        this.rentalStatus = newState.getStatus();
    }
    
    public boolean confirm() {
        return state.confirm(this);
    }
    
    public boolean pickup() {
        return state.pickup(this);
    }
    
    public boolean returnRental() {
        return state.returnRental(this);
    }
    
    public boolean completeInspection(boolean hasDamage) {
        return state.completeInspection(this, hasDamage);
    }
    
    public boolean payPenalty() {
        return state.payPenalty(this);
    }
    
    public boolean cancel() {
        return state.cancel(this);
    }
}

enum BookingType {
    ONLINE, WALK_IN
}

enum RentalStatus {
    PENDING, CONFIRMED, IN_PROGRESS, INSPECTION, 
    COMPLETED, PENALTY_DUE, CANCELLED
}
```

### State Interface and Implementations

```java
package com.carrental.rental.state;

import com.carrental.rental.model.Rental;
import com.carrental.rental.model.RentalStatus;

public interface RentalState {
    boolean confirm(Rental rental);
    boolean pickup(Rental rental);
    boolean returnRental(Rental rental);
    boolean completeInspection(Rental rental, boolean hasDamage);
    boolean payPenalty(Rental rental);
    boolean cancel(Rental rental);
    RentalStatus getStatus();
}

// PendingState.java
public class PendingState implements RentalState {
    @Override
    public boolean confirm(Rental rental) {
        rental.setState(new ConfirmedState());
        return true;
    }
    
    @Override
    public boolean pickup(Rental rental) {
        return false; // Must confirm first
    }
    
    @Override
    public boolean returnRental(Rental rental) {
        return false;
    }
    
    @Override
    public boolean completeInspection(Rental rental, boolean hasDamage) {
        return false;
    }
    
    @Override
    public boolean payPenalty(Rental rental) {
        return false;
    }
    
    @Override
    public boolean cancel(Rental rental) {
        rental.setState(new CancelledState());
        return true;
    }
    
    @Override
    public RentalStatus getStatus() {
        return RentalStatus.PENDING;
    }
}

// ConfirmedState.java
public class ConfirmedState implements RentalState {
    @Override
    public boolean confirm(Rental rental) {
        return false; // Already confirmed
    }
    
    @Override
    public boolean pickup(Rental rental) {
        rental.setState(new InProgressState());
        return true;
    }
    
    @Override
    public boolean returnRental(Rental rental) {
        return false;
    }
    
    @Override
    public boolean completeInspection(Rental rental, boolean hasDamage) {
        return false;
    }
    
    @Override
    public boolean payPenalty(Rental rental) {
        return false;
    }
    
    @Override
    public boolean cancel(Rental rental) {
        rental.setState(new CancelledState());
        return true;
    }
    
    @Override
    public RentalStatus getStatus() {
        return RentalStatus.CONFIRMED;
    }
}

// InProgressState.java
public class InProgressState implements RentalState {
    @Override
    public boolean confirm(Rental rental) {
        return false;
    }
    
    @Override
    public boolean pickup(Rental rental) {
        return false; // Already picked up
    }
    
    @Override
    public boolean returnRental(Rental rental) {
        rental.setState(new InspectionState());
        return true;
    }
    
    @Override
    public boolean completeInspection(Rental rental, boolean hasDamage) {
        return false;
    }
    
    @Override
    public boolean payPenalty(Rental rental) {
        return false;
    }
    
    @Override
    public boolean cancel(Rental rental) {
        return false; // Cannot cancel after pickup
    }
    
    @Override
    public RentalStatus getStatus() {
        return RentalStatus.IN_PROGRESS;
    }
}

// InspectionState.java
public class InspectionState implements RentalState {
    @Override
    public boolean confirm(Rental rental) {
        return false;
    }
    
    @Override
    public boolean pickup(Rental rental) {
        return false;
    }
    
    @Override
    public boolean returnRental(Rental rental) {
        return false; // Already returned
    }
    
    @Override
    public boolean completeInspection(Rental rental, boolean hasDamage) {
        if (hasDamage) {
            rental.setState(new PenaltyDueState());
        } else {
            rental.setState(new CompletedState());
        }
        return true;
    }
    
    @Override
    public boolean payPenalty(Rental rental) {
        return false;
    }
    
    @Override
    public boolean cancel(Rental rental) {
        return false;
    }
    
    @Override
    public RentalStatus getStatus() {
        return RentalStatus.INSPECTION;
    }
}

// CompletedState.java
public class CompletedState implements RentalState {
    @Override
    public boolean confirm(Rental rental) { return false; }
    
    @Override
    public boolean pickup(Rental rental) { return false; }
    
    @Override
    public boolean returnRental(Rental rental) { return false; }
    
    @Override
    public boolean completeInspection(Rental rental, boolean hasDamage) {
        return false;
    }
    
    @Override
    public boolean payPenalty(Rental rental) { return false; }
    
    @Override
    public boolean cancel(Rental rental) { return false; }
    
    @Override
    public RentalStatus getStatus() {
        return RentalStatus.COMPLETED;
    }
}

// PenaltyDueState.java
public class PenaltyDueState implements RentalState {
    @Override
    public boolean confirm(Rental rental) { return false; }
    
    @Override
    public boolean pickup(Rental rental) { return false; }
    
    @Override
    public boolean returnRental(Rental rental) { return false; }
    
    @Override
    public boolean completeInspection(Rental rental, boolean hasDamage) {
        return false;
    }
    
    @Override
    public boolean payPenalty(Rental rental) {
        rental.setState(new CompletedState());
        return true;
    }
    
    @Override
    public boolean cancel(Rental rental) { return false; }
    
    @Override
    public RentalStatus getStatus() {
        return RentalStatus.PENALTY_DUE;
    }
}
```

Tôi sẽ tiếp tục tạo file implementation cho các services còn lại...
