-- Add 'ipg' status to attendance_entries and leave_requests CHECK constraints.
-- Rationale: the `ipg` status was added in the UI/API (`components/attendance/attendance-types.ts`)
-- but the DB constraints in `20260305000000_add_attendance_module.sql` and
-- `20260305100000_fix_attendance_status_check.sql` did not include it, causing
-- runtime Postgres errors on insert/update.

BEGIN;

-- attendance_entries.status
ALTER TABLE attendance_entries
    DROP CONSTRAINT IF EXISTS attendance_entries_status_check;

ALTER TABLE attendance_entries
    ADD CONSTRAINT attendance_entries_status_check
    CHECK (status IN (
        'presente',
        'vacanze',
        'malattia',
        'infortunio',
        'smart_working',
        'formazione',
        'assenza_privata',
        'ipg'
    ));

-- leave_requests.leave_type
ALTER TABLE leave_requests
    DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_leave_type_check
    CHECK (leave_type IN (
        'vacanze',
        'malattia',
        'infortunio',
        'smart_working',
        'formazione',
        'assenza_privata',
        'ipg'
    ));

COMMIT;
