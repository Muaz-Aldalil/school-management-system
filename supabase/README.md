# Supabase Migrations

Apply in this exact order:

```
1.  migration.sql                — Base schema (profiles, landing, notifications, RLS)
2.  data_migration.sql           — Students, grades, payments, settings, seed data
3.  fix_profiles.sql             — Profile fixes
4.  profiles_v3.sql              — Approval flow + auto-approve
5.  approval_v2.sql              — Approval v2
6.  invitations_v2.sql           — Invitation system with target email
7.  onboarding.sql               — Registration flow + check_invitation
8.  admin_delete_user.sql        — User deletion RPC
9.  production_fixes.sql         — Indexes, triggers, RPCs, TOCTOU fixes, audit trail
10. onboarding_bootstrap.sql     — bootstrap_school RPC (first admin setup)
11. settings_upgrade.sql         — school_settings, teacher_assignments tables
12. offline_first_upgrade.sql    — outbox, sync tables
13. storage.sql                  — student-photos bucket + RLS policies
14. registration_section.sql     — registration_requests table + seed classes
15. security_fixes.sql           — RPC multi-tenancy fixes (run LAST)
16. fix_signup_pending.sql       — Fix 500 on signup ("Database error saving new user", shown as {}):
                                   role CHECK incl. pending/accountant/supervisor/worker,
                                   invitation resolution in handle_new_user trigger,
                                   robust audit trigger, check_invitation(p_code, p_email)
```

> Note: the recorded order above predates `sudanization.sql` / `arabic_landing_content.sql` /
> `fix_student_insert.sql` / `dashboard_snapshots.sql`. The exact order those ran in the live DB
> is not tracked. `fix_signup_pending.sql` is written idempotently and safe to run at any point.

Run each file in the Supabase SQL editor or via CLI:
```bash
supabase db reset  # resets and applies all migrations
```
