-- Fix attendance_entries status check constraint
ALTER TABLE attendance_entries DROP CONSTRAINT IF EXISTS attendance_entries_status_check;

ALTER TABLE attendance_entries ADD CONSTRAINT attendance_entries_status_check
    CHECK (status IN (
        'presente', 'vacanze', 'malattia', 'infortunio',
        'smart_working', 'formazione', 'assenza_privata'
    ));
