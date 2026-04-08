package com.carrental.statistics.event;

import com.carrental.statistics.model.PeriodType;
import com.carrental.statistics.service.StatisticsService;
import com.carrental.statistics.service.TransactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class RentalEventListener {
    
    private final TransactionService transactionService;
    private final StatisticsService statisticsService;
    
    @RabbitListener(queues = "rental.completed.queue")
    public void handleRentalCompleted(Map<String, Object> event) {
        log.info("Received rental.completed event: {}", event);
        
        String rentalId = (String) event.get("rentalId");
        String customerId = (String) event.get("customerId");
        String vehicleId = (String) event.get("vehicleId");
        
        Object totalCostObj = event.get("totalCost");
        BigDecimal totalCost = convertToBigDecimal(totalCostObj);
        
        // Create transaction
        transactionService.createTransaction(
                rentalId, customerId, vehicleId, null,
                "RENTAL", totalCost, "Rental completed"
        );
        
        // Update statistics
        LocalDateTime now = LocalDateTime.now();
        statisticsService.updateStatistics(PeriodType.MONTHLY, now.getYear(), now.getMonthValue());
    }
    
    @RabbitListener(queues = "payment.completed.queue")
    public void handlePaymentCompleted(Map<String, Object> event) {
        log.info("Received payment.completed event: {}", event);
        
        String paymentId = (String) event.get("paymentId");
        String rentalId = (String) event.get("rentalId");
        String customerId = (String) event.get("customerId");
        String paymentType = (String) event.get("paymentType");
        
        Object amountObj = event.get("amount");
        BigDecimal amount = convertToBigDecimal(amountObj);
        
        // Create transaction based on payment type
        transactionService.createTransaction(
                rentalId, customerId, null, paymentId,
                paymentType, amount, "Payment completed"
        );
        
        // Update statistics
        LocalDateTime now = LocalDateTime.now();
        statisticsService.updateStatistics(PeriodType.MONTHLY, now.getYear(), now.getMonthValue());
    }
    
    @RabbitListener(queues = "penalty.created.queue")
    public void handlePenaltyCreated(Map<String, Object> event) {
        log.info("Received penalty.created event: {}", event);
        
        String penaltyId = (String) event.get("penaltyId");
        String rentalId = (String) event.get("rentalId");
        String customerId = (String) event.get("customerId");
        
        Object amountObj = event.get("amount");
        BigDecimal amount = convertToBigDecimal(amountObj);
        
        // Create transaction
        transactionService.createTransaction(
                rentalId, customerId, null, penaltyId,
                "PENALTY", amount, "Penalty assessed"
        );
        
        // Update statistics
        LocalDateTime now = LocalDateTime.now();
        statisticsService.updateStatistics(PeriodType.MONTHLY, now.getYear(), now.getMonthValue());
    }
    
    private BigDecimal convertToBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Number) return BigDecimal.valueOf(((Number) value).doubleValue());
        if (value instanceof String) return new BigDecimal((String) value);
        return BigDecimal.ZERO;
    }
}
