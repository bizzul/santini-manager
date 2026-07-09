-- Attendance entries: tracks daily status for each user on a site
CREATE TABLE IF NOT EXISTS attendance_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'presente', 'vacanze', 'malattia', 'infortunio',
        'smart_working', 'formazione', 'assenza_privata'
    )),
    notes TEXT,
    auto_detected BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, user_id, date)
);

-- Leave requests: manages the request/approval flow for leave
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN (
        'vacanze', 'malattia', 'infortunio',
        'smart_working', 'formazione', 'assenza_privata'
    )),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected'
    )),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_entries_site_date ON attendance_entries(site_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_entries_user_date ON attendance_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_entries_site_user ON attendance_entries(site_id, user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_site_status ON leave_requests(site_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);

-- RLS policies for attendance_entries
ALTER TABLE attendance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view attendance entries for their site" ON attendance_entries;
CREATE POLICY "Users can view attendance entries for their site"
    ON attendance_entries FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert attendance entries" ON attendance_entries;
CREATE POLICY "Authenticated users can insert attendance entries"
    ON attendance_entries FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update attendance entries" ON attendance_entries;
CREATE POLICY "Authenticated users can update attendance entries"
    ON attendance_entries FOR UPDATE
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete attendance entries" ON attendance_entries;
CREATE POLICY "Authenticated users can delete attendance entries"
    ON attendance_entries FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- RLS policies for leave_requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view leave requests for their site" ON leave_requests;
CREATE POLICY "Users can view leave requests for their site"
    ON leave_requests FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert leave requests" ON leave_requests;
CREATE POLICY "Authenticated users can insert leave requests"
    ON leave_requests FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update leave requests" ON leave_requests;
CREATE POLICY "Authenticated users can update leave requests"
    ON leave_requests FOR UPDATE
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete leave requests" ON leave_requests;
CREATE POLICY "Authenticated users can delete leave requests"
    ON leave_requests FOR DELETE
    USING (auth.uid() IS NOT NULL);
