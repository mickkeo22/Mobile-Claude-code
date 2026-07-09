-- Step 8 of the wizard now collects full contact details so GHL receives a
-- complete contact (name + phone + email), not just an email address.
alter table mk_leads add column if not exists last_name text;
alter table mk_leads add column if not exists phone text;
