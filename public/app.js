// State management
const state = {
    selectedContactId: null,
    selectedContactData: null,
    contacts: [],
    currentDeals: null
};

// DOM elements
const elements = {
    contactsTableBody: document.getElementById('contacts-table-body'),
    contactForm: document.getElementById('create-contact-form'),
    selectedContactInfo: document.getElementById('selected-contact-info'),
    dealsTableBody: document.getElementById('deals-table-body'),
    dealForm: document.getElementById('create-deal-form'),
    dealContactIdInput: document.getElementById('deal-contact-id')
};

// ===== API CALLS =====

/**
 * Fetch all contacts from HubSpot
 */
async function fetchContacts() {
    const response = await fetch('/api/contacts');
    if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`);
    }
    const data = await response.json();
    // Server now returns the array directly (sorted by createdate DESC)
    return data || [];
}

/**
 * Create a new contact in HubSpot
 */
async function createContact(properties) {
    const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties })
    });

    if (!response.ok) {
        throw new Error(`Failed to create contact: ${response.statusText}`);
    }
    return await response.json();
}

/**
 * Fetch deals for a specific contact
 */
async function fetchDealsForContact(contactId) {
    const response = await fetch(`/api/contacts/${contactId}/deals`);
    if (!response.ok) {
        throw new Error(`Failed to fetch deals: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results || [];
}

/**
 * Create a new deal associated with a contact
 */
async function createDeal(dealProperties, contactId) {
    const response = await fetch('/api/deals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dealProperties, contactId })
    });

    if (!response.ok) {
        throw new Error(`Failed to create deal: ${response.statusText}`);
    }
    return await response.json();
}

/**
 * Fetch AI insight for a contact
 */
async function fetchAiInsight(contact, deals) {
    const response = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contact: {
                firstname: contact.firstname,
                lastname: contact.lastname,
                email: contact.email
            },
            deals: deals || []
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch AI insight: ${response.statusText}`);
    }
    return await response.json();
}

// ===== RENDERING FUNCTIONS =====

/**
 * Render contacts into the table
 */
function renderContacts(contacts) {
    if (!contacts || contacts.length === 0) {
        elements.contactsTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    No contacts found. Create one to get started!
                </td>
            </tr>
        `;
        return;
    }

    elements.contactsTableBody.innerHTML = contacts.map(contact => {
        const props = contact.properties || {};
        return `
            <tr class="contact-row" data-contact-id="${contact.id}">
                <td>${escapeHtml(props.firstname || '')}</td>
                <td>${escapeHtml(props.lastname || '')}</td>
                <td>${escapeHtml(props.email || '')}</td>
                <td>${escapeHtml(props.jobtitle || '')}</td>
                <td>${escapeHtml(props.company || '')}</td>
            </tr>
        `;
    }).join('');

    // Add click handlers to contact rows
    document.querySelectorAll('.contact-row').forEach(row => {
        row.addEventListener('click', handleContactClick);
    });
}

/**
 * Show loading state in contacts table
 */
function showContactsLoading() {
    elements.contactsTableBody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 20px;">
                Loading contacts...
            </td>
        </tr>
    `;
}

/**
 * Show error state in contacts table
 */
function showContactsError(message) {
    elements.contactsTableBody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 20px; color: #d32f2f;">
                Error: ${escapeHtml(message)}
            </td>
        </tr>
    `;
}

/**
 * Render selected contact info
 */
function renderSelectedContactInfo(contact) {
    const props = contact.properties || {};
    elements.selectedContactInfo.innerHTML = `
        <div class="contact-details">
            <p><strong>Name:</strong> ${escapeHtml(props.firstname || '')} ${escapeHtml(props.lastname || '')}</p>
            <p><strong>Email:</strong> ${escapeHtml(props.email || '')}</p>
            ${props.phone ? `<p><strong>Phone:</strong> ${escapeHtml(props.phone)}</p>` : ''}
            ${props.address ? `<p><strong>Address:</strong> ${escapeHtml(props.address)}</p>` : ''}
            ${props.jobtitle ? `<p><strong>Job Title:</strong> ${escapeHtml(props.jobtitle)}</p>` : ''}
            ${props.company ? `<p><strong>Company:</strong> ${escapeHtml(props.company)}</p>` : ''}
        </div>
    `;
}

