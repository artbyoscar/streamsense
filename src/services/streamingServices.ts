/**
 * Streaming Services API
 * Fetch streaming services from database
 */

import { supabase } from '@/lib/supabase';
import type { StreamingService } from '@/types';

/**
 * Fetch all streaming services
 */
export async function fetchStreamingServices(): Promise<StreamingService[]> {
  const { data, error } = await supabase
    .from('streaming_services')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Search streaming services by name
 */
export async function searchStreamingServices(query: string): Promise<StreamingService[]> {
  if (!query.trim()) {
    return fetchStreamingServices();
  }

  const { data, error } = await supabase
    .from('streaming_services')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
