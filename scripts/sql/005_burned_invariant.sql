-- =============================================================================
-- Burned State Irreversibility Constraint
-- =============================================================================
-- This constraint ensures that once a share is burned (viewed with burn_after_reading),
-- it cannot be "unburned". This prevents data integrity issues where a burned share
-- could be accessed again through direct database manipulation.
-- =============================================================================

-- Constraint: If burn_after_reading is true and view_count > 0, burned MUST be true.
-- This prevents reverting burned to false after a share has been viewed.
ALTER TABLE shares ADD CONSTRAINT shares_burned_irreversible_check
CHECK (
    NOT (burn_after_reading = true AND view_count > 0 AND burned = false)
);
