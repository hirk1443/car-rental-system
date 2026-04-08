package com.carrental.statistics.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    
    public static final String EXCHANGE = "car-rental-exchange";
    
    @Bean
    public TopicExchange carRentalExchange() {
        return new TopicExchange(EXCHANGE);
    }
    
    @Bean
    public Queue rentalCompletedQueue() {
        return new Queue("rental.completed.queue", true);
    }
    
    @Bean
    public Queue paymentCompletedQueue() {
        return new Queue("payment.completed.queue", true);
    }
    
    @Bean
    public Queue penaltyCreatedQueue() {
        return new Queue("penalty.created.queue", true);
    }
    
    @Bean
    public Binding rentalCompletedBinding() {
        return BindingBuilder.bind(rentalCompletedQueue())
                .to(carRentalExchange())
                .with("rental.completed");
    }
    
    @Bean
    public Binding paymentCompletedBinding() {
        return BindingBuilder.bind(paymentCompletedQueue())
                .to(carRentalExchange())
                .with("payment.completed");
    }
    
    @Bean
    public Binding penaltyCreatedBinding() {
        return BindingBuilder.bind(penaltyCreatedQueue())
                .to(carRentalExchange())
                .with("penalty.created");
    }
}
