/* File: static/js/script.js
Description: Frontend JavaScript logic for the main application.
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let chartInstance = null;
    let fullData = null; // To store both original and forecast data

    // --- DOM ELEMENT SELECTORS ---
    const body = document.body;
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const fileInput = document.getElementById('file-input');
    const fileUploadLabel = document.getElementById('file-upload-label');
    const fileNameSpan = document.getElementById('file-name');
    const uploadBtn = document.getElementById('upload-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsSection = document.getElementById('results-section');
    const analysisContent = document.getElementById('analysis-content');
    const analysisLoader = document.getElementById('analysis-loader');
    const downloadDataBtn = document.getElementById('download-data-btn');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatWindow = document.getElementById('chat-window');
    const reportContentArea = document.getElementById('report-content-area');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    // --- INITIALIZATION ---
    const initializeTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            body.classList.replace('light-mode', 'dark-mode');
        }
    };

    // --- EVENT LISTENERS ---
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    themeToggle.addEventListener('click', toggleTheme);
    navLinks.forEach(link => link.addEventListener('click', handlePageNavigation));
    fileInput.addEventListener('change', updateFileName);
    uploadBtn.addEventListener('click', handleFileUploadAndForecast);
    downloadDataBtn.addEventListener('click', downloadAllData);
    chatSendBtn.addEventListener('click', handleChatMessage);
    chatInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleChatMessage();
    });
    generatePdfBtn.addEventListener('click', handlePdfGeneration);

    // --- THEME SWITCHING ---
    function toggleTheme() {
        if (body.classList.contains('light-mode')) {
            body.classList.replace('light-mode', 'dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.replace('dark-mode', 'light-mode');
            localStorage.setItem('theme', 'light');
        }
    }

    // --- PAGE NAVIGATION ---
    function handlePageNavigation(e) {
        e.preventDefault();
        const targetPageId = e.currentTarget.dataset.page;

        // Update active link
        navLinks.forEach(link => link.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Show target page
        pages.forEach(page => {
            page.classList.toggle('active', page.id === `${targetPageId}-page`);
        });
    }

    // --- FILE UPLOAD & FORECASTING ---
    function updateFileName() {
        fileNameSpan.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : 'Click to select your .xlsx file';
    }

    async function handleFileUploadAndForecast() {
        if (fileInput.files.length === 0) {
            alert('Please select a file first.');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        // Show loading state
        loadingIndicator.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        uploadBtn.disabled = true;
        resetUI();

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            fullData = data; // Store the complete data
            displayResults(data);
            
            // After displaying chart, fetch AI analysis
            fetchAndDisplayAnalysis(data);

        } catch (error) {
            console.error('Upload/Forecast Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            // Hide loading state
            loadingIndicator.classList.add('hidden');
            uploadBtn.disabled = false;
        }
    }

    // --- DISPLAY & VISUALIZATION ---
    function displayResults(data) {
        resultsSection.classList.remove('hidden');
        const { original_data, forecast_data } = data;

        const ctx = document.getElementById('forecast-chart').getContext('2d');
        
        if (chartInstance) {
            chartInstance.destroy();
        }

        const chartConfig = {
            type: 'line',
            data: {
                labels: [...original_data.dates, ...forecast_data.dates],
                datasets: [{
                    label: 'Historical Level',
                    data: original_data.levels,
                    borderColor: body.classList.contains('dark-mode') ? '#60a5fa' : '#3b82f6',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 1,
                }, {
                    label: 'Forecasted Level',
                    data: new Array(original_data.levels.length).fill(null).concat(forecast_data.levels),
                    borderColor: body.classList.contains('dark-mode') ? '#f472b6' : '#ec4899',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Date' },
                        ticks: { color: body.classList.contains('dark-mode') ? '#94a3b8' : '#64748b' }
                    },
                    y: {
                        title: { display: true, text: 'Water Level' },
                        ticks: { color: body.classList.contains('dark-mode') ? '#94a3b8' : '#64748b' }
                    }
                },
                plugins: {
                    legend: { labels: { color: body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b' } }
                }
            }
        };
        chartInstance = new Chart(ctx, chartConfig);

        // Enable download and chat features
        downloadDataBtn.disabled = false;
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        generatePdfBtn.disabled = false;
    }

    // --- AI ANALYSIS ---
    async function fetchAndDisplayAnalysis(data) {
        analysisLoader.classList.remove('hidden');
        analysisContent.classList.add('placeholder');
        analysisContent.innerHTML = '';

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch analysis.');
            }

            const result = await response.json();
            analysisContent.innerHTML = `<p>${result.analysis.replace(/\n/g, '<br>')}</p>`;
            analysisContent.classList.remove('placeholder');
            
            // Also populate the report page
            populateReportContent(data, result.analysis);

        } catch (error) {
            console.error('Analysis Error:', error);
            analysisContent.innerHTML = `<p class="error">Error: Could not retrieve AI analysis.</p>`;
        } finally {
            analysisLoader.classList.add('hidden');
        }
    }

    // --- DATA CHATBOT ---
    async function handleChatMessage() {
        const question = chatInput.value.trim();
        if (!question || !fullData) return;

        addChatMessage(question, 'user');
        chatInput.value = '';
        chatSendBtn.disabled = true;

        try {
            // Prepare context for the chatbot
            const context = `Original Data Points: ${fullData.original_data.levels.length}. Forecasted Data Points: ${fullData.forecast_data.levels.length}. Combined Date Range: ${fullData.original_data.dates[0]} to ${fullData.forecast_data.dates[fullData.forecast_data.dates.length - 1]}.`;
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, full_data_context: context }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get chat response.');
            }

            const result = await response.json();
            addChatMessage(result.answer, 'bot');

        } catch (error) {
            console.error('Chat Error:', error);
            addChatMessage(`Sorry, I encountered an error: ${error.message}`, 'bot');
        } finally {
            chatSendBtn.disabled = false;
        }
    }

    function addChatMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        messageElement.innerHTML = `<p>${message.replace(/\n/g, '<br>')}</p>`;
        chatWindow.appendChild(messageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // --- DATA DOWNLOAD ---
    function downloadAllData() {
        if (!fullData) return;
        const { original_data, forecast_data } = fullData;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Level,Type\n";

        original_data.dates.forEach((date, index) => {
            csvContent += `${date},${original_data.levels[index]},Historical\n`;
        });
        forecast_data.dates.forEach((date, index) => {
            csvContent += `${date},${forecast_data.levels[index]},Forecasted\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "hydroforecast_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // --- REPORT GENERATION ---
    function populateReportContent(data, analysis) {
        reportContentArea.classList.remove('placeholder');
        const today = new Date().toLocaleDateString();
        reportContentArea.innerHTML = `
            <div id="pdf-content">
                <h1 style="color: #0f3460;">HydroForecast AI Analysis Report</h1>
                <p><strong>Date Generated:</strong> ${today}</p>
                <hr>
                <h2>1. Data Overview</h2>
                <p>This report covers ${data.original_data.dates.length} historical data points and ${data.forecast_data.dates.length} forecasted data points.</p>
                <p><strong>Date Range:</strong> ${data.original_data.dates[0]} to ${data.forecast_data.dates[data.forecast_data.dates.length - 1]}</p>
                
                <h2>2. Data Visualization</h2>
                <p>The following chart displays the historical and forecasted water levels.</p>
                <!-- Canvas image will be inserted here by jsPDF logic -->
                
                <h2>3. Hydrogeological AI Analysis</h2>
                <p>${analysis.replace(/\n/g, '<br>')}</p>
                 <hr>
                <p style="text-align: center; font-size: 0.8em; color: #666;">Report generated by HydroForecast AI</p>
            </div>
        `;
    }

    async function handlePdfGeneration() {
        const { jsPDF } = window.jspdf;
        const pdfContent = document.getElementById('pdf-content');
        if (!pdfContent) return;

        generatePdfBtn.textContent = 'Generating...';
        generatePdfBtn.disabled = true;

        try {
            // Create a temporary container for the chart to ensure correct rendering size
            const chartCanvas = document.getElementById('forecast-chart');
            const chartImage = chartCanvas.toDataURL('image/png', 1.0);

            const doc = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            // Add content using html2canvas
            const canvas = await html2canvas(pdfContent, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let currentHeight = 0;

            // Header
            doc.setFontSize(22);
            doc.setTextColor('#0f3460');
            doc.text('HydroForecast AI Analysis Report', 15, 20);
            currentHeight += 25;

            // Date
            doc.setFontSize(11);
            doc.setTextColor('#333333');
            doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 15, 30);
            currentHeight += 15;
            
            // Add chart image
            doc.setFontSize(16);
            doc.setTextColor('#1e293b');
            doc.text('Data Visualization', 15, currentHeight);
            currentHeight += 8;
            doc.addImage(chartImage, 'PNG', 15, currentHeight, pdfWidth - 30, 100);
            currentHeight += 110;

            // Add analysis text
            doc.setFontSize(16);
            doc.text('Hydrogeological AI Analysis', 15, currentHeight);
            currentHeight += 8;
            
            const analysisText = analysisContent.innerText;
            const splitText = doc.splitTextToSize(analysisText, pdfWidth - 30);
            doc.setFontSize(11);
            doc.text(splitText, 15, currentHeight);
            
            doc.save('HydroForecast_AI_Report.pdf');

        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF report.");
        } finally {
            generatePdfBtn.textContent = 'Download Report as PDF';
            generatePdfBtn.disabled = false;
        }
    }


    // --- UTILITY FUNCTIONS ---
    function resetUI() {
        // Resets the interface when a new file is uploaded
        if (chartInstance) chartInstance.destroy();
        analysisContent.classList.add('placeholder');
        analysisContent.innerHTML = '<p>Your AI-powered data analysis will appear here after the forecast is generated.</p>';
        downloadDataBtn.disabled = true;
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        generatePdfBtn.disabled = true;
        chatWindow.innerHTML = '<div class="chat-message bot"><p>Hello! Once you\'ve generated a forecast, I can answer questions about your data.</p></div>';
        reportContentArea.classList.add('placeholder');
        reportContentArea.innerHTML = '<p>Generate a forecast on the dashboard to create your report.</p>';
    }

    // --- Run Initialization ---
    initializeTheme();
});

