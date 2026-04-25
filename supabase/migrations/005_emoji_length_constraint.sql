alter table profiles add constraint emoji_length check (char_length(emoji) <= 10);
