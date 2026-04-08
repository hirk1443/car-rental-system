# State Pattern - Vehicle Rental State Management

## Tổng quan (Overview)

State Pattern được sử dụng để quản lý các trạng thái khác nhau của xe và quá trình thuê xe, đảm bảo các chuyển đổi trạng thái hợp lệ và logic nghiệp vụ đúng đắn.

## Vehicle State Machine

### Các trạng thái của xe (Vehicle States)

```
┌─────────────────┐
│  AVAILABLE      │ ←──────────────┐
└────────┬────────┘                │
         │ book()                  │ complete_rental()
         ↓                         │
┌─────────────────┐                │
│  RESERVED       │                │
└────────┬────────┘                │
         │ pickup()               │
         ↓                         │
┌─────────────────┐                │
│  IN_USE         │ ───────────────┘
└────────┬────────┘
         │ return()
         ↓
┌─────────────────┐
│  INSPECTION     │
└────────┬────────┘
         │ approve() OR damage_found()
         ├─────────────┐
         │             │
         ↓             ↓
┌─────────────┐  ┌────────────┐
│ AVAILABLE   │  │  DAMAGED   │
└─────────────┘  └──────┬─────┘
                        │ repair()
                        ↓
                 ┌─────────────┐
                 │ MAINTENANCE │
                 └──────┬──────┘
                        │ complete_maintenance()
                        ↓
                 ┌─────────────┐
                 │ AVAILABLE   │
                 └─────────────┘
```

## Rental State Machine

### Các trạng thái của Rental (Rental States)

```
┌─────────────────┐
│  PENDING        │ (Booking created)
└────────┬────────┘
         │ confirm_booking()
         ↓
┌─────────────────┐
│  CONFIRMED      │ (Payment deposit completed)
└────────┬────────┘
         │ pickup_vehicle()
         ↓
┌─────────────────┐
│  IN_PROGRESS    │ (Customer picked up vehicle)
└────────┬────────┘
         │ return_vehicle()
         ↓
┌─────────────────┐
│  INSPECTION     │ (Vehicle returned, being inspected)
└────────┬────────┘
         │ complete_inspection()
         ├─────────────────┐
         │                 │
         ↓                 ↓
┌─────────────┐    ┌──────────────┐
│  COMPLETED  │    │ PENALTY_DUE  │ (Damages found)
└─────────────┘    └──────┬───────┘
                          │ pay_penalty()
                          ↓
                   ┌──────────────┐
                   │  COMPLETED   │
                   └──────────────┘

Cancel flow:
PENDING/CONFIRMED → cancel() → CANCELLED
```

## Implementation - Vehicle State Pattern

### Interface: VehicleState

```python
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.vehicle import Vehicle

class VehicleState(ABC):
    """Abstract base class for vehicle states"""
    
    @abstractmethod
    def reserve(self, vehicle: 'Vehicle') -> bool:
        """Reserve the vehicle"""
        pass
    
    @abstractmethod
    def pickup(self, vehicle: 'Vehicle') -> bool:
        """Pickup the vehicle"""
        pass
    
    @abstractmethod
    def return_vehicle(self, vehicle: 'Vehicle') -> bool:
        """Return the vehicle"""
        pass
    
    @abstractmethod
    def mark_damaged(self, vehicle: 'Vehicle') -> bool:
        """Mark vehicle as damaged"""
        pass
    
    @abstractmethod
    def start_maintenance(self, vehicle: 'Vehicle') -> bool:
        """Start maintenance"""
        pass
    
    @abstractmethod
    def complete_maintenance(self, vehicle: 'Vehicle') -> bool:
        """Complete maintenance"""
        pass
    
    @abstractmethod
    def approve_inspection(self, vehicle: 'Vehicle') -> bool:
        """Approve inspection after return"""
        pass
    
    @abstractmethod
    def get_state_name(self) -> str:
        """Get the name of current state"""
        pass
```

