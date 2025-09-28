import requests
import sys
import json
from datetime import datetime, timedelta

class QuestionBankAPITester:
    def __init__(self, base_url="https://auth-page-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            self.log_test(name, False, error_msg)
            return False, {}

    def test_auth_and_setup(self):
        """Test authentication and setup"""
        print("\n" + "="*50)
        print("AUTHENTICATION & SETUP TESTS")
        print("="*50)
        
        # Test registration with unique username
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = f"testuser_{timestamp}"
        test_email = f"test_{timestamp}@example.com"
        test_password = "TestPass123!"

        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "username": test_user,
                "email": test_email,
                "password": test_password
            }
        )

        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   ✅ Token obtained: {self.token[:20]}...")
            return True
        else:
            # Try login if registration failed (user might exist)
            success, response = self.run_test(
                "User Login (Fallback)",
                "POST",
                "auth/login",
                200,
                data={
                    "username": test_user,
                    "password": test_password
                }
            )
            
            if success and 'access_token' in response:
                self.token = response['access_token']
                print(f"   ✅ Token obtained via login: {self.token[:20]}...")
                return True
            
            print("❌ Failed to authenticate - cannot proceed with Question Bank tests")
            return False

    def test_question_bank_endpoints(self):
        """Test all Question Bank CRUD endpoints"""
        print("\n" + "="*50)
        print("QUESTION BANK CRUD TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping Question Bank tests")
            return
        
        # Test data for question creation
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        test_question_data = {
            "category": "Test Kategori",
            "question_text": "Bu bir test sorusudur. Sistem düzgün çalışıyor mu?",
            "importance_reason": "Bu soru test amaçlı oluşturulmuştur ve sistemin doğru çalışıp çalışmadığını kontrol eder.",
            "expected_action": "Test sonuçlarını değerlendirin ve gerekli düzeltmeleri yapın.",
            "period": "Haftalık",
            "deadline": tomorrow,
            "chart_type": "Sütun"
        }

        # 1. Test Question Creation
        success, response = self.run_test(
            "Create Question",
            "POST",
            "questions",
            200,
            data=test_question_data
        )
        
        question_id = None
        if success and 'id' in response:
            question_id = response['id']
            print(f"   ✅ Question created with ID: {question_id}")
        
        # 2. Test Get All Questions
        success, response = self.run_test(
            "Get All Questions",
            "GET",
            "questions",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} questions")
        
        # 3. Test Get Single Question (if we have an ID)
        if question_id:
            success, response = self.run_test(
                "Get Single Question",
                "GET",
                f"questions/{question_id}",
                200
            )
            
            if success:
                print(f"   ✅ Retrieved question: {response.get('category', 'Unknown')}")
        
        # 4. Test Question Update (if we have an ID)
        if question_id:
            updated_data = test_question_data.copy()
            updated_data['category'] = "Updated Test Kategori"
            updated_data['period'] = "Aylık"
            
            success, response = self.run_test(
                "Update Question",
                "PUT",
                f"questions/{question_id}",
                200,
                data=updated_data
            )
            
            if success:
                print(f"   ✅ Question updated successfully")
        
        # 5. Test Question Deletion (if we have an ID)
        if question_id:
            success, response = self.run_test(
                "Delete Question",
                "DELETE",
                f"questions/{question_id}",
                200
            )
            
            if success:
                print(f"   ✅ Question deleted successfully")

    def test_question_validation(self):
        """Test Question validation rules"""
        print("\n" + "="*50)
        print("QUESTION VALIDATION TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping validation tests")
            return
        
        # Test invalid period
        invalid_period_data = {
            "category": "Test",
            "question_text": "Test question with invalid period",
            "importance_reason": "Testing validation",
            "expected_action": "Should fail validation",
            "period": "InvalidPeriod",  # Invalid period
            "deadline": "2024-12-31",
            "chart_type": "Sütun"
        }
        
        success, response = self.run_test(
            "Invalid Period Validation",
            "POST",
            "questions",
            422,  # Expecting validation error
            data=invalid_period_data
        )
        
        # Test invalid chart type
        invalid_chart_data = {
            "category": "Test",
            "question_text": "Test question with invalid chart type",
            "importance_reason": "Testing validation",
            "expected_action": "Should fail validation",
            "period": "Haftalık",
            "deadline": "2024-12-31",
            "chart_type": "InvalidChart"  # Invalid chart type
        }
        
        success, response = self.run_test(
            "Invalid Chart Type Validation",
            "POST",
            "questions",
            422,  # Expecting validation error
            data=invalid_chart_data
        )
        
        # Test invalid date format
        invalid_date_data = {
            "category": "Test",
            "question_text": "Test question with invalid date",
            "importance_reason": "Testing validation",
            "expected_action": "Should fail validation",
            "period": "Haftalık",
            "deadline": "invalid-date",  # Invalid date format
            "chart_type": "Sütun"
        }
        
        success, response = self.run_test(
            "Invalid Date Format Validation",
            "POST",
            "questions",
            400,  # Expecting bad request
            data=invalid_date_data
        )
        
        # Test missing required fields
        incomplete_data = {
            "category": "Test",
            # Missing required fields
        }
        
        success, response = self.run_test(
            "Missing Required Fields Validation",
            "POST",
            "questions",
            422,  # Expecting validation error
            data=incomplete_data
        )

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint includes question count"""
        print("\n" + "="*50)
        print("DASHBOARD STATS TEST")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping dashboard stats test")
            return
        
        success, response = self.run_test(
            "Dashboard Stats with Question Count",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success and 'stats' in response:
            stats = response['stats']
            if 'total_questions' in stats:
                print(f"   ✅ Question count in stats: {stats['total_questions']}")
            else:
                self.log_test("Question Count in Dashboard Stats", False, "total_questions not found in stats")

    def save_results(self):
        """Save test results to file"""
        results = {
            "test_summary": {
                "total_tests": self.tests_run,
                "passed_tests": self.tests_passed,
                "failed_tests": self.tests_run - self.tests_passed,
                "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%",
                "timestamp": datetime.now().isoformat()
            },
            "detailed_results": self.test_results
        }
        
        with open('/app/test_reports/backend_api_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📊 Results saved to /app/test_reports/backend_api_results.json")

    def run_all_tests(self):
        """Run all Question Bank tests"""
        print("🚀 Starting Question Bank API Testing...")
        print(f"Backend URL: {self.base_url}")
        
        # Run authentication first
        if not self.test_auth_and_setup():
            print("\n❌ Authentication failed - cannot proceed with tests")
            return 1
        
        # Run all test suites
        self.test_question_bank_endpoints()
        self.test_question_validation()
        self.test_dashboard_stats()
        
        # Print final results
        print("\n" + "="*50)
        print("FINAL TEST RESULTS")
        print("="*50)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📊 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Save results
        self.save_results()
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = QuestionBankAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())