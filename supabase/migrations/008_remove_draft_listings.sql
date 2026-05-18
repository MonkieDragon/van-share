-- Publish any legacy drafts; new journeys are always submitted.
UPDATE journeys SET listing_status = 'submitted' WHERE listing_status = 'draft';
