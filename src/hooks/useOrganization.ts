import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UseOrganizationResult {
  organizationId: string | null;
  loading: boolean;
}

export function useOrganization(): UseOrganizationResult {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!user) {
        if (!mounted) return;
        setOrganizationId(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error('Error loading organization_id:', error);
        setOrganizationId(null);
      } else {
        setOrganizationId((data as any)?.organization_id ?? null);
      }

      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user]);

  return { organizationId, loading };
}
