-- Enable realtime for water_readings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.water_readings;

-- Enable realtime for human_water_consumption table
ALTER PUBLICATION supabase_realtime ADD TABLE public.human_water_consumption;