import requests
import json
from datetime import datetime

class CevaplarCoreTester:
    def __init__(self, base_url="https://dms-dashboard.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_passed = 0
        self.tests_total = 0

    def log_test(self, name, success, details=""):
        self.tests_total += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}: {details}")

    def authenticate(self):
        """Get authentication token"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = f"testuser_{timestamp}"
        test_email = f"test_{timestamp}@example.com"
        test_password = "TestPass123!"

        response = requests.post(f"{self.api_url}/auth/register", json={
            "username": test_user,
            "email": test_email,
            "password": test_password
        })
        
        if response.status_code == 200:
            self.token = response.json()['access_token']
            return True
        return False

    def test_cevaplar_core_functionality(self):
        """Test core Cevaplar functionality without AI timeouts"""
        if not self.token:
            print("❌ No token available")
            return
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
        
        print("\n🔍 Testing Cevaplar Core Functionality")
        print("="*50)
        
        # 1. Test questions-for-responses endpoint
        response = requests.get(f"{self.api_url}/questions-for-responses", headers=headers)
        success = response.status_code == 200
        if success:
            data = response.json()
            has_structure = 'questions' in data and 'employees' in data
            self.log_test("GET /api/questions-for-responses", has_structure, 
                         f"Retrieved {len(data.get('questions', []))} questions, {len(data.get('employees', []))} employees")
            
            if has_structure and data['questions'] and data['employees']:
                question_id = data['questions'][0]['id']
                employee_id = data['employees'][0]['id']
                
                # 2. Test monthly response creation (without AI comment to avoid timeout)
                monthly_data = {
                    "question_id": question_id,
                    "employee_id": employee_id,
                    "year": 2025,
                    "month": 1,
                    "numerical_value": 8.5,
                    "employee_comment": None  # No comment to avoid AI generation
                }
                
                response = requests.post(f"{self.api_url}/monthly-responses", json=monthly_data, headers=headers, timeout=15)
                success = response.status_code == 200
                if success:
                    result = response.json()
                    self.log_test("POST /api/monthly-responses (without AI)", success, f"Created response ID: {result.get('id')}")
                else:
                    self.log_test("POST /api/monthly-responses (without AI)", False, f"Status: {response.status_code}")
                
                # 3. Test monthly response with AI comment (shorter timeout)
                monthly_data_with_comment = {
                    "question_id": question_id,
                    "employee_id": employee_id,
                    "year": 2025,
                    "month": 2,
                    "numerical_value": 7.0,
                    "employee_comment": "Kısa yorum."  # Short comment for faster AI processing
                }
                
                try:
                    response = requests.post(f"{self.api_url}/monthly-responses", json=monthly_data_with_comment, headers=headers, timeout=30)
                    success = response.status_code == 200
                    if success:
                        result = response.json()
                        ai_generated = bool(result.get('ai_comment'))
                        self.log_test("POST /api/monthly-responses (with AI)", success, 
                                     f"AI comment generated: {ai_generated}")
                    else:
                        self.log_test("POST /api/monthly-responses (with AI)", False, f"Status: {response.status_code}")
                except requests.exceptions.Timeout:
                    self.log_test("POST /api/monthly-responses (with AI)", False, "Timeout - AI processing takes too long")
                
                # 4. Test get all monthly responses
                response = requests.get(f"{self.api_url}/monthly-responses", headers=headers)
                success = response.status_code == 200
                if success:
                    data = response.json()
                    self.log_test("GET /api/monthly-responses", success, f"Retrieved {len(data)} responses")
                else:
                    self.log_test("GET /api/monthly-responses", False, f"Status: {response.status_code}")
                
                # 5. Test get responses by question
                response = requests.get(f"{self.api_url}/monthly-responses/question/{question_id}", headers=headers)
                success = response.status_code == 200
                if success:
                    data = response.json()
                    has_structure = 'question' in data and 'responses' in data
                    self.log_test("GET /api/monthly-responses/question/{id}", has_structure, 
                                 f"Retrieved {len(data.get('responses', []))} responses for question")
                else:
                    self.log_test("GET /api/monthly-responses/question/{id}", False, f"Status: {response.status_code}")
                
                # 6. Test chart data endpoint
                response = requests.get(f"{self.api_url}/monthly-responses/chart-data/{question_id}", headers=headers)
                success = response.status_code == 200
                if success:
                    data = response.json()
                    has_structure = 'question' in data and 'chart_data' in data and 'chart_type' in data
                    chart_months = len(data.get('chart_data', []))
                    self.log_test("GET /api/monthly-responses/chart-data/{id}", has_structure and chart_months == 12, 
                                 f"Chart data with {chart_months} months")
                else:
                    self.log_test("GET /api/monthly-responses/chart-data/{id}", False, f"Status: {response.status_code}")
                
                # 7. Test response update functionality
                update_data = {
                    "question_id": question_id,
                    "employee_id": employee_id,
                    "year": 2025,
                    "month": 1,  # Same month as first response
                    "numerical_value": 9.0,  # Updated value
                    "employee_comment": None
                }
                
                response = requests.post(f"{self.api_url}/monthly-responses", json=update_data, headers=headers, timeout=15)
                success = response.status_code == 200
                if success:
                    result = response.json()
                    updated_value = result.get('numerical_value')
                    self.log_test("Response Update Functionality", updated_value == 9.0, 
                                 f"Updated numerical value: {updated_value}")
                else:
                    self.log_test("Response Update Functionality", False, f"Status: {response.status_code}")
                
            else:
                self.log_test("Data Setup", False, "No questions or employees available for testing")
        else:
            self.log_test("GET /api/questions-for-responses", False, f"Status: {response.status_code}")

    def run_test(self):
        print("🚀 Testing Cevaplar Core Functionality...")
        if self.authenticate():
            print("✅ Authentication successful")
            self.test_cevaplar_core_functionality()
            
            print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_total} passed ({(self.tests_passed/self.tests_total*100):.1f}%)")
            
            if self.tests_passed == self.tests_total:
                print("🎉 All core Cevaplar functionality tests passed!")
            else:
                print("⚠️ Some tests failed - see details above")
        else:
            print("❌ Authentication failed")

if __name__ == "__main__":
    tester = CevaplarCoreTester()
    tester.run_test()