/**
 * Render deals into the table
 */
function renderDeals(deals) {
    if (!deals || deals.length === 0) {
        elements.dealsTableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 20px;">
                    No deals yet
                </td>
            </tr>
        `;
        return;
    }

    elements.dealsTableBody.innerHTML = deals.map(deal => {
        const props = deal.properties || {};
        const amount = props.amount ? `$${parseFloat(props.amount).toFixed(2)}` : '-';
        return `
            <tr>
                <td>${escapeHtml(props.dealname || '')}</td>
                <td>${amount}</td>
                <td>${escapeHtml(formatDealStage(props.dealstage || ''))}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Show loading state in deals table
 */
function showDealsLoading() {
    elements.dealsTableBody.innerHTML = `
        <tr>
            <td colspan="3" style="text-align: center; padding: 20px;">
                Loading deals...
            </td>
        </tr>
    `;
}

/**
 * Show error state in deals table
 */
function showDealsError(message) {
    elements.dealsTableBody.innerHTML = `
        <tr>
            <td colspan="3" style="text-align: center; padding: 20px; color: #d32f2f;">
                Error: ${escapeHtml(message)}
            </td>
        </tr>
    `;
}

/**
 * Render AI insight into the card
 */
function renderAiInsight(insight) {
    const contentDiv = document.getElementById('ai-insight-content');
    if (!contentDiv) return;

    const { conversion_likelihood, rfm_segment, reasoning, next_best_action, usage_metrics } = insight;

    contentDiv.innerHTML = `
        <div class="ai-insight-data">
            <div class="insight-row">
                <strong>Conversion Likelihood:</strong>
                <span class="likelihood-badge likelihood-${conversion_likelihood.toLowerCase()}">${conversion_likelihood}</span>
            </div>

            <div class="insight-row">
                <strong>RFM Segment:</strong>
                <span>${escapeHtml(rfm_segment)}</span>
            </div>

            <div class="insight-section">
                <strong>Analysis:</strong>
                <p class="insight-reasoning">${escapeHtml(reasoning)}</p>
            </div>

            <div class="insight-section">
                <strong>Recommended Action:</strong>
                <p class="insight-action">${escapeHtml(next_best_action)}</p>
            </div>

            ${usage_metrics ? `
                <details class="usage-metrics-details">
                    <summary>View Simulated Usage Data</summary>
                    <div class="usage-metrics">
                        <p><small>Logins (7 days): ${usage_metrics.logins_last_7_days}</small></p>
                        <p><small>Schedules Created: ${usage_metrics.schedules_created}</small></p>
                        <p><small>Energy Reports Viewed: ${usage_metrics.energy_reports_viewed}</small></p>
                        <p><small>Trial Days Remaining: ${usage_metrics.trial_days_remaining}</small></p>
                    </div>
                </details>
            ` : ''}
        </div>
    `;
}

/**
 * Show loading state in AI insight card
 */
function showAiInsightLoading() {
    const contentDiv = document.getElementById('ai-insight-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = `
        <div class="ai-loading">
            <p>🤖 Analyzing contact data and generating insights...</p>
        </div>
    `;
}

/**
 * Show error state in AI insight card
 */
function showAiInsightError(message) {
    const contentDiv = document.getElementById('ai-insight-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = `
        <div class="ai-error">
            <p style="color: #d32f2f;">⚠️ Could not generate AI insight</p>
            <p style="font-size: 12px; color: #666;">${escapeHtml(message)}</p>
        </div>
    `;
}

// ===== EVENT HANDLERS =====

/**
 * Handle clicking on a contact row
 */
async function handleContactClick(event) {
    const row = event.currentTarget;
    const contactId = row.getAttribute('data-contact-id');

    // Remove previous selection
    document.querySelectorAll('.contact-row').forEach(r => {
        r.classList.remove('selected-row');
    });

    // Add selection to clicked row
    row.classList.add('selected-row');

    // Update state
    state.selectedContactId = contactId;
    state.selectedContactData = state.contacts.find(c => c.id === contactId);

    // Update hidden input for deal form
    elements.dealContactIdInput.value = contactId;

    // Render selected contact info
    if (state.selectedContactData) {
        renderSelectedContactInfo(state.selectedContactData);
    }

    // Fetch and render deals
    await loadDealsForContact(contactId);

    // Generate AI insight (non-blocking - runs in parallel)
    loadAiInsightForContact(state.selectedContactData, contactId);
}

/**
 * Handle Create Contact form submission
 */
async function handleCreateContactSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const firstname = formData.get('firstname')?.trim();
    const lastname = formData.get('lastname')?.trim();
    const email = formData.get('email')?.trim();
    const phone = formData.get('phone')?.trim();
    const address = formData.get('address')?.trim();

    // Validate required fields
    if (!firstname || !lastname || !email) {
        showFormError('create-contact-form', 'Please fill in all required fields (First Name, Last Name, Email)');
        return;
    }

    // Build properties object
    const properties = {
        firstname,
        lastname,
        email
    };

    if (phone) properties.phone = phone;
    if (address) properties.address = address;

    try {
        // Show loading state on button
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        // Create the contact
        const newContact = await createContact(properties);

        // Clear form and errors
        event.target.reset();
        clearFormError('create-contact-form');

        // Show success message
        showFormSuccess('create-contact-form', '✓ Contact created successfully!');

        // Wait for HubSpot's search index to update (Search API has eventual consistency)
        await new Promise(resolve => setTimeout(resolve, 12000));

        // Reload contacts (should now include the new contact at the top)
        await loadContacts();

        // Optionally select the newly created contact
        if (newContact && newContact.id) {
            const newRow = document.querySelector(`[data-contact-id="${newContact.id}"]`);
            if (newRow) {
                newRow.click();
            }
        }

        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

    } catch (error) {
        console.error('Error creating contact:', error);
        showFormError('create-contact-form', error.message);

        // Reset button
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Contact';
        submitBtn.disabled = false;
    }
}

/**
 * Handle Create Deal form submission
 */
async function handleCreateDealSubmit(event) {
    event.preventDefault();

    // Check if a contact is selected
    if (!state.selectedContactId) {
        showFormError('create-deal-form', 'Please select a contact first before creating a deal');
        return;
    }

    const formData = new FormData(event.target);
    const dealname = formData.get('dealname')?.trim();
    const amount = formData.get('amount')?.trim();
    const dealstage = formData.get('dealstage')?.trim();

    // Validate required fields
    if (!dealname || !amount || !dealstage) {
        showFormError('create-deal-form', 'Please fill in all required fields');
        return;
    }

    const dealProperties = {
        dealname,
        amount,
        dealstage
    };

    try {
        // Show loading state on button
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        // Create the deal
        await createDeal(dealProperties, state.selectedContactId);

        // Clear form and errors
        event.target.reset();
        // Reset to default value
        document.getElementById('deal-stage').value = 'closedwon';
        clearFormError('create-deal-form');

        // Show success message
        showFormSuccess('create-deal-form', '✓ Deal created successfully!');

        // Reload deals for the current contact
        await loadDealsForContact(state.selectedContactId);

        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

    } catch (error) {
        console.error('Error creating deal:', error);
        showFormError('create-deal-form', error.message);

        // Reset button
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Deal';
        submitBtn.disabled = false;
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format deal stage for display
 */
function formatDealStage(stage) {
    const stageMap = {
        'appointmentscheduled': 'Appointment Scheduled',
        'qualifiedtobuy': 'Qualified to Buy',
        'presentationscheduled': 'Presentation Scheduled',
        'decisionmakerboughtin': 'Decision Maker Bought-In',
        'contractsent': 'Contract Sent',
        'closedwon': 'Closed Won',
        'closedlost': 'Closed Lost'
    };
    return stageMap[stage] || stage;
}

/**
 * Show form error message
 */
function showFormError(formId, message) {
    clearFormError(formId);
    clearFormSuccess(formId);
    const form = document.getElementById(formId);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.style.color = '#d32f2f';
    errorDiv.style.marginTop = '10px';
    errorDiv.style.padding = '10px';
    errorDiv.style.backgroundColor = '#ffebee';
    errorDiv.style.borderRadius = '4px';
    errorDiv.textContent = message;
    form.appendChild(errorDiv);
}

/**
 * Clear form error message
 */
function clearFormError(formId) {
    const form = document.getElementById(formId);
    const existingError = form.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
}

/**
 * Show form success message
 */
function showFormSuccess(formId, message) {
    clearFormError(formId);
    clearFormSuccess(formId);
    const form = document.getElementById(formId);
    const successDiv = document.createElement('div');
    successDiv.className = 'form-success';
    successDiv.style.color = '#2e7d32';
    successDiv.style.marginTop = '10px';
    successDiv.style.padding = '10px';
    successDiv.style.backgroundColor = '#e8f5e9';
    successDiv.style.borderRadius = '4px';
    successDiv.textContent = message;
    form.appendChild(successDiv);
}

/**
 * Clear form success message
 */
function clearFormSuccess(formId) {
    const form = document.getElementById(formId);
    const existingSuccess = form.querySelector('.form-success');
    if (existingSuccess) {
        existingSuccess.remove();
    }
}

// ===== LOAD FUNCTIONS =====

/**
 * Load and render all contacts
 */
async function loadContacts() {
    showContactsLoading();
    try {
        const contacts = await fetchContacts();
        state.contacts = contacts;
        renderContacts(contacts);
    } catch (error) {
        console.error('Error loading contacts:', error);
        showContactsError(error.message);
    }
}

/**
 * Load and render deals for a specific contact
 */
async function loadDealsForContact(contactId) {
    showDealsLoading();
    try {
        const deals = await fetchDealsForContact(contactId);
        renderDeals(deals);
        // Store deals in state for AI insight
        state.currentDeals = deals;
    } catch (error) {
        console.error('Error loading deals:', error);
        showDealsError(error.message);
    }
}

/**
 * Load and render AI insight for a specific contact
 * This runs non-blocking so the UI doesn't wait for OpenAI
 */
async function loadAiInsightForContact(contact, contactId) {
    showAiInsightLoading();
    try {
        // Wait for deals to be loaded if not already
        let deals = state.currentDeals || [];

        // If deals aren't loaded yet, fetch them
        if (!state.currentDeals) {
            deals = await fetchDealsForContact(contactId);
        }

        // Prepare contact data for AI
        const contactData = {
            firstname: contact.properties?.firstname || contact.firstname,
            lastname: contact.properties?.lastname || contact.lastname,
            email: contact.properties?.email || contact.email
        };

        // Fetch AI insight
        const insight = await fetchAiInsight(contactData, deals);
        renderAiInsight(insight);
    } catch (error) {
        console.error('Error loading AI insight:', error);
        showAiInsightError(error.message);
    }
}

// ===== INITIALIZATION =====

/**
 * Initialize the application
 */
async function init() {
    // Load contacts on page load
    await loadContacts();

    // Set up form event listeners
    elements.contactForm.addEventListener('submit', handleCreateContactSubmit);
    elements.dealForm.addEventListener('submit', handleCreateDealSubmit);
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
