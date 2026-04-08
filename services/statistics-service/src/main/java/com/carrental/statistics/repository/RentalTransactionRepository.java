package com.carrental.statistics.repository;

import com.carrental.statistics.model.RentalTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RentalTransactionRepository extends JpaRepository<RentalTransaction, String> {
    
    List<RentalTransaction> findByRentalId(String rentalId);
    
    Page<RentalTransaction> findByCustomerId(String customerId, Pageable pageable);
    
    @Query("SELECT rt FROM RentalTransaction rt WHERE rt.transactionDate BETWEEN :startDate AND :endDate")
    List<RentalTransaction> findByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT SUM(rt.amount) FROM RentalTransaction rt WHERE rt.transactionType = :type AND rt.transactionDate BETWEEN :startDate AND :endDate")
    BigDecimal sumAmountByTypeAndDateRange(String type, LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT COUNT(rt) FROM RentalTransaction rt WHERE rt.transactionType = :type AND rt.transactionDate BETWEEN :startDate AND :endDate")
    long countByTypeAndDateRange(String type, LocalDateTime startDate, LocalDateTime endDate);
}
