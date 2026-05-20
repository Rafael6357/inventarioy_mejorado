create or replace function get_public_stats()
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_build_object(
    'products', (select count(*) from products),
    'movements', (select count(*) from movements),
    'users', (select count(*) from profiles),
    'sales', (select count(*) from sales)
  ) into result;
  return result;
end;
$$;
