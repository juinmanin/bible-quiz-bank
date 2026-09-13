-- Public educational data only. No user/account tables are changed.
create table public.bible_books (
 id text primary key, name text not null, section text not null,
 testament text not null check (testament in ('old','new')),
 chapters integer not null check (chapters > 0), sort_order integer not null unique
);
create table public.bible_reading_days (
 day integer primary key check(day between 1 and 365),
 calendar_date text not null unique check(calendar_date ~ '^[0-9]{2}-[0-9]{2}$'),
 readings jsonb not null check(jsonb_typeof(readings)='array')
);
create table public.bible_questions (
 id text primary key, book_id text not null references public.bible_books(id),
 difficulty text not null check(difficulty in ('easy','medium','hard')),
 origin text not null check(origin in ('new','legacy_curated')),
 tags text[] not null default '{}', mcheyne_days integer[] not null default '{}',
 arithmetic boolean not null default false check(arithmetic=false),
 payload jsonb not null check(jsonb_typeof(payload)='object'
   and payload->>'id'=id and payload->>'book_id'=book_id
   and payload->>'difficulty'=difficulty and length(payload->>'answer')>0
   and length(payload->>'prompt')>0)
);
create index bible_questions_filter_idx on public.bible_questions(book_id,difficulty,origin);
create index bible_questions_tags_idx on public.bible_questions using gin(tags);
create index bible_questions_days_idx on public.bible_questions using gin(mcheyne_days);
alter table public.bible_books enable row level security;
alter table public.bible_reading_days enable row level security;
alter table public.bible_questions enable row level security;
create policy bible_books_public_read on public.bible_books for select to anon,authenticated using(true);
create policy bible_reading_days_public_read on public.bible_reading_days for select to anon,authenticated using(true);
create policy bible_questions_public_read on public.bible_questions for select to anon,authenticated using(true);
revoke all on public.bible_books,public.bible_reading_days,public.bible_questions from anon,authenticated;
grant select on public.bible_books,public.bible_reading_days,public.bible_questions to anon,authenticated;

-- Stateless random draw; callers send prior IDs to avoid repeats in their session.
-- SECURITY INVOKER preserves RLS. Answers are intentionally public educational content.
create function public.bible_quiz_random(
 p_book text default null, p_theme text default null, p_difficulty text default null,
 p_day integer default null, p_origin text default null,
 p_exclude text[] default '{}', p_count integer default 10
) returns setof jsonb language sql volatile security invoker set search_path=''
as $$
 select q.payload from public.bible_questions q
 where (p_book is null or q.book_id=p_book)
 and (p_theme is null or q.tags @> array[p_theme])
 and (p_difficulty is null or q.difficulty=p_difficulty)
 and (p_day is null or q.mcheyne_days @> array[p_day])
 and (p_origin is null or q.origin=p_origin)
 and not(q.id=any(coalesce(p_exclude,'{}'::text[])))
 order by random()
 limit greatest(1,least(coalesce(p_count,10),50));
$$;
revoke execute on function public.bible_quiz_random(text,text,text,integer,text,text[],integer) from public;
grant execute on function public.bible_quiz_random(text,text,text,integer,text,text[],integer) to anon,authenticated;
