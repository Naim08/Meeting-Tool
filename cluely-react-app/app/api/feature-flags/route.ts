import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client for fetching flags
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_DB2_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_DB2_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get specific flag name from query params
    const { searchParams } = new URL(request.url);
    const flagName = searchParams.get('name');

    if (flagName) {
      // Fetch single flag
      const { data, error } = await supabaseAdmin
        .from('feature_flags')
        .select('feature_name, is_enabled, description')
        .eq('feature_name', flagName)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Flag not found, default to enabled
          return NextResponse.json({
            feature_name: flagName,
            is_enabled: true,
            description: null
          });
        }
        console.error('Error fetching feature flag:', error);
        return NextResponse.json({ error: 'Failed to fetch feature flag' }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    // Fetch all flags
    const { data, error } = await supabaseAdmin
      .from('feature_flags')
      .select('feature_name, is_enabled, description, updated_at')
      .order('feature_name');

    if (error) {
      console.error('Error fetching feature flags:', error);
      return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 });
    }

    // Convert to map for easier consumption
    const flagsMap = data.reduce((acc, flag) => {
      acc[flag.feature_name] = flag.is_enabled;
      return acc;
    }, {} as Record<string, boolean>);

    return NextResponse.json({
      flags: flagsMap,
      details: data
    });
  } catch (error) {
    console.error('Feature flags API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
