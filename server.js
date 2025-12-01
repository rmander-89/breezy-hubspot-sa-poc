require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory (for easy frontend development)
app.use(express.static(path.join(__dirname, 'public')));

// HubSpot API configuration
const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Validate tokens on startup
if (!HUBSPOT_TOKEN) {
  console.error('❌ ERROR: HUBSPOT_ACCESS_TOKEN not found in .env file');
  console.error('Please create a .env file and add your HubSpot Private App token');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY not found in .env file');
  console.error('Please add your OpenAI API key to the .env file');
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    timestamp: new Date().toISOString() 
  });
});

// GET endpoint - Fetch contacts from HubSpot (sorted by creation date, newest first)
app.get('/api/contacts', async (req, res) => {
  try {
    const response = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      {
        limit: 50,
        sorts: [
          {
            propertyName: 'createdate',
            direction: 'DESCENDING'
          }
        ],
        properties: ['firstname', 'lastname', 'email', 'phone', 'address', 'company', 'jobtitle']
      },
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Return only the results array
    res.json(response.data.results);
  } catch (error) {
    console.error('Error fetching contacts:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch contacts',
      details: error.response?.data || error.message
    });
  }
});

// POST endpoint - Create new contact in HubSpot
app.post('/api/contacts', async (req, res) => {
  try {
    const response = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
      {
        properties: req.body.properties
      },
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error creating contact:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to create contact',
      details: error.response?.data || error.message
    });
  }
});

// GET endpoint - Fetch all deals from HubSpot
app.get('/api/deals', async (req, res) => {
  try {
    const response = await axios.get(
      `${HUBSPOT_API_BASE}/crm/v3/objects/deals`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 50,
          properties: 'dealname,amount,dealstage,closedate,pipeline'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching deals:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch deals',
      details: error.response?.data || error.message
    });
  }
});

