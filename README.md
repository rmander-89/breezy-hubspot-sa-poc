# HubSpot Integration Backend - Breezy Technical Assessment
# **A. Setup Instructions**

## **1. Clone the Repository**
Clone the project and navigate into the folder:

```bash
git clone https://github.com/<your-username>/breezy-hubspot-sa-poc.git
cd breezy-hubspot-sa-poc
```

---

## **2. Install Dependencies**
Install the required Node.js packages:

```bash
npm install
```

This prepares the backend server and the frontend files served from `/public`.

---

## **3. Configure Environment Variables**
Create a `.env` file in the project root and add:

```
HUBSPOT_ACCESS_TOKEN=your_hubspot_private_app_token
OPENAI_API_KEY=your_openai_api_key
```

These are required for:

- Connecting to the HubSpot CRM API  
- Generating AI insights via OpenAI  

> Note: `.env` is excluded from version control for security.

---

## **4. Start the Application**
Start the Express server:

```bash
npm start
```

The application will be available at:

```
http://localhost:3001
```

This single server provides both the backend API and the frontend user interface.

---

## **5. Open the Frontend**
Visit:

```
http://localhost:3001
```

You will see the Breezy admin panel, which includes:

- Contact list  
- Create Contact form  
- Deals for the selected contact  
- Create Deal form  
- AI Insight panel  

---

## **6. HubSpot API Notes for Testing**

### **A. HubSpot Search API delay (~11 seconds)**
New contacts created via the API may take **up to ~11 seconds** to appear in Search API results.  
The POC waits briefly before reloading and sorts by `createdate DESC` so new records appear at the top once indexed.

### **B. HubSpot Search limit (50 records)**
The CRM Search API returns **only the most recent 50 contacts** by default.  
Pagination was not required for this proof-of-concept.

---

## **7. OpenAI Requirements**
To test the AI Insight feature:

- Ensure `OPENAI_API_KEY` is present in `.env`
- The server must have internet access  
- The `/api/ai/insight` endpoint will load automatically when a contact is selected

---
# **B. Project Overview**

This proof-of-concept demonstrates how **Breezy**, a smart HVAC company, could integrate their platform with HubSpot to centralize customer data, track subscription conversions, and leverage AI for smarter lifecycle insights.

The POC includes:

- A lightweight **frontend admin panel** (served from `/public`) where Breezy’s team can:
  - View contacts stored in HubSpot  
  - Create new contacts (simulating a thermostat purchase + account creation)  
  - View deals for each contact (subscription conversions, upgrades)  
  - Create new deals associated with a contact  
  - View an **AI-powered insight card** for each contact  

- A Node/Express **backend server** that:
  - Proxies all requests to the HubSpot CRM API  
  - Performs secure contact and deal creation  
  - Fetches contact-associated deals  
  - Generates simulated usage data and calls OpenAI to produce AI insights  

- A full **HubSpot data model (ERD)** designed specifically for Breezy’s business:
  - Contact as the single source of truth  
  - Thermostat as a custom object  
  - Hardware deals vs. subscription deals  
  - Subscriptions, invoices, and payments  
  - Usage events and tickets  

The goal of this POC is to show how Breezy could use HubSpot as a unified customer system—connecting hardware purchases, subscription lifecycle events, usage-driven insights, and AI-powered next-best actions into a single place where marketing and success teams can act.

This is intentionally a simplified demonstration focused on integration patterns and architecture, rather than a production-ready application.

# **C. AI Usage Documentation**

For the AI component, I approached it in the same way I would approach a real client problem. I first outlined the strategy myself, focusing on what would actually move the needle for Breezy. Most of Breezy’s long term value comes from SaaS subscriptions rather than the one off thermostat purchase, so it made sense to base the AI feature around usage, engagement, trial timing, and potential expansion. I used ChatGPT not to create the idea but to validate and stress test my thinking. It helped me confirm that an RFM style model combined with Breezy specific signals would provide meaningful insights for conversion, upgrade and multi device opportunities.

Once I was confident in the approach, I used ChatGPT to help refine the system prompt that Claude Code would use when calling the OpenAI API. This was useful for tightening the structure, clarifying how the contact, deal and usage information should be presented to the model, and ensuring the output would be returned in a clean JSON format. The important learning here was that AI is only as useful as the data you give it. Without usage metrics the output would have been flat and generic, so I introduced simulated usage metrics to give the model enough behavioural context to generate meaningful insights.

Claude Code handled the implementation side by creating a backend helper that produces simulated usage metrics each time the AI endpoint is called, and by wiring this together with the contact and deal data into the OpenAI request. The final AI output is informative for a proof of concept and highlights the commercial opportunities in a simple way. However, it is not directly actionable inside HubSpot. In a real client deployment you would push the AI outputs back into HubSpot contact properties so they can be used for lists, automation, segmentation and reporting. This is the step that turns AI insights into something that actually drives business outcomes.
