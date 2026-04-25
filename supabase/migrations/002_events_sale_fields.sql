-- Add sale-specific fields that were missing from the initial migration
alter table events
  add column contract_value numeric(10, 2) check (contract_value > 0),
  add column account_type   text           check (account_type in ('gen_pest', 'mosquito'));
