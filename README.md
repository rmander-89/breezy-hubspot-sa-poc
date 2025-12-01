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

I used AI throughout this assessment as a support, not as the decision maker. The structure, architecture and approach all came from my own interpretation of Breezy’s business model and the assignment requirements. AI was used to accelerate specific tasks, validate thinking and help generate clean, testable code.

I used ChatGPT mainly for guidance at key points. Early on it helped clarify some practical setup tasks, such as getting the starter repository into VS Code, understanding how the backend was structured and confirming the correct workflow when Claude Code was committing changes directly to GitHub. I also used ChatGPT to help refine prompts before sending them to Claude Code. Rather than giving Claude one large instruction, I used ChatGPT to break the work into focused, assignment-aligned prompts covering contacts, deals, the admin layout and basic styling.

Claude Code handled most of the implementation work. It created the initial frontend structure, wrote the JavaScript for calling the backend API routes, and generated the UX for loading states, error handling and record creation. As I tested the app locally I identified issues, such as the shape of HubSpot’s Search API response or the delay before new contacts appear. I then wrote more targeted prompts to Claude to update the code where needed.

I also used AI when designing the optional AI feature. The underlying model was based on my own experience with B2C HubSpot customers where usage behaviour, recency, frequency, monetary value and multi product ownership tend to be the strongest predictors of conversion and retention. I suggested an RFM (Recency, Frequency, Monetary) style approach using signals such as trial timing, login activity, schedules created and energy report views, and ChatGPT helped validate and refine that thinking. It also helped me structure the system prompt for Claude Code so that the AI endpoint would return consistent JSON.
Claude then produced the backend endpoint that simulates usage metrics and sends them to OpenAI.

A practical learning from this exercise is that not all AI tools are suited to all parts of the workflow. I initially explored Lovable for the frontend but quickly learned it is designed for purely frontend, serverless projects, and therefore did not fit this assignment which required integrating a pre existing Express backend.

# **D. HubSpot Data Architecture**

This section describes the data model designed for Breezy, why each object exists, how they relate to each other and why these choices support Breezy’s hardware and SaaS business. The model keeps the Contact as the single source of truth and layers hardware, subscriptions, payments, usage activity and support tickets around it.

## **1. Core Object Model and Ownership**

### **1.1 Contact as the source of truth**

The Contact is the main record that everything else relates back to. It represents the customer or household and holds all identity information, trial state and usage rollups. A single Contact can own devices, start a free trial, become a subscriber and later upgrade or churn.

Trial specific fields live directly on the Contact. Examples include:
- breezy_trial_status  
- breezy_trial_start_date  
- breezy_trial_end_date  
- breezy_last_login_date  
- breezy_last_usage_event  

This avoids using a deal pipeline for trial tracking and keeps trials simple, clear and easy to automate in HubSpot. It also aligns with how marketing teams usually want to enrol customers in workflows, which is generally property based rather than driven by deal records.

### **1.2 Thermostat custom object**

Thermostats are represented as a custom object. A Contact can have many Thermostats. This separates the person from the device fleet and allows Breezy to track device level detail and ownership.

Key fields include:
- serial_number  
- model  
- installation_date  
- firmware_version  
- avg_daily_runtime  
- energy_savings_score  
- device_status  

Thermostats are associated to the Contact so Breezy has a full view of device ownership. This also enables useful future scenarios, such as identifying multi device households or linking tickets to specific devices. A future extension could include linking a Thermostat to a Subscription if Breezy ever moves to per device subscription billing.

---

## **2. Trial to Paid Subscription Lifecycle**

### **2.1 Free trial driven from hardware purchase**

When a thermostat is purchased, Breezy would create or update the Contact, create a Thermostat object and start the free trial. Trial fields on the Contact would be updated as follows:
- breezy_trial_status = active  
- breezy_trial_start_date = purchase_date  
- breezy_trial_end_date = purchase_date + 30 days  

This keeps the trial aligned with the hardware lifecycle and avoids creating additional deals for every trial.

### **2.2 No separate trial deal pipeline**

There were two possible designs:
- A trial pipeline with one deal per free trial  
- Tracking trial state only on the Contact  

I deliberately chose to store trial information on the Contact. It is simpler, avoids cluttering the CRM with unnecessary deals and fits better with marketing automation, where enrolment based on contact properties is more natural. It also avoids any complexity around making sure the correct deal is updated later.

