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

        # Run Flask development server
        port = int(os.getenv("PORT", 5001))
        app.run(debug=True, host="0.0.0.0", port=port)

    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check your .env.local file has all required variables")
        print("2. Ensure Supabase credentials are valid")
        print("3. Verify Alibaba Cloud SMS credentials")
        exit(1)
