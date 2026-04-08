package com.carrental.statistics.service;

import com.carrental.statistics.model.RentalTransaction;
import com.carrental.statistics.repository.RentalTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {
    
    private final RentalTransactionRepository transactionRepository;
    
    @Transactional
    public RentalTransaction createTransaction(String rentalId, String customerId, String vehicleId,
                                              String paymentId, String transactionType, BigDecimal amount, String notes) {
        log.info("Creating transaction: rental={}, type={}, amount={}", rentalId, transactionType, amount);
        
        RentalTransaction transaction = RentalTransaction.builder()
                .rentalId(rentalId)
                .customerId(customerId)
                .vehicleId(vehicleId)
                .paymentId(paymentId)
                .transactionType(transactionType)
                .amount(amount)
                .transactionDate(LocalDateTime.now())
                .notes(notes)
                .build();
        
        RentalTransaction saved = transactionRepository.save(transaction);
        log.info("Transaction created: {}", saved.getTransactionId());
        
        return saved;
    }
    
    @Transactional(readOnly = true)
    public List<RentalTransaction> getTransactionsByRental(String rentalId) {
        return transactionRepository.findByRentalId(rentalId);
    }
    
    @Transactional(readOnly = true)
    public Page<RentalTransaction> getTransactionsByCustomer(String customerId, Pageable pageable) {
        return transactionRepository.findByCustomerId(customerId, pageable);
    }
    
    @Transactional(readOnly = true)
    public List<RentalTransaction> getTransactionsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return transactionRepository.findByDateRange(startDate, endDate);
    }
}
