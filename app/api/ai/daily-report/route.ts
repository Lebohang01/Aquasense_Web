// web/app/api/ai/daily-report/route.ts
// Feature 3: Auto-generated Daily Report
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: nodes }, { data: readings }, { data: alerts }] = await Promise.all([
      supabase.from('nodes').select('*').order('campus'),
      supabase.from('readings')
        .select('*, nodes(location_name, campus)')
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false }),
      supabase.from('alerts')
        .select('*, nodes(location_name, campus)')
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false }),
    ]);

    // Compute stats per campus
    const campusStats: Record<string, any> = {};
    const campusList = ['UJ APK', 'UJ APB', 'UJ SWC', 'UJ DFC'];

    campusList.forEach(campus => {
      const campusReadings = (readings || []).filter((r: any) => r.nodes?.campus === campus);
      const campusAlerts   = (alerts   || []).filter((a: any) => a.nodes?.campus === campus);

      if (campusReadings.length === 0) {
        campusStats[campus] = { readingCount: 0, alertCount: 0 };
        return;
      }

      const avg = (key: string) => {
        const vals = campusReadings.map((r: any) => r[key]).filter((v: any) => v != null);
        return vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2) : 'N/A';
      };

      campusStats[campus] = {
        readingCount: campusReadings.length,
        alertCount:   campusAlerts.length,
        avgPh:        avg('ph'),
        avgTds:       avg('tds'),
        avgTurbidity: avg('turbidity'),
        avgTemp:      avg('temperature'),
        statusBreakdown: {
          safe:    campusReadings.filter((r: any) => r.sans_status === 'SAFE').length,
          caution: campusReadings.filter((r: any) => r.sans_status === 'CAUTION').length,
          unsafe:  campusReadings.filter((r: any) => r.sans_status === 'UNSAFE').length,
        },
        alerts: campusAlerts.slice(0, 3).map((a: any) => ({
          parameter: a.parameter, value: a.value,
          status: a.sans_status, location: a.nodes?.location_name,
          resolved: !!a.resolved_at,
        })),
      };
    });

    const totalReadings = (readings || []).length;
    const totalAlerts   = (alerts   || []).length;
    const date          = new Date().toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are AquaAI for the University of Johannesburg water quality monitoring system.

Generate a professional but friendly daily water quality report for ${date}.

Data from the last 24 hours:
- Total readings: ${totalReadings}
- Total alerts: ${totalAlerts}
- Campus breakdown: ${JSON.stringify(campusStats, null, 2)}

SANS 241:2015 safe limits: pH 5.0-9.7, TDS ≤1200 mg/L, Turbidity ≤5 NTU, Temperature 5-25°C

Format the report as:
1. One opening sentence greeting (mention the date)
2. Overall campus health summary (1-2 sentences)
3. Campus-by-campus highlights (only mention campuses with data, 1 sentence each)
4. Any concerns or notable events
5. One closing recommendation

Keep it under 200 words. Use plain English. Be factual and helpful.`,
        }],
      }),
    });

    const data    = await response.json();
    const report  = data.choices?.[0]?.message?.content || 'Unable to generate daily report.';
    const overall = totalAlerts === 0 ? 'safe' : (alerts || []).some((a: any) => a.sans_status === 'UNSAFE') ? 'unsafe' : 'caution';

    return new Response(JSON.stringify({
      report,
      date,
      stats: { totalReadings, totalAlerts, campusStats },
      overall,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
