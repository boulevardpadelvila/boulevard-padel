-- Extender únicamente PostgreSQL 17 temporal: esquema de turnero ficticio compatible.
CREATE TYPE public.block_type AS ENUM ('manual','tournament');
CREATE TABLE public.courts(id uuid PRIMARY KEY,active boolean NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.courts(id,active) VALUES('12121212-1212-4121-8121-121212121212',true);
CREATE TABLE public.booking_settings(id integer PRIMARY KEY,timezone text NOT NULL);
INSERT INTO public.booking_settings VALUES(1,'America/Argentina/Cordoba');
ALTER TABLE public.reservations ADD court_id uuid,ADD starts_at timestamptz,ADD ends_at timestamptz,ADD status text DEFAULT 'confirmed';
ALTER TABLE public.blockouts ADD court_id uuid,ADD starts_at timestamptz,ADD ends_at timestamptz,
 ADD block_type public.block_type NOT NULL DEFAULT 'manual',ADD reason text,ADD active boolean NOT NULL DEFAULT true,
 ADD created_by uuid,ADD updated_at timestamptz DEFAULT now();