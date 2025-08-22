
# -----------------------------------------------------------------------------
# File: app.py
# Description: Main Flask application file. Handles backend logic.
# -----------------------------------------------------------------------------

import os
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, render_template, abort
from werkzeug.utils import secure_filename
import tensorflow as tf
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')

# --- Configuration ---
# Configure Gemini API
# IMPORTANT: Set your GEMINI_API_KEY in a .env file or as an environment variable
# For deployment (e.g., on Render), this will be set in the dashboard.
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    generation_config = {
        "temperature": 0.7,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": 2048,
    }
    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]
    gemini_model = genai.GenerativeModel(model_name="gemini-1.0-pro",
                                        generation_config=generation_config,
                                        safety_settings=safety_settings)
except KeyError:
    print("ERROR: GEMINI_API_KEY not found. Please set it as an environment variable.")
    gemini_model = None


# File upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- Model Loading ---
# Load the pre-trained LSTM model
# The 'standard_model.h5' file should be in the same directory as app.py
try:
    model = tf.keras.models.load_model('standard_model.h5')
    # A simple check to see if model loaded
    print("LSTM model 'standard_model.h5' loaded successfully.")
    print(model.summary())
except (IOError, ImportError) as e:
    print(f"Error loading model 'standard_model.h5': {e}")
    print("Please ensure the model file is present and you have tensorflow installed.")
    model = None

# --- In-Memory Visitor Counter for Admin Dashboard ---
# Note: This is a simple counter that resets when the server restarts.
# For a production environment, you'd use a database or a service like Redis.
visitor_count = 0

