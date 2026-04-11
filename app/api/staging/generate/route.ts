import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface GenerateRequest {
  room_id: string;
  project_id: string;
  pass_number: number;
  pass_type: string;
  prompt: string;
  reference_urls: string[];
  resolution_tier: '1K' | '2K' | '4K';
  variation_count: 1 | 2 | 3;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as GenerateRequest;

    const {
      room_id,
      project_id,
      pass_number,
      pass_type,
      prompt,
      reference_urls,
      resolution_tier,
      variation_count,
    } = body;

    // Validate required fields
    if (!room_id || !project_id || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Call the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-staging`;

    const edgeFunctionResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        room_id,
        project_id,
        pass_number,
        pass_type,
        prompt,
        reference_urls,
        resolution_tier,
        variation_count,
        requested_by: user.id,
      }),
    });

    const edgeResponse = await edgeFunctionResponse.json();

    if (!edgeFunctionResponse.ok) {
      console.error('Edge function error:', edgeResponse);
      return NextResponse.json(
        { error: edgeResponse.error || 'Generation failed' },
        { status: edgeFunctionResponse.status }
      );
    }

    return NextResponse.json(edgeResponse, { status: 200 });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
