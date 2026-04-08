package com.carrental.statistics.controller;

import com.carrental.statistics.dto.RevenueReportDTO;
import com.carrental.statistics.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {
    
    private final StatisticsService statisticsService;
    
    @GetMapping("/revenue/monthly/{year}/{month}")
    public ResponseEntity<RevenueReportDTO> getMonthlyRevenue(
            @PathVariable int year,
            @PathVariable int month) {
        RevenueReportDTO report = statisticsService.getMonthlyRevenue(year, month);
        return ResponseEntity.ok(report);
    }
    
    @GetMapping("/revenue/monthly/{year}")
    public ResponseEntity<List<RevenueReportDTO>> getMonthlyRevenueByYear(@PathVariable int year) {
        List<RevenueReportDTO> reports = statisticsService.getMonthlyRevenueByYear(year);
        return ResponseEntity.ok(reports);
    }
    
    @GetMapping("/revenue/quarterly/{year}/{quarter}")
    public ResponseEntity<RevenueReportDTO> getQuarterlyRevenue(
            @PathVariable int year,
            @PathVariable int quarter) {
        RevenueReportDTO report = statisticsService.getQuarterlyRevenue(year, quarter);
        return ResponseEntity.ok(report);
    }
    
    @GetMapping("/revenue/quarterly/{year}")
    public ResponseEntity<List<RevenueReportDTO>> getQuarterlyRevenueByYear(@PathVariable int year) {
        List<RevenueReportDTO> reports = statisticsService.getQuarterlyRevenueByYear(year);
        return ResponseEntity.ok(reports);
    }
    
    @GetMapping("/revenue/yearly/{year}")
    public ResponseEntity<RevenueReportDTO> getYearlyRevenue(@PathVariable int year) {
        RevenueReportDTO report = statisticsService.getYearlyRevenue(year);
        return ResponseEntity.ok(report);
    }
    
    @GetMapping("/revenue/yearly")
    public ResponseEntity<List<RevenueReportDTO>> getAllYearlyRevenue() {
        List<RevenueReportDTO> reports = statisticsService.getAllYearlyRevenue();
        return ResponseEntity.ok(reports);
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<String> refreshStatistics() {
        statisticsService.scheduledStatisticsUpdate();
        return ResponseEntity.ok("Statistics refreshed successfully");
    }
}
