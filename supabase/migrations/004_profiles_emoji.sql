alter table profiles add column emoji text check (char_length(emoji) <= 10);
