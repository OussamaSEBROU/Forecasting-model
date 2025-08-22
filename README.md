# Water Level Forecasting Application

A Flask-based web application that uses LSTM neural networks to forecast water levels from Excel data, with AI-powered hydrogeological analysis using Google's Gemini API.

## Features

- **File Upload**: Upload Excel files (.xlsx) with Date and Level columns
- **LSTM Forecasting**: Predict future water levels using pre-trained neural network
- **AI Analysis**: Get professional hydrogeological analysis using Gemini AI
- **Interactive Chat**: Ask questions about your data
- **Admin Dashboard**: Monitor application usage
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Python 3.11+
- Google Gemini API key (for AI features)

## Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/OussamaSEBROU/Forecasting-model.git
   cd Forecasting-model
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env file and add your GEMINI_API_KEY
   ```

5. **Run the application**:
   ```bash
   python app.py
   ```

6. **Access the application**:
   - Main app: http://localhost:5000
   - Admin dashboard: http://localhost:5000/admin

## Deployment on Render.com

### Method 1: Direct GitHub Integration

1. **Fork this repository** to your GitHub account

2. **Create a new Web Service** on Render.com:
   - Connect your GitHub account
   - Select the forked repository
   - Choose "Web Service"

3. **Configure the service**:
   - **Name**: Choose a unique name
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120`

4. **Set environment variables**:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `FLASK_ENV`: production
   - `FLASK_DEBUG`: False

5. **Deploy**: Click "Create Web Service"

### Method 2: Manual Deployment

1. **Prepare your files** (already done in this fixed version):
   - `Procfile`: Contains the startup command
   - `runtime.txt`: Specifies Python version
   - `requirements.txt`: Updated with CPU-only TensorFlow

2. **Upload to your repository** and follow Method 1

## File Structure

```
Forecasting-model/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── Procfile              # Render.com startup command
├── runtime.txt           # Python version specification
├── .env.example          # Environment variables template
├── standard_model.h5     # Pre-trained LSTM model
├── static/               # CSS, JS, and other static files
├── templates/            # HTML templates
└── README.md            # This file
```

## API Endpoints

- `GET /` - Main application page
- `GET /admin` - Admin dashboard
- `GET /api/stats` - Get visitor statistics
- `POST /api/upload` - Upload Excel file and get forecast
- `POST /api/analyze` - Get AI analysis of data
- `POST /api/chat` - Chat with AI about your data

## Data Format

Your Excel file should contain:
- **Date** column: Date values (any standard date format)
- **Level** column: Numeric water level values

Example:
| Date       | Level |
|------------|-------|
| 2023-01-01 | 45.2  |
| 2023-01-02 | 44.8  |
| 2023-01-03 | 46.1  |

## Troubleshooting

### Common Issues

1. **TensorFlow CUDA errors**: Fixed by using `tensorflow-cpu` instead of `tensorflow`
2. **Port binding issues**: Fixed by using `PORT` environment variable
3. **Missing dependencies**: All versions are pinned in requirements.txt

### Logs and Debugging

- Check Render.com logs for deployment issues
- Ensure all environment variables are set correctly
- Verify your Gemini API key is valid

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features | Yes |
| `PORT` | Port number (auto-set by Render) | No |
| `FLASK_ENV` | Flask environment (production/development) | No |
| `FLASK_DEBUG` | Enable/disable debug mode | No |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Render.com deployment logs
3. Ensure all environment variables are correctly set
4. Verify your Excel file format matches the requirements

