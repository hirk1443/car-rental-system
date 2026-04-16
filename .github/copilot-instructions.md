# Copilot Instructions for Car Rental Management System

## Build and Run Commands

Each microservice is built and run independently from its directory:

```bash
# Build a service
cd services/<service-name>
mvn clean install

# Run a service
mvn spring-boot:run

# Run a single test class
mvn test -Dtest=YourTestClass

# Run a single test method
mvn test -Dtest=YourTestClass#methodName
```

**Service Ports:**
- damage-penalty-service: 8080
- rental-service: 8081
- payment-service: 8082
- statistics-service: 8083

**Required Infrastructure:**
- MySQL (port 3306) with databases: `damage_penalty_db`, `rental_db`, `payment_db`, `statistics_db`
- RabbitMQ (port 5672)
- Redis (port 6379) - only for statistics-service

## Architecture Overview

This is an **event-driven microservices** system with 4 independent Spring Boot services communicating via RabbitMQ.

### Service Responsibilities

| Service | Purpose |
|---------|---------|
| **rental-service** | Manages rental lifecycle using **State Pattern** (7 states: PENDING → CONFIRMED → IN_PROGRESS → INSPECTION → COMPLETED/PENALTY_DUE/CANCELLED) |
| **damage-penalty-service** | Handles damage reports and auto-creates penalties for MODERATE/MAJOR damages |
| **payment-service** | Processes payments (deposit, rental fee, penalty), manages invoices and refunds |
| **statistics-service** | Aggregates revenue statistics with **Redis caching** and **scheduled jobs** |

### Event Flow

All services communicate through RabbitMQ topic exchange `car-rental-exchange`:

```
rental.created → rental.confirmed → rental.pickup → rental.return
    → damage.reported → penalty.created → payment.completed → rental.completed
```

Statistics service listens to `rental.completed`, `payment.completed`, and `penalty.paid` events to update revenue data.

## Key Code Conventions

### Package Structure (per service)
```
com.carrental.{service}/
├── model/        # JPA entities + enums
├── repository/   # Spring Data JPA interfaces
├── service/      # Business logic with @Transactional
├── controller/   # REST endpoints with validation
├── dto/          # Request/Response DTOs (never expose entities directly)
├── event/        # RabbitMQ publishers and listeners
├── exception/    # Custom exceptions
└── config/       # Configuration beans (RabbitMQ, Redis, etc.)
```

### State Pattern Implementation (rental-service)

The rental lifecycle uses the State Pattern:

- `RentalState` interface defines actions: `confirm()`, `pickup()`, `returnVehicle()`, `completeInspection()`, `complete()`, `cancel()`
- Concrete states in `state/` package: `PendingState`, `ConfirmedState`, `InProgressState`, `InspectionState`, `CompletedState`, `PenaltyDueState`, `CancelledState`
- State transitions throw `IllegalStateException` for invalid operations
- All transitions are tracked in `RentalStateHistory` for audit

### RabbitMQ Event Publishing

Events are published via dedicated `*EventPublisher` classes:
```java
@Component
public class RentalEventPublisher {
    public void publishRentalCreated(Rental rental) {
        rabbitTemplate.convertAndSend(EXCHANGE, "rental.created", rental);
    }
}
```

### Redis Caching (statistics-service)

Uses `@Cacheable` with 1-hour TTL:
```java
@Cacheable(value = "monthlyRevenue", key = "#year + '-' + #month")
public RevenueReportDTO getMonthlyRevenue(int year, int month) { ... }
```

Cache is evicted by the scheduled job running at 2 AM daily.

### Auto-Calculations

- **Damage reports**: Repair cost = base cost × severity multiplier
- **Penalties**: Auto-created for MODERATE/MAJOR damage severity
- **Rentals**: Total cost calculated from daily rate × rental days

## Tech Stack

- Java 17, Spring Boot 3.2.0
- MySQL 8 (database-per-service pattern)
- RabbitMQ (event bus)
- Redis (caching)
- Lombok (boilerplate reduction)
- Jakarta Validation (request validation)
- Maven (build tool)
