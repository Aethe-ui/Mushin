document.addEventListener('DOMContentLoaded', () => {
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get data
        const formData = new FormData(form);
        const data = {
            focus_hours: parseFloat(formData.get('focus_hours')),
            workout_minutes: parseInt(formData.get('workout_minutes'), 10),
            rest_hours: parseFloat(formData.get('rest_hours')),
            distraction_hours: parseFloat(formData.get('distraction_hours')) || 0
        };

        // UI Loading state
        btnText.textContent = 'Processing...';
        spinner.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            // SIMULATING API CALL TO BACKEND/CORE ENGINE
            // In production, this would be: 
            // const response = await fetch('/api/analyze', { method: 'POST', body: JSON.stringify(data) });
            // const result = await response.json();
            
            const result = await simulateBackendProcessing(data);
            
            displayResults(result);
            
        } catch (error) {
            console.error("Failed to process data:", error);
            alert("Error connecting to the Core Engine.");
        } finally {
            // Restore UI
            btnText.textContent = 'Analyze State';
            spinner.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });

    function displayResults(data) {
        // Hide empty state, show results
        emptyState.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        // Populate metrics
        perfScoreEl.textContent = data.performance_score;
        xpGainedEl.textContent = `+${data.xp_gained}`;
        
        // Update State
        stateBadgeEl.textContent = data.state;
        stateExplanationEl.textContent = data.explanation;

        // Reset state classes
        outputSection.classList.remove('state-normal', 'state-strain', 'state-burnout');
        
        // Apply new state class
        if (data.state === 'NORMAL') {
            outputSection.classList.add('state-normal');
        } else if (data.state === 'STRAIN') {
            outputSection.classList.add('state-strain');
        } else if (data.state === 'BURNOUT') {
            outputSection.classList.add('state-burnout');
        }
    }

    // Backend Simulation Logic 
    function simulateBackendProcessing(data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const { focus_hours, workout_minutes, rest_hours, distraction_hours } = data;
                
                let state = 'NORMAL';
                let performance_score = 85;
                let xp_gained = 120;
                let explanation = '';

                // Simple logic for demonstration
                const load = focus_hours + (workout_minutes / 60);
                const recovery = rest_hours;
                
                const distraction_penalty = distraction_hours * 10;
                const effective_load = load + (distraction_hours * 0.5);

                if (recovery < 5 && effective_load > 8) {
                    state = 'BURNOUT';
                    performance_score = Math.max(0, Math.floor(42 - distraction_penalty));
                    xp_gained = Math.max(0, Math.floor(15 - (distraction_hours * 3)));
                    explanation = 'Critical deficit in recovery detected. High load without adequate sleep has compromised efficiency. Distractions have further drained capacity.';
                } else if (recovery < 7 && effective_load > 6) {
                    state = 'STRAIN';
                    performance_score = Math.max(0, Math.floor(68 - distraction_penalty));
                    xp_gained = Math.max(0, Math.floor(50 - (distraction_hours * 5)));
                    explanation = 'Elevated load parameters with sub-optimal recovery. Consider increasing restorative protocols. Distraction hours are actively degrading performance.';
                } else {
                    if (distraction_hours > 4) {
                        state = 'STRAIN';
                        performance_score = Math.max(0, Math.floor(70 - distraction_penalty));
                        xp_gained = Math.max(0, Math.floor(40 - (distraction_hours * 5)));
                        explanation = 'High levels of distraction are inducing cognitive strain despite adequate recovery. Focus must be recalibrated to maintain optimal state.';
                    } else {
                        state = 'NORMAL';
                        performance_score = Math.max(0, Math.min(100, Math.floor(70 + (load * 3) + (recovery * 2) - distraction_penalty)));
                        xp_gained = Math.max(0, Math.floor(100 + (load * 20) - (distraction_hours * 15)));
                        explanation = 'Parameters nominal. Balance between capacity, recovery, and focus is optimal. Safe to maintain current output or progressively overload.';
                    }
                }

                resolve({
                    performance_score,
                    xp_gained,
                    state,
                    explanation
                });
            }, 800); // 800ms delay to simulate network request
        });
    }
});