### Concrete States

```python
class AvailableState(VehicleState):
    """Vehicle is available for rent"""
    
    def reserve(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(ReservedState())
        return True
    
    def pickup(self, vehicle: 'Vehicle') -> bool:
        # Cannot pickup directly, must reserve first
        return False
    
    def return_vehicle(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def mark_damaged(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(DamagedState())
        return True
    
    def start_maintenance(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(MaintenanceState())
        return True
    
    def complete_maintenance(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def approve_inspection(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def get_state_name(self) -> str:
        return "AVAILABLE"


class ReservedState(VehicleState):
    """Vehicle is reserved for a customer"""
    
    def reserve(self, vehicle: 'Vehicle') -> bool:
        # Already reserved
        return False
    
    def pickup(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(InUseState())
        return True
    
    def return_vehicle(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def mark_damaged(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(DamagedState())
        return True
    
    def start_maintenance(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def complete_maintenance(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def approve_inspection(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def get_state_name(self) -> str:
        return "RESERVED"


class InUseState(VehicleState):
    """Vehicle is currently in use by customer"""
    
    def reserve(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def pickup(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def return_vehicle(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(InspectionState())
        return True
    
    def mark_damaged(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(DamagedState())
        return True
    
    def start_maintenance(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def complete_maintenance(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def approve_inspection(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def get_state_name(self) -> str:
        return "IN_USE"


class InspectionState(VehicleState):
    """Vehicle is being inspected after return"""
    
    def reserve(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def pickup(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def return_vehicle(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def mark_damaged(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(DamagedState())
        return True
    
    def start_maintenance(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(MaintenanceState())
        return True
    
    def complete_maintenance(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def approve_inspection(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(AvailableState())
        return True
    
    def get_state_name(self) -> str:
        return "INSPECTION"


class DamagedState(VehicleState):
    """Vehicle has damage and needs repair"""
    
    def reserve(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def pickup(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def return_vehicle(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def mark_damaged(self, vehicle: 'Vehicle') -> bool:
        return False  # Already damaged
    
    def start_maintenance(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(MaintenanceState())
        return True
    
    def complete_maintenance(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def approve_inspection(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def get_state_name(self) -> str:
        return "DAMAGED"


class MaintenanceState(VehicleState):
    """Vehicle is under maintenance"""
    
    def reserve(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def pickup(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def return_vehicle(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def mark_damaged(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def start_maintenance(self, vehicle: 'Vehicle') -> bool:
        return False  # Already in maintenance
    
    def complete_maintenance(self, vehicle: 'Vehicle') -> bool:
        vehicle.set_state(AvailableState())
        return True
    
    def approve_inspection(self, vehicle: 'Vehicle') -> bool:
        return False
    
    def get_state_name(self) -> str:
        return "MAINTENANCE"
```

### Context: Vehicle Model

```python
from typing import Optional
from datetime import datetime

class Vehicle:
    def __init__(self, vehicle_id: str, license_plate: str):
        self.vehicle_id = vehicle_id
        self.license_plate = license_plate
        self._state: VehicleState = AvailableState()
        self._state_history = []
    
    def set_state(self, state: VehicleState):
        """Set new state and track history"""
        old_state = self._state.get_state_name() if self._state else None
        self._state = state
        new_state = state.get_state_name()
        
        # Track state transition
        self._state_history.append({
            'from_state': old_state,
            'to_state': new_state,
            'timestamp': datetime.now()
        })
        
        # Persist to database
        self._save_state_transition(old_state, new_state)
    
    def get_state(self) -> VehicleState:
        return self._state
    
    def get_state_name(self) -> str:
        return self._state.get_state_name()
    
    # State transition methods
    def reserve(self) -> bool:
        return self._state.reserve(self)
    
    def pickup(self) -> bool:
        return self._state.pickup(self)
    
    def return_vehicle(self) -> bool:
        return self._state.return_vehicle(self)
    
    def mark_damaged(self) -> bool:
        return self._state.mark_damaged(self)
    
    def start_maintenance(self) -> bool:
        return self._state.start_maintenance(self)
    
    def complete_maintenance(self) -> bool:
        return self._state.complete_maintenance(self)
    
    def approve_inspection(self) -> bool:
        return self._state.approve_inspection(self)
    
    def _save_state_transition(self, from_state: Optional[str], to_state: str):
        """Save state transition to database"""
        # Implementation: Save to vehicle_state_history table
        pass
```

