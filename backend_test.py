import requests
import sys
import json
from datetime import datetime

class AuthAPITester:
    def __init__(self, base_url="https://auth-page-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if headers:
            default_headers.update(headers)
        
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        print(f"   Expected Status: {expected_status}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=10)

            print(f"   Actual Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
                print(f"   Response: {json.dumps(response_data, indent=2)}")
            except:
                response_data = response.text
                print(f"   Response: {response_data}")

            if success:
                self.log_test(name, True, f"Status {response.status_code} as expected")
                return True, response_data
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, response_data

        except requests.exceptions.RequestException as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   Error: {error_msg}")
            self.log_test(name, False, error_msg)
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_register_user(self, username, email, password):
        """Test user registration"""
        data = {
            "username": username,
            "email": email,
            "password": password
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=data
        )
        
        if success and isinstance(response, dict):
            if 'access_token' in response and 'user' in response:
                self.token = response['access_token']
                self.user_data = response['user']
                self.log_test("Registration Token Received", True, "Token and user data received")
                return True
            else:
                self.log_test("Registration Response Format", False, "Missing access_token or user in response")
        
        return False

    def test_login_user(self, username, password):
        """Test user login"""
        data = {
            "username": username,
            "password": password
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=data
        )
        
        if success and isinstance(response, dict):
            if 'access_token' in response and 'user' in response:
                self.token = response['access_token']
                self.user_data = response['user']
                self.log_test("Login Token Received", True, "Token and user data received")
                return True
            else:
                self.log_test("Login Response Format", False, "Missing access_token or user in response")
        
        return False

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {
            "username": "nonexistent_user",
            "password": "wrong_password"
        }
        
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data=data
        )
        
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available")
            return False
            
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success and isinstance(response, dict):
            if 'username' in response and 'email' in response:
                self.log_test("User Info Format", True, "User info contains required fields")
                return True
            else:
                self.log_test("User Info Format", False, "Missing required fields in user info")
        
        return False

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        if not self.token:
            self.log_test("Dashboard Stats", False, "No token available")
            return False
            
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success and isinstance(response, dict):
            if 'message' in response and 'stats' in response:
                self.log_test("Dashboard Stats Format", True, "Dashboard stats contain required fields")
                return True
            else:
                self.log_test("Dashboard Stats Format", False, "Missing required fields in dashboard stats")
        
        return False

    def test_protected_route_without_token(self):
        """Test accessing protected route without token"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Protected Route Without Token",
            "GET",
            "dashboard/stats",
            401
        )
        
        # Restore token
        self.token = temp_token
        return success

    def test_duplicate_registration(self, username, email, password):
        """Test registering with existing username/email"""
        data = {
            "username": username,
            "email": email,
            "password": password
        }
        
        success, response = self.run_test(
            "Duplicate Registration",
            "POST",
            "auth/register",
            400,
            data=data
        )
        
        return success

def main():
    print("🚀 Starting Auth System API Tests")
    print("=" * 50)
    
    # Setup
    tester = AuthAPITester()
    test_user = f"testuser_{datetime.now().strftime('%H%M%S')}"
    test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
    test_password = "TestPass123!"

    # Test sequence
    print("\n📋 Running API Tests...")
    
    # 1. Test API root
    tester.test_api_root()
    
    # 2. Test user registration
    if not tester.test_register_user(test_user, test_email, test_password):
        print("❌ Registration failed, stopping tests")
        return 1
    
    # 3. Test duplicate registration
    tester.test_duplicate_registration(test_user, test_email, test_password)
    
    # 4. Test current user info
    tester.test_get_current_user()
    
    # 5. Test dashboard stats
    tester.test_dashboard_stats()
    
    # 6. Test protected route without token
    tester.test_protected_route_without_token()
    
    # 7. Test login with valid credentials
    # Clear token first to test fresh login
    tester.token = None
    if not tester.test_login_user(test_user, test_password):
        print("❌ Login failed")
    
    # 8. Test login with invalid credentials
    tester.test_login_invalid_credentials()
    
    # 9. Test dashboard stats again after login
    tester.test_dashboard_stats()

    # Print final results
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    # Save detailed results
    results_file = "/app/test_reports/backend_api_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "failed_tests": tester.tests_run - tester.tests_passed,
                "success_rate": tester.tests_passed / tester.tests_run * 100,
                "timestamp": datetime.now().isoformat()
            },
            "test_results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())