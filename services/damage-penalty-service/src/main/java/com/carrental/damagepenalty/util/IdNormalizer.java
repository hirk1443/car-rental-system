package com.carrental.damagepenalty.util;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

public final class IdNormalizer {

    private IdNormalizer() {
    }

    public static UUID toUuid(String rawId, String fieldName) {
        if (rawId == null || rawId.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        String normalized = rawId.trim();
        try {
            return UUID.fromString(normalized);
        } catch (IllegalArgumentException ignored) {
            return UUID.nameUUIDFromBytes(normalized.getBytes(StandardCharsets.UTF_8));
        }
    }
}