// POST endpoint - Create new deal and associate to contact
app.post('/api/deals', async (req, res) => {
  try {
    const { dealProperties, contactId } = req.body;
    
    // Create the deal with association to contact
    const dealResponse = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/deals`,
      {
        properties: dealProperties,
        associations: contactId ? [{
          to: { id: contactId },
          types: [{
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 3 // Deal to Contact association
          }]
        }] : []
      },
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json(dealResponse.data);
  } catch (error) {
    console.error('Error creating deal:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to create deal',
      details: error.response?.data || error.message
    });
  }
});

// GET endpoint - Fetch deals associated with a specific contact
app.get('/api/contacts/:contactId/deals', async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // First, get the deal associations for this contact
    const associationsResponse = await axios.get(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}/associations/deals`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // If there are associated deals, fetch their full details
    if (associationsResponse.data.results && associationsResponse.data.results.length > 0) {
      const dealIds = associationsResponse.data.results.map(r => r.id);
      
      const dealsResponse = await axios.post(
        `${HUBSPOT_API_BASE}/crm/v3/objects/deals/batch/read`,
        {
          inputs: dealIds.map(id => ({ id })),
          properties: ['dealname', 'amount', 'dealstage', 'closedate', 'pipeline']
        },
        {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      res.json(dealsResponse.data);
    } else {
      res.json({ results: [] });
    }
  } catch (error) {
    console.error('Error fetching deals for contact:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch deals for contact',
      details: error.response?.data || error.message
    });
  }
});

// ===== AI INSIGHT FEATURE =====

/**
 * Generate simulated usage metrics for a contact
 * In a real app, these would come from event tracking/analytics
 */
function generateSimulatedUsageMetrics() {
  return {
    logins_last_7_days: Math.floor(Math.random() * 11), // 0-10
    schedules_created: Math.floor(Math.random() * 11), // 0-10
    energy_reports_viewed: Math.floor(Math.random() * 11), // 0-10
    trial_days_remaining: Math.floor(Math.random() * 31) // 0-30
  };
}

/**
 * Call OpenAI to generate subscription conversion insight
 */
async function generateAiInsight(contact, deals, usageMetrics) {
  const systemPrompt = `You are an AI assistant helping Breezy, a smart HVAC hardware and SaaS company, evaluate a customer's likelihood to convert from free trial → paid subscription, expand from monthly → annual, or grow from single-thermostat → multi-thermostat usage.

BREEZY'S HUBSPOT DATA MODEL:

- **Contact object** is the source of truth for SaaS lifecycle:
  - Stores trial fields: trial_status, trial_start_date, trial_end_date
  - Tracks marketing engagement and onboarding interactions

- **Thermostat (custom object)** represents hardware ownership:
  - Fields: serial_number, model, installation_date, usage metrics

- **Usage data** is periodically ingested from Breezy's cloud platform:
  - logins_last_7_days, schedules_created, energy_reports_viewed, thermostat_adjustments
  - (In this POC, usage metrics are simulated)

- **Deals** represent subscription conversions and expansions:
  - Free trial → paid monthly
  - Paid monthly → annual
  - Household expansion deals (adding more thermostats)

- **Recurring revenue properties** on deals are used for MRR/ARR reporting

YOUR TASK:

Using the contact details, deals list, simulated usage metrics, and trial timing provided, produce a concise JSON result with:

1. **conversion_likelihood**: "Low", "Medium", or "High"

2. **rfm_segment**: An RFM-style interpretation based on:
   - Recency = last usage / trial freshness
   - Frequency = how often they're using features
   - Monetary = plan type inferred from deals (monthly vs annual, deal amount)

3. **reasoning**: 3–4 sentences justifying the analysis in business language

4. **next_best_action**: A specific recommendation for Breezy's marketing/CS team
   - Examples:
     - "Send trial-ending-soon upgrade email with energy savings ROI."
     - "Offer annual discount for highly engaged monthly subscriber."
     - "Introduce multi-thermostat 'Home Bundle' upsell based on household usage."

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown) in this exact structure:

{
  "conversion_likelihood": "Low" | "Medium" | "High",
  "rfm_segment": "e.g., High Recency / Medium Frequency / Low Monetary",
  "reasoning": "3-4 sentences explaining the analysis",
  "next_best_action": "Specific recommendation for marketing or CS"
}`;

  // Build user prompt with context
  const dealsCount = deals.length;
  const totalDealValue = deals.reduce((sum, deal) => {
    const amount = parseFloat(deal.properties?.amount || 0);
    return sum + amount;
  }, 0);
  const latestDealStage = deals.length > 0 ? deals[0].properties?.dealstage : 'none';

  const userPrompt = `Analyze this customer for subscription conversion potential:

CONTACT INFO:
- Name: ${contact.firstname} ${contact.lastname}
- Email: ${contact.email}

USAGE METRICS (last 7 days):
- Logins: ${usageMetrics.logins_last_7_days}
- Schedules Created: ${usageMetrics.schedules_created}
- Energy Reports Viewed: ${usageMetrics.energy_reports_viewed}
- Trial Days Remaining: ${usageMetrics.trial_days_remaining}

DEAL HISTORY:
- Number of Deals: ${dealsCount}
- Total Deal Value: $${totalDealValue.toFixed(2)}
- Latest Deal Stage: ${latestDealStage}

Provide your analysis in the required JSON format.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content.trim();

    // Parse JSON response (OpenAI sometimes wraps in markdown code blocks)
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonContent = content.split('```')[1].split('```')[0].trim();
    }

    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    throw new Error('Failed to generate AI insight');
  }
}

/**
 * POST /api/ai/insight - Generate AI-powered subscription conversion insight
 */
app.post('/api/ai/insight', async (req, res) => {
  try {
    const { contact, deals } = req.body;

    if (!contact || !contact.firstname || !contact.lastname) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'Contact information is required'
      });
    }

    // Generate simulated usage metrics
    const usageMetrics = generateSimulatedUsageMetrics();

    // Call OpenAI to generate insight
    const insight = await generateAiInsight(contact, deals || [], usageMetrics);

    // Return the insight along with the simulated metrics for transparency
    res.json({
      ...insight,
      usage_metrics: usageMetrics
    });

  } catch (error) {
    console.error('Error generating AI insight:', error.message);
    res.status(500).json({
      error: 'Failed to generate AI insight',
      details: error.message
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log('\n✅ Server running successfully!');
  console.log(`🌐 API available at: http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Static files served from: /public`);
  console.log('\n💡 Using hot-reload? Run: npm run dev');
  console.log('🛑 To stop server: Press Ctrl+C\n');
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  Received ${signal}, closing server gracefully...`);
  
  server.close(() => {
    console.log('✅ Server closed successfully');
    console.log('👋 Goodbye!\n');
    process.exit(0);
  });

  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
