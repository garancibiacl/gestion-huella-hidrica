import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

interface LastUpdatedState {
  waterReadings: Date | null;
  humanWaterConsumption: Date | null;
  lastUpdated: Date | null;
  isLoading: boolean;
}

export function useLastUpdated() {
  const { organizationId } = useOrganization();
  const [state, setState] = useState<LastUpdatedState>({
    waterReadings: null,
    humanWaterConsumption: null,
    lastUpdated: null,
    isLoading: true,
  });

  const fetchLastUpdated = async () => {
    if (!organizationId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Fetch most recent updated_at from water_readings
      const { data: waterData } = await supabase
        .from('water_readings')
        .select('updated_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // Fetch most recent updated_at from human_water_consumption
      const { data: humanData } = await supabase
        .from('human_water_consumption')
        .select('updated_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      const waterDate = waterData?.updated_at ? new Date(waterData.updated_at) : null;
      const humanDate = humanData?.updated_at ? new Date(humanData.updated_at) : null;

      // Get the most recent of both
      let lastUpdated: Date | null = null;
      if (waterDate && humanDate) {
        lastUpdated = waterDate > humanDate ? waterDate : humanDate;
      } else {
        lastUpdated = waterDate || humanDate;
      }

      setState({
        waterReadings: waterDate,
        humanWaterConsumption: humanDate,
        lastUpdated,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching last updated:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchLastUpdated();

    // Subscribe to realtime changes for both tables
    const channel = supabase
      .channel('data-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'water_readings',
        },
        () => {
          fetchLastUpdated();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'human_water_consumption',
        },
        () => {
          fetchLastUpdated();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return {
    ...state,
    refetch: fetchLastUpdated,
  };
}
