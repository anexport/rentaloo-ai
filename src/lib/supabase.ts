import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database helper functions
export const db = {
  // Equipment queries
  async getEquipment(filters?: {
    category?: string
    location?: string
    priceMin?: number
    priceMax?: number
    availableFrom?: string
    availableTo?: string
  }) {
    let query = supabase
      .from('equipment')
      .select(`
        *,
        owner:profiles!equipment_owner_id_fkey(*),
        photos:equipment_photos(*),
        reviews:reviews(*)
      `)

    if (filters?.category) {
      query = query.eq('category_id', filters.category)
    }

    if (filters?.priceMin) {
      query = query.gte('daily_rate', filters.priceMin)
    }

    if (filters?.priceMax) {
      query = query.lte('daily_rate', filters.priceMax)
    }

    return query
  },

  // User profile queries
  async getUserProfile(userId: string) {
    return supabase
      .from('profiles')
      .select(`
        *,
        renter_profile:renter_profiles(*),
        owner_profile:owner_profiles(*)
      `)
      .eq('id', userId)
      .single()
  },

  // Booking queries
  async getBookingRequests(ownerId: string) {
    return supabase
      .from('booking_requests')
      .select(`
        *,
        equipment:equipment(*),
        renter:profiles!booking_requests_renter_id_fkey(*)
      `)
      .eq('equipment.owner_id', ownerId)
      .order('created_at', { ascending: false })
  },

  async getUserBookings(userId: string) {
    return supabase
      .from('booking_requests')
      .select(`
        *,
        equipment:equipment(*),
        owner:profiles!equipment!owner_id(*)
      `)
      .eq('renter_id', userId)
      .order('created_at', { ascending: false })
  }
}
