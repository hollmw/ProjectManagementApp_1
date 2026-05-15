-- Multi-area support: a task can belong to several business areas
create table if not exists task_areas (
  id       uuid primary key default gen_random_uuid(),
  task_id  uuid not null references tasks(id) on delete cascade,
  area_id  uuid not null references areas(id) on delete cascade,
  unique (task_id, area_id)
);

-- Back-fill existing tasks so their current area_id appears in task_areas too
insert into task_areas (task_id, area_id)
select id, area_id from tasks where area_id is not null
on conflict do nothing;
