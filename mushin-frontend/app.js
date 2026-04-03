document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000';
    const USER_ID_STORAGE_KEY = 'mushin_user_id';
    const form = document.getElementById('mushin-form');
    const submitBtn = document.getElementById('submit-btn');
    const spinner = document.getElementById('spinner');
    const btnText = submitBtn.querySelector('span');
    
    const resultsContainer = document.getElementById('results-container');
    const emptyState = document.getElementById('empty-state');
    const outputSection = document.getElementById('output-section');
    
    // Output Elements
    const perfScoreEl = document.getElementById('perf-score');
    const xpGainedEl = document.getElementById('xp-gained');
    const stateBadgeEl = document.getElementById('state-badge');
    const stateExplanationEl = document.getElementById('state-explanation');

    // Hackathon prototype: starts with no historical streak data.
    const previousDays = [];
    const userId = getOrCreateLocalUserId();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get data
        const formData = new FormData(form);
        const data = {
            focus_hours: parseFloat(formData.get('focus_hours')),
            workout_minutes: parseInt(formData.get('workout_minutes'), 10),
            rest_hours: parseFloat(formData.get('rest_hours'))
        };

        // UI Loading state
        btnText.textContent = 'Processing...';
        spinner.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...data,
                    user_id: userId,
                    previous_days: previousDays
                })
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                const message = errorPayload.error || `Request failed with status ${response.status}`;
                throw new Error(message);
            }

            const result = await response.json();
            displayResults({
                ...data,
                ...result
            });
        } catch (error) {
            console.error('Failed to process data:', error);
            alert(`Error connecting to backend: ${error.message}`);
        } finally {
            // Restore UI
            btnText.textContent = 'Analyze Day';
            spinner.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });

    function displayResults(data) {
        // Hide empty state, show results
        emptyState.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        // Populate metrics
        perfScoreEl.textContent = data.score;
        xpGainedEl.textContent = data.xp;
        
        // Update State
        stateBadgeEl.textContent = data.state;
        stateExplanationEl.textContent = data.explanation;

        // Reset state classes
        outputSection.classList.remove('state-normal', 'state-strain', 'state-burnout', 'state-optimal');
        
        // Apply new state class
        if (data.state === 'OPTIMAL') {
            outputSection.classList.add('state-optimal');
        } else if (data.state === 'NORMAL') {
            outputSection.classList.add('state-normal');
        } else if (data.state === 'STRAIN') {
            outputSection.classList.add('state-strain');
        } else if (data.state === 'BURNOUT') {
            outputSection.classList.add('state-burnout');
        }
    }

    function getOrCreateLocalUserId() {
        try {
            const existingId = localStorage.getItem(USER_ID_STORAGE_KEY);
            if (existingId && existingId.trim()) {
                return existingId.trim();
            }
            const generatedId = `local-${generateClientId()}`;
            localStorage.setItem(USER_ID_STORAGE_KEY, generatedId);
            return generatedId;
        } catch (error) {
            console.warn('Local storage unavailable for user_id persistence:', error);
            return `local-${Date.now()}`;
        }
    }

    function generateClientId() {
        const cryptoApi = window.crypto || window.msCrypto;
        if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
            return cryptoApi.randomUUID();
        }

        if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
            const bytes = new Uint8Array(16);
            cryptoApi.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

});