# --- Helper Functions ---
def allowed_file(filename):
    """Checks if the uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_data_for_prediction(df, time_step=100):
    """Prepares the data for LSTM prediction."""
    # We only need the 'Level' column for prediction
    data = df['Level'].values.reshape(-1, 1)

    # For simplicity, we'll use the last `time_step` points to predict the future
    # A more robust solution would involve scaling the data as it was during training
    if len(data) < time_step:
        # Pad with zeros if not enough data
        padding = np.zeros((time_step - len(data), 1))
        data = np.vstack([padding, data])
    
    # Get the last `time_step` data points
    input_data = data[-time_step:].reshape(1, time_step, 1)
    return input_data

# --- Flask Routes ---

@app.route('/')
def index():
    """Serves the main application page."""
    global visitor_count
    visitor_count += 1
    return render_template('index.html')

@app.route('/admin')
def admin():
    """Serves the admin dashboard page."""
    return render_template('admin.html')

@app.route('/api/stats')
def get_stats():
    """API endpoint for the admin dashboard to fetch visitor count."""
    return jsonify({"visitor_count": visitor_count})

@app.route('/api/upload', methods=['POST'])
def upload_and_forecast():
    """
    Handles file upload, data processing, and forecasting.
    This single endpoint simplifies the frontend logic.
    """
    if model is None:
        return jsonify({"error": "LSTM model is not loaded on the server."}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            # Read the excel file, targeting specific columns
            df = pd.read_excel(filepath, engine='openpyxl')
            if 'Date' not in df.columns or 'Level' not in df.columns:
                return jsonify({"error": "The .xlsx file must contain 'Date' and 'Level' columns."}), 400

            # Ensure 'Date' is datetime and 'Level' is numeric
            df['Date'] = pd.to_datetime(df['Date'])
            df['Level'] = pd.to_numeric(df['Level'], errors='coerce')
            df.dropna(subset=['Date', 'Level'], inplace=True)
            df.sort_values('Date', inplace=True)

            # --- Forecasting Logic ---
            time_step = 100
            input_data = preprocess_data_for_prediction(df, time_step)
            
            # Predict the next 30 days (as an example)
            n_future = 30
            forecast = []
            current_input = input_data.copy()

            for _ in range(n_future):
                prediction = model.predict(current_input)[0][0]
                forecast.append(prediction)
                # Update the input for the next prediction
                new_input_step = np.array([[prediction]])
                current_input = np.append(current_input[:, 1:, :], new_input_step.reshape(1, 1, 1), axis=1)

            # --- Prepare Response Data ---
            original_data = {
                "dates": df['Date'].dt.strftime('%Y-%m-%d').tolist(),
                "levels": df['Level'].tolist()
            }

            last_date = df['Date'].iloc[-1]
            forecast_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=n_future).strftime('%Y-%m-%d').tolist()
            
            forecast_data = {
                "dates": forecast_dates,
                "levels": [float(f) for f in forecast] # Ensure JSON serializable
            }

            return jsonify({
                "original_data": original_data,
                "forecast_data": forecast_data
            })

        except Exception as e:
            print(f"Error processing file: {e}")
            return jsonify({"error": f"An error occurred while processing the file: {str(e)}"}), 500
        finally:
            # Clean up the uploaded file
            if os.path.exists(filepath):
                os.remove(filepath)
    else:
        return jsonify({"error": "Invalid file type. Please upload a .xlsx file."}), 400


@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    """Provides a hydrogeological analysis of the data using Gemini."""
    if not gemini_model:
        return jsonify({"error": "Gemini AI model not configured on the server."}), 500

    data = request.json
    if not data or 'original_data' not in data or 'forecast_data' not in data:
        return jsonify({"error": "Missing data for analysis."}), 400

    try:
        # Create a concise summary of the data for the prompt
        original_summary = pd.DataFrame(data['original_data']).describe().to_string()
        forecast_summary = pd.DataFrame(data['forecast_data']).describe().to_string()

        prompt = f"""
        As a senior hydrogeologist with 30 years of experience, provide a detailed, professional analysis of the following water level data. The user has provided historical data and an LSTM-based forecast.

        Your analysis must be precise, clear, and structured like a formal report for a data analyst or water resource manager. Cover the following points:
        1.  **Historical Data Interpretation:** Briefly describe the trends, seasonality, and any anomalies observed in the original data.
        2.  **Forecast Evaluation:** Comment on the forecasted trend. Does it appear plausible based on the historical data? What do the forecasted levels signify?
        3.  **Hydrogeological Implications:** What are the potential real-world implications of these observed and forecasted water levels? Consider factors like aquifer recharge/depletion, potential for water scarcity or flooding, and sustainability.
        4.  **Recommendations:** Based on your analysis, provide actionable recommendations for monitoring, management, or further investigation.

        **Historical Data Summary:**
        {original_summary}

        **Forecasted Data Summary (next 30 days):**
        {forecast_summary}

        Begin your analysis now.
        """

        response = gemini_model.generate_content(prompt)
        return jsonify({"analysis": response.text})

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": "Failed to get analysis from AI model."}), 500


@app.route('/api/chat', methods=['POST'])
def chat_with_data():
    """Allows users to ask questions about their data via Gemini."""
    if not gemini_model:
        return jsonify({"error": "Gemini AI model not configured on the server."}), 500

    data = request.json
    if not data or 'question' not in data or 'full_data_context' not in data:
        return jsonify({"error": "Missing question or data context for chat."}), 400

    question = data['question']
    context = data['full_data_context']

    try:
        prompt = f"""
        You are a helpful data assistant. A user is asking a question about their water level data.
        Use the provided data context to answer their question accurately and concisely.

        **Data Context (Original and Forecasted Levels):**
        {context}

        **User's Question:**
        "{question}"

        Answer the user's question based *only* on the provided data context.
        """
        response = gemini_model.generate_content(prompt)
        return jsonify({"answer": response.text})

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": "Failed to get answer from AI model."}), 500

if __name__ == '__main__':
    # Use host='0.0.0.0' to make it accessible on your network
    # Debug mode should be False in production
    app.run(host='0.0.0.0', port=5000, debug=False)

