# PDF Operations - Flask Backend

This is the Python Flask backend for handling the file processing web application. It handles secure file uploads, temporary storage management, and exposes standard API routes for the React frontend.

## Folder Structure

```
backend/
├── app.py                # Main Flask application and routes
├── requirements.txt      # Python dependencies
├── temp_uploads/         # (Auto-generated) Ephemeral folder for incoming files
└── README.md             # This documentation
```

## Features
- **`/upload` Endpoint:** Accepts POST requests with `multipart/form-data`.
- **Auto-Cleanup Daemon:** Runs in the background and safely deletes any uploaded files residing in the `temp_uploads` folder that are older than 5 minutes.
- **Error Handling:** Standardized JSON error responses for `400 Bad Request`, `404 Not Found`, `413 Payload Too Large` (50MB limit), and `500 Server Error`.
- **CORS Support:** Handles Cross-Origin requests straight out-of-the-box so your React frontend running on Vite (`localhost:5173`) won't be blocked.

## Setup Instructions

1. **Install Virtual Environment (Optional but recommended):**
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Development Server:**
   ```bash
   python app.py
   ```
   The backend will start running on `http://127.0.0.1:5000/`.
