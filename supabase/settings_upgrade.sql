-- Settings page upgrade: add school email, logo, academic year/term columns
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_email text DEFAULT '';
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_logo_url text DEFAULT '';
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '';
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS academic_term text DEFAULT '';
