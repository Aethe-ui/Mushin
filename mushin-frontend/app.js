document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000';
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

});
