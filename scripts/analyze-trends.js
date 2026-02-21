// scripts/analyze-trends.js
import 'dotenv/config';
import { OpenAI } from 'openai';
import fs from 'fs';

// Use GitHub Models (or any OpenAI compatible endpoint)
const client = new OpenAI({
  apiKey: process.env.GITHUB_TOKEN, // GitHub Models uses token
  baseURL: 'https://models.inference.ai.azure.com', // Example GitHub Models endpoint
});

async function analyzeTrends() {
  console.log('🌰 Analyzing trends...');
  
  if (!fs.existsSync('./data/raw_bounties.json')) {
    console.error('No raw bounties data found. Run fetch-bounties.js first.');
    process.exit(1);
  }

  const bounties = JSON.parse(fs.readFileSync('./data/raw_bounties.json', 'utf8'));

  // Prepare input for AI
  const summaryText = bounties.map(b => 
    `- [${b.repo}] ${b.title} (Labels: ${b.labels.join(', ')}) ${b.amount ? '$' + b.amount : ''}`
  ).join('\n');

  const prompt = `
  You are an expert market analyst for the AI Agent Economy. analyze these 50 recent bounties/jobs.
  
  Generate a JSON report with the following structure:
  {
    "market_sentiment": "string (Bullish/Bearish/Neutral + short reason)",
    "top_skills": ["skill1", "skill2", "skill3"],
    "emerging_trends": ["trend1", "trend2"],
    "average_bounty": number (estimate based on data),
    "agent_pulse_score": number (0-100, how hot is the market?),
    "commentary": "A short, witty paragraph about the state of the agent economy. Use 🌰 emojis."
  }

  Here is the data:
  ${summaryText}
  `;

  try {
    const response = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o',
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    // Merge analysis with raw data for the frontend
    const finalReport = {
      generated_at: new Date().toISOString(),
      analysis: analysis,
      bounties: bounties.slice(0, 10) // Top 10 for display
    };

    console.log('Analysis complete. 🌰 Pulse Score:', analysis.agent_pulse_score);
    fs.writeFileSync('./data/agent_pulse.json', JSON.stringify(finalReport, null, 2));

  } catch (error) {
    console.error('Error analyzing trends:', error);
    // Fallback if API fails (so site isn't broken)
    const fallbackReport = {
      generated_at: new Date().toISOString(),
      analysis: {
        market_sentiment: "Data Stream Interrupted",
        top_skills: ["Resilience", "Debugging", "Patience"],
        emerging_trends: ["API Outages"],
        average_bounty: 0,
        agent_pulse_score: 0,
        commentary: "⚠️ The AI oracle is currently offline. Showing cached reality. 🌰"
      },
      bounties: bounties.slice(0, 10)
    };
    fs.writeFileSync('./data/agent_pulse.json', JSON.stringify(fallbackReport, null, 2));
  }
}

analyzeTrends();
