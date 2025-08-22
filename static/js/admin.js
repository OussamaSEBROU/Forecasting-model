/* File: static/js/admin.js
Description: JavaScript for the admin dashboard.
*/

document.addEventListener('DOMContentLoaded', () => {
    const visitorCountElement = document.getElementById('visitor-count');

    // Function to fetch stats from the backend
    const fetchStats = async () => {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Update the UI with a simple animation
            if (visitorCountElement.textContent !== data.visitor_count.toString()) {
                visitorCountElement.style.animation = 'none';
                // Trigger reflow
                visitorCountElement.offsetHeight; 
                visitorCountElement.style.animation = 'fadeIn 0.5s ease-in-out';
                visitorCountElement.textContent = data.visitor_count;
            }

        } catch (error) {
            console.error("Could not fetch stats:", error);
            visitorCountElement.textContent = 'Error';
        }
    };

    // Fetch stats immediately on page load
    fetchStats();

    // Poll for new stats every 5 seconds
    setInterval(fetchStats, 5000);
});

