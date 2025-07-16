#!/usr/bin/env python3
"""
Real API Test Script for SMS OTP Authentication
===============================================
⚠️  COST WARNING: This script sends REAL SMS messages which cost money!
    Use sparingly - recommended only 2-3 times during development.
    
Purpose: Test actual SMS integration and demonstrate real functionality.
Usage: python test_auth.py [phone_number]
Note: Make sure Flask server is running on localhost:5001
"""

import requests
import json
import time
import sys

BASE_URL = "http://localhost:5001"


def test_send_otp(phone_number):
    """Test the /auth/send-otp endpoint."""
    print(f"\n=== Testing /auth/send-otp for {phone_number} ===")
    
    url = f"{BASE_URL}/auth/send-otp"
    payload = {"phone_number": phone_number}
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ OTP sent successfully!")
            return True
        else:
            print("❌ Failed to send OTP")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False


def test_verify_otp(phone_number, otp_code):
    """Test the /auth/verify-otp endpoint."""
    print(f"\n=== Testing /auth/verify-otp for {phone_number} with code {otp_code} ===")
    
    url = f"{BASE_URL}/auth/verify-otp"
    payload = {
        "phone_number": phone_number,
        "otp_code": otp_code
    }
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        response_data = response.json()
        print(f"Response: {json.dumps(response_data, indent=2)}")
        
        if response.status_code == 200:
            print("✅ OTP verification successful!")
            return response_data
        else:
            print("❌ OTP verification failed")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None


def test_rate_limiting(phone_number):
    """Test rate limiting by sending multiple OTP requests."""
    print(f"\n=== Testing rate limiting for {phone_number} ===")
    
    for i in range(6):  # Try 6 times to trigger rate limit
        print(f"Attempt {i+1}/6")
        success = test_send_otp(phone_number)
        time.sleep(1)  # Small delay between requests
        
        if not success and i >= 4:  # Should be rate limited after 5 attempts
            print("✅ Rate limiting working correctly!")
            return True
    
    print("❌ Rate limiting may not be working")
    return False


def test_invalid_inputs():
    """Test various invalid input scenarios."""
    print(f"\n=== Testing invalid inputs ===")
    
    url_send = f"{BASE_URL}/auth/send-otp"
    url_verify = f"{BASE_URL}/auth/verify-otp"
    headers = {"Content-Type": "application/json"}
    
    # Test cases
    test_cases = [
        # Send OTP tests
        {"url": url_send, "payload": {}, "description": "Missing phone number"},
        {"url": url_send, "payload": {"phone_number": ""}, "description": "Empty phone number"},
        {"url": url_send, "payload": {"phone_number": "invalid"}, "description": "Invalid phone format"},
        
        # Verify OTP tests
        {"url": url_verify, "payload": {}, "description": "Missing both phone and OTP"},
        {"url": url_verify, "payload": {"phone_number": "18501052017"}, "description": "Missing OTP code"},
        {"url": url_verify, "payload": {"phone_number": "18501052017", "otp_code": "wrong"}, "description": "Invalid OTP code"},
    ]
    
    for test_case in test_cases:
        print(f"\nTesting: {test_case['description']}")
        try:
            response = requests.post(test_case["url"], json=test_case["payload"], headers=headers)
            print(f"Status: {response.status_code}, Response: {response.json()}")
            
            if response.status_code >= 400:
                print("✅ Correctly rejected invalid input")
            else:
                print("❌ Should have rejected invalid input")
                
        except Exception as e:
            print(f"❌ Request failed: {e}")


def main():
    """Main test function."""
    print("🧪 LawTime SMS OTP Authentication Tests")
    print("=" * 50)
    
    # Default test phone number
    test_phone = "18501052017"  
    
    if len(sys.argv) > 1:
        test_phone = sys.argv[1]
    
    print(f"Using test phone number: {test_phone}")
    print("Note: Make sure the Flask server is running on http://localhost:5001")
    
    # Test invalid inputs first
    test_invalid_inputs()
    
    # Test rate limiting
    test_rate_limiting(test_phone)
    
    # Interactive OTP test
    print(f"\n=== Interactive OTP Test ===")
    if test_send_otp(test_phone):
        otp_code = input("\nEnter the OTP code you received: ").strip()
        if otp_code:
            result = test_verify_otp(test_phone, otp_code)
            if result:
                print(f"\n✅ Authentication complete!")
                print(f"User ID: {result.get('user', {}).get('id')}")
                print(f"Access Token: {result.get('session', {}).get('access_token', '')[:50]}...")
    
    print("\n🏁 Testing complete!")


if __name__ == "__main__":
    main()