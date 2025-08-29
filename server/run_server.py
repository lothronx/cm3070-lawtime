#!/usr/bin/env python3
"""
Flask server runner for LawTime SMS OTP authentication service.
Run this script to start the development server.
"""

from app import create_app
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

if __name__ == "__main__":
    try:
        app = create_app()
        print("🚀 Starting LawTime SMS OTP Authentication Server")
        print("📱 SMS OTP Service: Ready")
        print("🔐 Authentication Endpoints:")
        print("   POST /api/auth/send-otp")
        print("   POST /api/auth/verify-otp")
        print("=" * 50)

        # Run Flask development server without reloader and threading
        # This prevents signal handling conflicts with Alibaba Cloud SDK credential system
        port = int(os.getenv("PORT", 5001))
        app.run(
            debug=False, host="0.0.0.0", port=port, threaded=False, use_reloader=False
        )

    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        exit(1)
