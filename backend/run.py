from app import create_app  # factory function that builds the Flask app
from app.core import config  # settings (DEBUG, database connection info, ...)

# Create the Flask application object
app = create_app()

if __name__ == "__main__":
    # Start the development server:
    # host="0.0.0.0" accepts connections from outside (e.g. outside the Docker container)
    # debug=True auto-restarts on code changes and shows detailed error pages
    app.run(host="0.0.0.0", port=8000, debug=config.DEBUG)