---

## **3. Payment Links, Subscription Creation and Email Flows**

### **3.1 Use of static payment links**

For subscription upgrades, the recommended approach is to use two static payment links created in HubSpot Payments:
- Monthly link  
- Annual link  

These can be dropped into marketing emails, including onboarding emails and trial ending emails. Quotes and per contact payment links were not used, as they would be too heavy for a B2C model and far less efficient in workflows.

### **3.2 Commerce behaviour after payment link completion**

When a customer completes a payment link, HubSpot Commerce automatically creates:
- a Payment  
- a Subscription  

These are associated with the Contact by email. A Subscription based workflow then creates a subscription deal with the correct deal amount and the correct recurring revenue fields. The payment link therefore becomes the trigger for the creation of all downstream commercial records. Deals act as a reporting layer, not the system of record for billing.

---

## **4. Deal Strategy and Recurring Revenue Reporting**

### **4.1 Hardware deals and subscription deals**

The model separates hardware revenue from SaaS revenue. Hardware purchases become Closed Won deals in a hardware pipeline and are associated with both the Contact and the Thermostat. Subscription deals are created from the Subscription workflow and represent the commercial event, such as new business or an upgrade. This keeps reporting clean and makes it easy to distinguish one off revenue from recurring revenue.

### **4.2 Recurring revenue fields on subscription deals**

Subscription deals use HubSpot’s recurring revenue properties. For example:
- recurring_revenue_deal_type set to New business for the first subscription  
- recurring_revenue_amount stored as a monthly equivalent  
- recurring_revenue_type set to monthly or annual  

When subscriptions change state, the inactive fields are set, such as:
- recurring_revenue_inactive_date  
- recurring_revenue_inactive_reason  

A new deal is created for upgrades or renewals. This approach makes full use of HubSpot’s Revenue Analytics and shows an understanding of how to track SaaS revenue correctly.

---

## **5. Workflows and Automation**

### **5.1 Subscription to deal workflow**

The cleanest trigger for creating subscription deals is the Subscription itself. A workflow listening for subscription creation sets:
- deal amount  
- recurring revenue fields  
- close date  

When the Subscription later cancels or expires, the workflow updates the recurring revenue inactive fields. This avoids the complexity of trying to update the correct deal from a Contact based workflow.

### **5.2 Avoiding deal based triggers from payments on Contacts**

It is possible to enrol Contacts in workflows based on Payments, but updating the correct associated deal becomes difficult because workflows operate on one object at a time. Using Subscription based workflows is more reliable and aligns naturally with how Commerce objects are structured.

---

## **6. Usage Data and AI Readiness**

### **6.1 Usage ingestion design**

Although not fully implemented, I designed the usage pattern with future state in mind. Breezy’s platform would periodically sync:
- logins  
- schedule changes  
- energy report views  
- thermostat adjustments  
- feature adoption signals  

These map to:
- Contact properties for high level metrics and automation  
- Thermostat object for device specific usage  

This supports onboarding, win back and usage based personalisation.

### **6.2 AI feature structure**

The AI endpoint combines the Contact, the deals for that Contact and simulated usage metrics to produce:
- conversion likelihood  
- an RFM style segment  
- reasoning  
- a next best action  

This is returned as structured JSON and displayed in the UI. It demonstrates how Breezy could use real usage data in the future to drive intelligent trial to paid conversion strategies.

### **6.3 Writing AI insights back to HubSpot**

A future enhancement would be to write the AI outputs back into HubSpot as custom properties, for example:
- breezy_ai_conversion_score  
- breezy_ai_next_best_action  

This would allow these insights to drive segmentation and automation within HubSpot.

---

## **7. Frontend and API Mechanics**

Some implementation choices reflect an understanding of real world integration behaviour:
- Contacts loaded using the CRM Search API with sorting by createdate to ensure newly created contacts appear at the top  
- Fixing the shape of API responses by extracting the results array  
- Acknowledging the limit of 50 records returned from search  
- Adding proper loading states and error handling  
- Accepting that HubSpot Search API has an eleven second delay for new records and building around this  

These details demonstrate practical awareness of how CRM integrations behave and how to design a smooth frontend experience around them.