## Rental State Pattern Implementation

```python
class RentalState(ABC):
    """Abstract base class for rental states"""
    
    @abstractmethod
    def confirm(self, rental: 'Rental') -> bool:
        pass
    
    @abstractmethod
    def pickup(self, rental: 'Rental') -> bool:
        pass
    
    @abstractmethod
    def return_rental(self, rental: 'Rental') -> bool:
        pass
    
    @abstractmethod
    def complete_inspection(self, rental: 'Rental', has_damage: bool) -> bool:
        pass
    
    @abstractmethod
    def pay_penalty(self, rental: 'Rental') -> bool:
        pass
    
    @abstractmethod
    def cancel(self, rental: 'Rental') -> bool:
        pass
    
    @abstractmethod
    def get_state_name(self) -> str:
        pass


class Rental:
    def __init__(self, rental_id: str):
        self.rental_id = rental_id
        self._state: RentalState = PendingState()
    
    def set_state(self, state: RentalState):
        self._state = state
        # Save to rental_state_history
    
    def confirm(self) -> bool:
        return self._state.confirm(self)
    
    def pickup(self) -> bool:
        success = self._state.pickup(self)
        if success:
            # Trigger vehicle state change
            self.vehicle.pickup()
        return success
    
    def return_rental(self) -> bool:
        success = self._state.return_rental(self)
        if success:
            # Trigger vehicle state change
            self.vehicle.return_vehicle()
        return success
```

## Benefits of State Pattern

1. **Rõ ràng và dễ bảo trì**: Mỗi state là một class riêng biệt
2. **Tránh if-else phức tạp**: Logic chuyển đổi được đóng gói trong state
3. **Dễ mở rộng**: Thêm state mới không ảnh hưởng code cũ
4. **Audit trail**: Dễ dàng theo dõi lịch sử chuyển đổi
5. **Business rules enforcement**: Đảm bảo chỉ các chuyển đổi hợp lệ được thực hiện

## Usage Example

```python
# Create vehicle
vehicle = Vehicle("v-001", "30A-12345")

# Reserve vehicle
if vehicle.reserve():
    print(f"Vehicle state: {vehicle.get_state_name()}")  # RESERVED
    
    # Customer picks up
    if vehicle.pickup():
        print(f"Vehicle state: {vehicle.get_state_name()}")  # IN_USE
        
        # Customer returns
        if vehicle.return_vehicle():
            print(f"Vehicle state: {vehicle.get_state_name()}")  # INSPECTION
            
            # No damage found
            if vehicle.approve_inspection():
                print(f"Vehicle state: {vehicle.get_state_name()}")  # AVAILABLE
            else:
                # Damage found
                vehicle.mark_damaged()
                print(f"Vehicle state: {vehicle.get_state_name()}")  # DAMAGED
                
                # Start repair
                vehicle.start_maintenance()
                print(f"Vehicle state: {vehicle.get_state_name()}")  # MAINTENANCE
```

## Integration with Services

### Rental Service
- Manages rental state transitions
- Coordinates with Vehicle Service for vehicle state
- Triggers events for other services

### Vehicle Service
- Manages vehicle state transitions
- Exposes APIs for state changes
- Publishes state change events

### Damage & Penalty Service
- Listens to inspection events
- Creates damage reports and penalties
- Can trigger vehicle state changes

### Payment Service
- Listens to payment completion events
- Can trigger rental state progressions
