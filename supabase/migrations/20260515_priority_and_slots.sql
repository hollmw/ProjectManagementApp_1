-- Add priority to tasks
alter table tasks
  add column if not exists priority text check (priority in ('high', 'medium', 'low')) default 'medium';

-- Intern slot requirements per area for a task
create table if not exists task_area_slots (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  area_id    uuid not null references areas(id) on delete cascade,
  required_count integer not null default 1 check (required_count >= 0),
  unique (task_id, area_id)
);
