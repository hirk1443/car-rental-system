package com.carrental.statistics.repository;

import com.carrental.statistics.model.RevenueStatistics;
import com.carrental.statistics.model.PeriodType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RevenueStatisticsRepository extends JpaRepository<RevenueStatistics, String> {
    
    Optional<RevenueStatistics> findByPeriodTypeAndYearAndPeriod(PeriodType periodType, Integer year, Integer period);
    
    List<RevenueStatistics> findByPeriodTypeAndYear(PeriodType periodType, Integer year);
    
    List<RevenueStatistics> findByPeriodTypeOrderByYearDescPeriodDesc(PeriodType periodType);
    
    @Query("SELECT r FROM RevenueStatistics r WHERE r.periodType = :periodType AND r.year = :year ORDER BY r.period")
    List<RevenueStatistics> findStatisticsByYear(PeriodType periodType, Integer year);
    
    @Query("SELECT r FROM RevenueStatistics r WHERE r.periodType = 'YEARLY' ORDER BY r.year DESC")
    List<RevenueStatistics> findAllYearlyStatistics();
}
