# Development Guide - Car Rental System (Java)

## Table of Contents
1. [Project Setup](#project-setup)
2. [Development Environment](#development-environment)
3. [Building Services](#building-services)
4. [Running Locally](#running-locally)
5. [Testing](#testing)
6. [Docker Deployment](#docker-deployment)
7. [Kubernetes Deployment](#kubernetes-deployment)

---

## 1. Project Setup

### Prerequisites
- JDK 17 or higher
- Maven 3.8+ or Gradle 7.5+
- Docker Desktop
- PostgreSQL 15
- RabbitMQ 3.x
- Redis 7.x
- kubectl CLI
- IDE (IntelliJ IDEA recommended)

### Clone and Initialize

```bash
cd C:\Coding_Stuff\car-rental-system

# Create Maven projects for each service
mvn archetype:generate -DgroupId=com.carrental -DartifactId=damage-penalty-service -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false

# Or use Spring Initializr
# Visit https://start.spring.io and create projects with:
# - Spring Boot 3.2.x
# - Dependencies: Web, Data JPA, PostgreSQL, AMQP, Cache, Redis, Lombok, Validation
```

### Project Structure per Service

```
damage-penalty-service/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── carrental/
│   │   │           └── damagpenalty/
│   │   │               ├── DamagePenaltyServiceApplication.java
│   │   │               ├── controller/
│   │   │               ├── service/
│   │   │               ├── repository/
│   │   │               ├── model/
│   │   │               ├── dto/
│   │   │               ├── event/
│   │   │               ├── exception/
│   │   │               └── config/
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       └── db/
│   │           └── migration/ (Flyway migrations)
│   └── test/
│       └── java/
│           └── com/
│               └── carrental/
│                   └── damagpenalty/
├── Dockerfile
├── pom.xml
└── README.md
```

---

## 2. Development Environment

### IDE Setup (IntelliJ IDEA)

1. **Install Plugins**:
   - Lombok Plugin
   - Spring Boot
   - Docker
   - Database Tools

2. **Enable Annotation Processing**:
   - Settings → Build, Execution, Deployment → Compiler → Annotation Processors
   - Check "Enable annotation processing"

3. **Configure Database Connection**:
   - Open Database Tool Window
   - Add PostgreSQL data sources for each service

### Environment Variables

Create `.env` file in each service directory:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=damage_penalty_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=your-secret-key-here
```

---

## 3. Building Services

### Maven Build

```bash
# Build all services
cd services/damage-penalty-service
mvn clean install

cd ../rental-service
mvn clean install

cd ../payment-service
mvn clean install

cd ../statistics-service
mvn clean install

# Build with tests skipped
mvn clean install -DskipTests

# Build Docker image
mvn spring-boot:build-image
```

### Gradle Build (Alternative)

```bash
# build.gradle
plugins {
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.0'
    id 'java'
}

group = 'com.carrental'
version = '1.0.0'
sourceCompatibility = '17'

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-amqp'
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springframework.boot:spring-boot-starter-cache'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    runtimeOnly 'org.postgresql:postgresql'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

# Build command
./gradlew clean build
```

---

## 4. Running Locally

### Start Infrastructure Services

```bash
# Start PostgreSQL
docker run -d --name postgres-damage-penalty \
  -e POSTGRES_DB=damage_penalty_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15-alpine

# Start RabbitMQ
docker run -d --name rabbitmq \
  -e RABBITMQ_DEFAULT_USER=guest \
  -e RABBITMQ_DEFAULT_PASS=guest \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management-alpine

# Start Redis
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine

# Or use docker-compose (recommended)
docker-compose up -d
```

### docker-compose.yml for Local Development

```yaml
version: '3.8'

services:
  postgres-damage-penalty:
    image: postgres:15-alpine
    container_name: postgres-damage-penalty
    environment:
      POSTGRES_DB: damage_penalty_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres-damage-penalty-data:/var/lib/postgresql/data

  postgres-rental:
    image: postgres:15-alpine
    container_name: postgres-rental
    environment:
      POSTGRES_DB: rental_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - postgres-rental-data:/var/lib/postgresql/data

  postgres-payment:
    image: postgres:15-alpine
    container_name: postgres-payment
    environment:
      POSTGRES_DB: payment_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5434:5432"
    volumes:
      - postgres-payment-data:/var/lib/postgresql/data

  postgres-statistics:
    image: postgres:15-alpine
    container_name: postgres-statistics
    environment:
      POSTGRES_DB: statistics_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5435:5432"
    volumes:
      - postgres-statistics-data:/var/lib/postgresql/data

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq

  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  postgres-damage-penalty-data:
  postgres-rental-data:
  postgres-payment-data:
  postgres-statistics-data:
  rabbitmq-data:
  redis-data:
```

### Run Services

```bash
# Terminal 1: Damage-Penalty Service
cd services/damage-penalty-service
mvn spring-boot:run

# Terminal 2: Rental Service
cd services/rental-service
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081

# Terminal 3: Payment Service
cd services/payment-service
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8082

# Terminal 4: Statistics Service
cd services/statistics-service
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8083
```

### Verify Services are Running

```bash
# Check health endpoints
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
curl http://localhost:8083/actuator/health

# Check RabbitMQ Management UI
# Open browser: http://localhost:15672
# Login: guest/guest
```

---

## 5. Testing

### Unit Tests

```java
package com.carrental.damagpenalty.service;

import com.carrental.damagpenalty.dto.DamageReportDTO;
import com.carrental.damagpenalty.model.*;
import com.carrental.damagpenalty.repository.DamageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DamageServiceTest {
    
    @Mock
    private DamageRepository damageRepository;
    
    @Mock
    private PenaltyService penaltyService;
    
    @Mock
    private DamageEventPublisher eventPublisher;
    
    @InjectMocks
    private DamageService damageService;
    
    private DamageReportDTO damageDTO;
    
    @BeforeEach
    void setUp() {
        damageDTO = DamageReportDTO.builder()
            .vehicleId(UUID.randomUUID())
            .rentalId(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .damageType(DamageType.SCRATCH)
            .severity(DamageSeverity.MINOR)
            .description("Test damage")
            .locationOnVehicle("FRONT_BUMPER")
            .reportedBy("STAFF")
            .build();
    }
    
    @Test
    void testCreateDamageReport_Success() {
        // Arrange
        DamageReport expectedDamage = DamageReport.builder()
            .damageId(UUID.randomUUID())
            .vehicleId(damageDTO.getVehicleId())
            .repairCost(new BigDecimal("500000"))
            .build();
        
        when(damageRepository.save(any(DamageReport.class)))
            .thenReturn(expectedDamage);
        
        // Act
        DamageReport result = damageService.createDamageReport(damageDTO);
        
        // Assert
        assertNotNull(result);
        assertEquals(expectedDamage.getDamageId(), result.getDamageId());
        verify(damageRepository, times(1)).save(any(DamageReport.class));
        verify(eventPublisher, times(1)).publishDamageReported(any(DamageReport.class));
    }
    
    @Test
    void testCalculateRepairCost_Scratch_Minor() {
        // Arrange
        DamageReport damage = DamageReport.builder()
            .damageType(DamageType.SCRATCH)
            .severity(DamageSeverity.MINOR)
            .build();
        
        // Act
        BigDecimal cost = damage.calculateRepairCost();
        
        // Assert
        assertEquals(new BigDecimal("500000"), cost);
    }
}
```

### Integration Tests

```java
package com.carrental.damagpenalty.integration;

import com.carrental.damagpenalty.dto.DamageReportDTO;
import com.carrental.damagpenalty.model.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class DamageControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Test
    void testCreateDamageReport() throws Exception {
        DamageReportDTO dto = DamageReportDTO.builder()
            .vehicleId(UUID.randomUUID())
            .rentalId(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .damageType(DamageType.SCRATCH)
            .severity(DamageSeverity.MINOR)
            .description("Test damage")
            .locationOnVehicle("FRONT_BUMPER")
            .reportedBy("STAFF")
            .build();
        
        mockMvc.perform(post("/api/damage-reports")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.damageId").exists())
            .andExpect(jsonPath("$.damageType").value("SCRATCH"));
    }
}
```

### Run Tests

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=DamageServiceTest

# Run with coverage
mvn test jacoco:report

# Integration tests only
mvn verify -P integration-tests
```

---

## 6. Docker Deployment

### Dockerfile for Each Service

```dockerfile
# services/damage-penalty-service/Dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY target/damage-penalty-service-1.0.0.jar app.jar

EXPOSE 8080

ENV JAVA_OPTS=""

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### Build Docker Images

```bash
# Build service JAR first
cd services/damage-penalty-service
mvn clean package -DskipTests

# Build Docker image
docker build -t car-rental/damage-penalty-service:latest .

# Or use Maven plugin
mvn spring-boot:build-image -Dspring-boot.build-image.imageName=car-rental/damage-penalty-service:latest
```

### docker-compose.yml for Full System

```yaml
version: '3.8'

services:
  # Databases
  postgres-damage-penalty:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: damage_penalty_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres-damage-penalty-data:/var/lib/postgresql/data
    networks:
      - car-rental-network

  postgres-rental:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rental_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres-rental-data:/var/lib/postgresql/data
    networks:
      - car-rental-network

  # Message Queue
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"
      - "15672:15672"
    networks:
      - car-rental-network

  # Cache
  redis:
    image: redis:7-alpine
    networks:
      - car-rental-network

  # Services
  damage-penalty-service:
    image: car-rental/damage-penalty-service:latest
    environment:
      DATABASE_HOST: postgres-damage-penalty
      DATABASE_PORT: 5432
      DATABASE_NAME: damage_penalty_db
      DATABASE_USER: postgres
      DATABASE_PASSWORD: postgres
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "8080:8080"
    depends_on:
      - postgres-damage-penalty
      - rabbitmq
      - redis
    networks:
      - car-rental-network

  rental-service:
    image: car-rental/rental-service:latest
    environment:
      DATABASE_HOST: postgres-rental
      DATABASE_PORT: 5432
      DATABASE_NAME: rental_db
      DATABASE_USER: postgres
      DATABASE_PASSWORD: postgres
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
    ports:
      - "8081:8080"
    depends_on:
      - postgres-rental
      - rabbitmq
    networks:
      - car-rental-network

  payment-service:
    image: car-rental/payment-service:latest
    environment:
      DATABASE_HOST: postgres-payment
      DATABASE_PORT: 5432
      DATABASE_NAME: payment_db
      DATABASE_USER: postgres
      DATABASE_PASSWORD: postgres
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
    ports:
      - "8082:8080"
    depends_on:
      - postgres-payment
      - rabbitmq
    networks:
      - car-rental-network

  statistics-service:
    image: car-rental/statistics-service:latest
    environment:
      DATABASE_HOST: postgres-statistics
      DATABASE_PORT: 5432
      DATABASE_NAME: statistics_db
      DATABASE_USER: postgres
      DATABASE_PASSWORD: postgres
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "8083:8080"
    depends_on:
      - postgres-statistics
      - rabbitmq
      - redis
    networks:
      - car-rental-network

networks:
  car-rental-network:
    driver: bridge

volumes:
  postgres-damage-penalty-data:
  postgres-rental-data:
  postgres-payment-data:
  postgres-statistics-data:
  rabbitmq-data:
  redis-data:
```

### Start Full System

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## 7. Kubernetes Deployment

See [KUBERNETES_GUIDE.md](KUBERNETES_GUIDE.md) for detailed Kubernetes deployment instructions.

### Quick Start

```bash
# Create namespace
kubectl apply -f infrastructure/k8s/namespace.yaml

# Deploy infrastructure
kubectl apply -f infrastructure/k8s/postgres/
kubectl apply -f infrastructure/k8s/rabbitmq/
kubectl apply -f infrastructure/k8s/redis/

# Deploy services
kubectl apply -f services/damage-penalty-service/k8s/
kubectl apply -f services/rental-service/k8s/
kubectl apply -f services/payment-service/k8s/
kubectl apply -f services/statistics-service/k8s/

# Check status
kubectl get pods -n car-rental
kubectl get services -n car-rental
```

---

## Common Development Tasks

### Add New Endpoint

1. Create DTO class
2. Add method to Service class
3. Add method to Controller class
4. Write unit tests
5. Update API documentation

### Add New Event

1. Define event structure
2. Create event publisher method
3. Create event listener in consuming service
4. Configure RabbitMQ queue bindings
5. Test event flow

### Database Migration (Flyway)

```sql
-- src/main/resources/db/migration/V1__initial_schema.sql
CREATE TABLE damage_reports (
    damage_id UUID PRIMARY KEY,
    vehicle_id UUID NOT NULL,
    ...
);
```

### Monitoring and Troubleshooting

```bash
# View service logs
kubectl logs -f <pod-name> -n car-rental

# Execute SQL in pod
kubectl exec -it postgres-damage-penalty-0 -n car-rental -- psql -U postgres -d damage_penalty_db

# Port forward to local
kubectl port-forward service/damage-penalty-service 8080:80 -n car-rental

# Check RabbitMQ queues
kubectl port-forward service/rabbitmq-service 15672:15672 -n car-rental
# Open http://localhost:15672
```

---

## Best Practices

1. **Always use DTOs for API endpoints** - Never expose entity classes directly
2. **Use @Transactional appropriately** - Read-only for queries, default for modifications
3. **Implement proper exception handling** - Use @ControllerAdvice
4. **Write comprehensive tests** - Unit tests for business logic, integration tests for APIs
5. **Use Lombok wisely** - Avoid @Data on entities, prefer specific annotations
6. **Keep services stateless** - Store state in database or cache
7. **Use events for inter-service communication** - Avoid direct HTTP calls when possible
8. **Implement circuit breakers** - Use Resilience4j for fault tolerance
9. **Monitor everything** - Use Spring Boot Actuator + Prometheus
10. **Document APIs** - Use Swagger/OpenAPI

---

## Next Steps

1. Implement remaining microservices (Customer, Vehicle, Partner)
2. Add API Gateway (Spring Cloud Gateway)
3. Implement authentication and authorization (Spring Security + JWT)
4. Add distributed tracing (Spring Cloud Sleuth + Zipkin)
5. Implement service discovery (Eureka or Consul)
6. Add comprehensive monitoring (ELK Stack)
7. Set up CI/CD pipeline (Jenkins, GitLab CI, or GitHub Actions)
