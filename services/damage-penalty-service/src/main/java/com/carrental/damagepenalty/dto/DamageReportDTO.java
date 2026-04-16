package com.carrental.damagepenalty.dto;

import com.carrental.damagepenalty.model.DamageType;
import com.carrental.damagepenalty.model.DamageSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamageReportDTO {
    
    @NotBlank(message = "Vehicle ID is required")
    private String vehicleId;
    
    @NotBlank(message = "Rental ID is required")
    private String rentalId;
    
    @NotBlank(message = "Customer ID is required")
    private String customerId;
    
    @NotNull(message = "Damage type is required")
    private DamageType damageType;
    
    @NotNull(message = "Severity is required")
    private DamageSeverity severity;
    
    @NotBlank(message = "Description is required")
    private String description;
    
    private String locationOnVehicle;
    
    private List<String> imageUrls;
    
    private String reportedBy;
}
