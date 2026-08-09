-- Add geolocation fields to lok_posts table
alter table lok_posts
  add column latitude numeric,
  add column longitude numeric,
  add column location_name text,
  add column location_privacy text default 'everyone' check (location_privacy in ('only-me', 'friends', 'everyone'));

-- Create spatial index for efficient location queries
create index idx_lok_posts_location on lok_posts (latitude, longitude)
where latitude is not null and longitude is not null;
