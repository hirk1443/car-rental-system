package com.carrental.statistics.service;

import com.carrental.statistics.dto.RevenueReportDTO;
import com.carrental.statistics.model.PeriodType;
import com.carrental.statistics.model.RevenueStatistics;
import com.carrental.statistics.repository.RevenueStatisticsRepository;
import com.carrental.statistics.repository.RentalTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatisticsService {
    
    private final RevenueStatisticsRepository statisticsRepository;
    private final RentalTransactionRepository transactionRepository;
    
    @Transactional
    public RevenueStatistics updateStatistics(PeriodType periodType, int year, int period) {
        log.info("Updating statistics: {} - Year: {}, Period: {}", periodType, year, period);
        
        Optional<RevenueStatistics> existing = statisticsRepository
                .findByPeriodTypeAndYearAndPeriod(periodType, year, period);
        
        RevenueStatistics stats = existing.orElse(RevenueStatistics.builder()
                .periodType(periodType)
                .year(year)
                .period(period)
                .build());
        
        LocalDateTime[] dateRange = calculateDateRange(periodType, year, period);
        stats.setPeriodStart(dateRange[0]);
        stats.setPeriodEnd(dateRange[1]);
        
        // Calculate revenue from transactions
        BigDecimal rentalRev = transactionRepository.sumAmountByTypeAndDateRange("RENTAL", dateRange[0], dateRange[1]);
        BigDecimal depositRev = transactionRepository.sumAmountByTypeAndDateRange("DEPOSIT", dateRange[0], dateRange[1]);
        BigDecimal penaltyRev = transactionRepository.sumAmountByTypeAndDateRange("PENALTY", dateRange[0], dateRange[1]);
        BigDecimal refundAmt = transactionRepository.sumAmountByTypeAndDateRange("REFUND", dateRange[0], dateRange[1]);
        
        stats.setRentalRevenue(rentalRev != null ? rentalRev : BigDecimal.ZERO);
        stats.setDepositRevenue(depositRev != null ? depositRev : BigDecimal.ZERO);
        stats.setPenaltyRevenue(penaltyRev != null ? penaltyRev : BigDecimal.ZERO);
        stats.setRefundAmount(refundAmt != null ? refundAmt : BigDecimal.ZERO);
        
        // Calculate counts
        long completedCount = transactionRepository.countByTypeAndDateRange("RENTAL", dateRange[0], dateRange[1]);
        long cancelledCount = transactionRepository.countByTypeAndDateRange("CANCELLED", dateRange[0], dateRange[1]);
        long penaltyCount = transactionRepository.countByTypeAndDateRange("PENALTY", dateRange[0], dateRange[1]);
        
        stats.setCompletedRentals((int) completedCount);
        stats.setCancelledRentals((int) cancelledCount);
        stats.setTotalRentals((int) (completedCount + cancelledCount));
        stats.setTotalPenalties((int) penaltyCount);
        
        stats.calculateTotalRevenue();
        stats.calculateNetRevenue();
        
        RevenueStatistics saved = statisticsRepository.save(stats);
        log.info("Statistics updated successfully for {} {}/{}", periodType, year, period);
        
        return saved;
    }
    
    @Cacheable(value = "monthlyRevenue", key = "#year + '-' + #month")
    @Transactional(readOnly = true)
    public RevenueReportDTO getMonthlyRevenue(int year, int month) {
        log.info("Getting monthly revenue: {}/{}", year, month);
        
        Optional<RevenueStatistics> stats = statisticsRepository
                .findByPeriodTypeAndYearAndPeriod(PeriodType.MONTHLY, year, month);
        
        if (stats.isEmpty()) {
            // Auto-generate if not exists
            RevenueStatistics generated = updateStatistics(PeriodType.MONTHLY, year, month);
            return convertToDTO(generated);
        }
        
        return convertToDTO(stats.get());
    }
    
    @Cacheable(value = "quarterlyRevenue", key = "#year + '-Q' + #quarter")
    @Transactional(readOnly = true)
    public RevenueReportDTO getQuarterlyRevenue(int year, int quarter) {
        log.info("Getting quarterly revenue: {}/Q{}", year, quarter);
        
        Optional<RevenueStatistics> stats = statisticsRepository
                .findByPeriodTypeAndYearAndPeriod(PeriodType.QUARTERLY, year, quarter);
        
        if (stats.isEmpty()) {
            RevenueStatistics generated = updateStatistics(PeriodType.QUARTERLY, year, quarter);
            return convertToDTO(generated);
        }
        
        return convertToDTO(stats.get());
    }
    
    @Cacheable(value = "yearlyRevenue", key = "#year")
    @Transactional(readOnly = true)
    public RevenueReportDTO getYearlyRevenue(int year) {
        log.info("Getting yearly revenue: {}", year);
        
        Optional<RevenueStatistics> stats = statisticsRepository
                .findByPeriodTypeAndYearAndPeriod(PeriodType.YEARLY, year, 1);
        
        if (stats.isEmpty()) {
            RevenueStatistics generated = updateStatistics(PeriodType.YEARLY, year, 1);
            return convertToDTO(generated);
        }
        
        return convertToDTO(stats.get());
    }
    
    @Transactional(readOnly = true)
    public List<RevenueReportDTO> getMonthlyRevenueByYear(int year) {
        log.info("Getting all monthly revenue for year: {}", year);
        List<RevenueStatistics> statsList = statisticsRepository.findByPeriodTypeAndYear(PeriodType.MONTHLY, year);
        return statsList.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<RevenueReportDTO> getQuarterlyRevenueByYear(int year) {
        log.info("Getting all quarterly revenue for year: {}", year);
        List<RevenueStatistics> statsList = statisticsRepository.findByPeriodTypeAndYear(PeriodType.QUARTERLY, year);
        return statsList.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<RevenueReportDTO> getAllYearlyRevenue() {
        log.info("Getting all yearly revenue");
        List<RevenueStatistics> statsList = statisticsRepository.findAllYearlyStatistics();
        return statsList.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    @Scheduled(cron = "0 0 2 * * ?") // Run at 2 AM every day
    @CacheEvict(value = {"monthlyRevenue", "quarterlyRevenue", "yearlyRevenue"}, allEntries = true)
    @Transactional
    public void scheduledStatisticsUpdate() {
        log.info("Running scheduled statistics update");
        
        LocalDateTime now = LocalDateTime.now();
        int currentYear = now.getYear();
        int currentMonth = now.getMonthValue();
        int currentQuarter = (currentMonth - 1) / 3 + 1;
        
        // Update current month
        updateStatistics(PeriodType.MONTHLY, currentYear, currentMonth);
        
        // Update current quarter
        updateStatistics(PeriodType.QUARTERLY, currentYear, currentQuarter);
        
        // Update current year
        updateStatistics(PeriodType.YEARLY, currentYear, 1);
        
        log.info("Scheduled statistics update completed");
    }
    
    private LocalDateTime[] calculateDateRange(PeriodType periodType, int year, int period) {
        LocalDateTime start, end;
        
        switch (periodType) {
            case MONTHLY:
                YearMonth yearMonth = YearMonth.of(year, period);
                start = yearMonth.atDay(1).atStartOfDay();
                end = yearMonth.atEndOfMonth().atTime(23, 59, 59);
                break;
                
            case QUARTERLY:
                int startMonth = (period - 1) * 3 + 1;
                int endMonth = startMonth + 2;
                start = YearMonth.of(year, startMonth).atDay(1).atStartOfDay();
                end = YearMonth.of(year, endMonth).atEndOfMonth().atTime(23, 59, 59);
                break;
                
            case YEARLY:
                start = LocalDateTime.of(year, 1, 1, 0, 0, 0);
                end = LocalDateTime.of(year, 12, 31, 23, 59, 59);
                break;
                
            default:
                throw new IllegalArgumentException("Invalid period type: " + periodType);
        }
        
        return new LocalDateTime[]{start, end};
    }
    
    private RevenueReportDTO convertToDTO(RevenueStatistics stats) {
        String period = formatPeriod(stats.getPeriodType(), stats.getYear(), stats.getPeriod());
        
        return RevenueReportDTO.builder()
                .period(period)
                .totalRevenue(stats.getTotalRevenue())
                .rentalRevenue(stats.getRentalRevenue())
                .depositRevenue(stats.getDepositRevenue())
                .penaltyRevenue(stats.getPenaltyRevenue())
                .refundAmount(stats.getRefundAmount())
                .netRevenue(stats.getNetRevenue())
                .totalRentals(stats.getTotalRentals())
                .completedRentals(stats.getCompletedRentals())
                .cancelledRentals(stats.getCancelledRentals())
                .totalPenalties(stats.getTotalPenalties())
                .build();
    }
    
    private String formatPeriod(PeriodType periodType, int year, int period) {
        return switch (periodType) {
            case MONTHLY -> String.format("%d-%02d", year, period);
            case QUARTERLY -> String.format("%d-Q%d", year, period);
            case YEARLY -> String.valueOf(year);
        };
    }
}
