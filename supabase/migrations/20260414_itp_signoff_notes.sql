-- Add optional notes/comment field to itp_item_signoffs.
-- Allows signatories to leave a comment or note when signing off an ITP item.
ALTER TABLE itp_item_signoffs ADD COLUMN notes text;
