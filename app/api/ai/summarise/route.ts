// web/app/api/ai/summarise/route.ts
// Feature 2: Smart Alert Summariser
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Fetch all active alerts with node info
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*, nodes(location_name, campus, latitude, longitude)')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({
        summary: '✅ All clear! No active alerts across any UJ campus. All nodes are reporting readings within SANS 241:2015 limits.',
        alertCount: 0,
        severity: 'safe',
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    const alertData = alerts.map(a => ({
      parameter:  a.parameter,
      value:      a.value,
      threshold:  a.threshold,
      status:     a.sans_status,
      location:   a.nodes?.location_name,
      campus:     a.nodes?.campus,
      time:       a.created_at,
    }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are a water quality monitoring AI for the University of Johannesburg. 

Summarise these ${alerts.length} active SANS 241:2015 alerts in 2-3 sentences maximum. 
Be specific about which campuses and parameters are affected.
If multiple alerts are on the same campus, group them.
Mention if there is a possible common cause.
End with a clear action recommendation.
Use plain English, no jargon.

Alert data:
${JSON.stringify(alertData, null, 2)}`,
        }],
      }),
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'Unable to generate summary.';

    const hasUnsafe = alerts.some(a => a.sans_status === 'UNSAFE');
    const severity  = hasUnsafe ? 'unsafe' : 'caution';

    return new Response(JSON.stringify({
      summary,
      alertCount: alerts.length,
      severity,
      byStatus: {
        unsafe:  alerts.filter(a => a.sans_status === 'UNSAFE').length,
        caution: alerts.filter(a => a.sans_status === 'CAUTION').length,
      },
      byCampus: alerts.reduce((acc: any, a) => {
        const campus = a.nodes?.campus || 'Unknown';
        acc[campus] = (acc[campus] || 0) + 1;
        return acc;
      }, {}),
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
