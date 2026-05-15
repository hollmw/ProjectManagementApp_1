-- Intern placement start and end dates
alter table profiles
  add column if not exists intern_start_date date,
  add column if not exists intern_end_date   date;
