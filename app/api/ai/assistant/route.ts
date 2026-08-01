// web/app/api/ai/assistant/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getLiveContext() {
  const [{ data: nodes }, { data: readings }, { data: alerts }] = await Promise.all([
    supabase.from('nodes').select('*').order('campus'),
    supabase.from('readings').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('alerts').select('*, nodes(location_name,campus)').is('resolved_at', null).order('created_at', { ascending: false }).limit(20),
  ]);

  const latestPerNode: Record<string, any> = {};
  (readings || []).forEach(r => { if (!latestPerNode[r.node_id]) latestPerNode[r.node_id] = r; });

  const nodesSummary = (nodes || []).map(n => {
    const r = latestPerNode[n.node_id];
    return {
      name: n.location_name, campus: n.campus, status: n.status,
      lastReading: r ? {
        ph: r.ph, tds: r.tds, turbidity: r.turbidity,
        temperature: r.temperature, sans_status: r.sans_status,
        recorded_at: r.created_at,
      } : null,
    };
  });

  const alertsSummary = (alerts || []).map((a: any) => ({
    parameter: a.parameter, value: a.value, threshold: a.threshold,
    status: a.sans_status, location: a.nodes?.location_name,
    campus: a.nodes?.campus, created_at: a.created_at,
  }));

  return { nodes: nodesSummary, activeAlerts: alertsSummary };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const ctx = await getLiveContext();

    const systemPrompt = `You are AquaAI, the intelligent water quality assistant for the University of Johannesburg AquaSense monitoring system. You help students, staff and administrators understand water quality data across UJ campuses.

## Your personality
- Friendly, clear and concise
- Use simple language, avoid jargon unless explaining it
- Always be honest about data limitations
- Show genuine care for student health and safety

## SANS 241:2015 Standards (South Africa mandatory drinking water standard)
- pH: 5.0–9.7 (UNSAFE below 4.0 or above 11.0)
- TDS: ≤ 1200 mg/L (UNSAFE above 2400)
- Turbidity: ≤ 5 NTU (UNSAFE above 10)
- Temperature: 5–25°C

## Status definitions
- SAFE: All parameters within SANS 241 limits
- CAUTION: One or more parameters approaching limits
- UNSAFE: One or more parameters exceed SANS 241 limits

## UJ Campuses
- UJ APK: Auckland Park Kingsway (main campus)
- UJ APB: Auckland Park Bunting Road
- UJ DFC: Doornfontein Campus
- UJ SWC: Soweto Campus

## LIVE DATA (right now):
${JSON.stringify(ctx, null, 2)}

## Instructions
1. Always reference live data when answering water safety questions
2. If a node shows UNSAFE status, clearly warn the user
3. Explain parameters in plain English when relevant
4. If data is missing or old (over 30 min), mention readings may not be current
5. For health concerns, recommend consulting a healthcare professional
6. Keep responses to 2-4 paragraphs max unless more detail is requested
7. Use emojis sparingly: ✅ ⚠️ 🚨 💧`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: 'AI service error', detail: err }), { status: 500 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    return new Response(JSON.stringify({ reply: text }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
