import requests
import sys
import json
from datetime import datetime, timedelta

class QuestionBankAPITester:
    def __init__(self, base_url="https://qmanage-hub.preview.emergentagent.com"):
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

    def test_cevaplar_responses_feature(self):
        """Test the new Cevaplar (Monthly Responses) feature"""
        print("\n" + "="*50)
        print("CEVAPLAR (MONTHLY RESPONSES) FEATURE TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping Cevaplar tests")
            return
        
        # First, we need to create test data (question and employee)
        question_id, employee_id = self.setup_test_data_for_responses()
        
        if not question_id or not employee_id:
            print("❌ Failed to setup test data - skipping Cevaplar tests")
            return
        
        # Test 1: Get questions for responses
        success, response = self.run_test(
            "Get Questions for Responses",
            "GET",
            "questions-for-responses",
            200
        )
        
        if success:
            if 'questions' in response and 'employees' in response:
                print(f"   ✅ Retrieved {len(response['questions'])} questions and {len(response['employees'])} employees")
            else:
                self.log_test("Questions for Responses Structure", False, "Missing questions or employees in response")
        
        # Test 2: Create monthly response with AI comment generation
        monthly_response_data = {
            "question_id": question_id,
            "employee_id": employee_id,
            "year": 2025,
            "month": 1,
            "numerical_value": 8.5,
            "employee_comment": "Bu ay dijital dönüşüm projelerinde önemli ilerlemeler kaydettik. Yeni sistemler başarıyla devreye alındı ve çalışan memnuniyeti arttı."
        }
        
        success, response = self.run_test(
            "Create Monthly Response with AI Comment",
            "POST",
            "monthly-responses",
            200,
            data=monthly_response_data
        )
        
        response_id = None
        if success and 'id' in response:
            response_id = response['id']
            print(f"   ✅ Monthly response created with ID: {response_id}")
            
            # Check if AI comment was generated
            if response.get('ai_comment'):
                print(f"   ✅ AI comment generated: {response['ai_comment'][:100]}...")
            else:
                self.log_test("AI Comment Generation", False, "AI comment not generated")
        
        # Test 3: Update monthly response
        if response_id:
            updated_data = {
                "numerical_value": 9.0,
                "employee_comment": "Güncellenmiş yorum: Dijital dönüşüm sürecinde daha da iyi sonuçlar elde ettik."
            }
            
            # Create another response to test update functionality
            success, response = self.run_test(
                "Update Monthly Response",
                "POST",
                "monthly-responses",
                200,
                data={
                    **monthly_response_data,
                    "numerical_value": 9.0,
                    "employee_comment": "Güncellenmiş yorum: Dijital dönüşüm sürecinde daha da iyi sonuçlar elde ettik."
                }
            )
            
            if success and response.get('ai_comment'):
                print(f"   ✅ Response updated with new AI comment")
        
        # Test 4: Get all monthly responses
        success, response = self.run_test(
            "Get All Monthly Responses",
            "GET",
            "monthly-responses",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} monthly responses")
            
            # Check response structure
            if response and len(response) > 0:
                first_response = response[0]
                required_fields = ['id', 'question_id', 'employee_id', 'year', 'month']
                missing_fields = [field for field in required_fields if field not in first_response]
                
                if not missing_fields:
                    print(f"   ✅ Response structure is correct")
                else:
                    self.log_test("Monthly Response Structure", False, f"Missing fields: {missing_fields}")
        
        # Test 5: Get responses by question
        success, response = self.run_test(
            "Get Responses by Question",
            "GET",
            f"monthly-responses/question/{question_id}",
            200
        )
        
        if success:
            if 'question' in response and 'responses' in response:
                print(f"   ✅ Retrieved responses for question: {len(response['responses'])} responses")
            else:
                self.log_test("Responses by Question Structure", False, "Missing question or responses in response")
        
        # Test 6: Get chart data
        success, response = self.run_test(
            "Get Chart Data for Question",
            "GET",
            f"monthly-responses/chart-data/{question_id}",
            200
        )
        
        if success:
            if 'question' in response and 'chart_data' in response and 'chart_type' in response:
                chart_data = response['chart_data']
                if len(chart_data) == 12:  # Should have 12 months
                    print(f"   ✅ Chart data retrieved with 12 months of data")
                    
                    # Check chart data structure
                    if chart_data[0].get('month') and 'value' in chart_data[0]:
                        print(f"   ✅ Chart data structure is correct")
                    else:
                        self.log_test("Chart Data Structure", False, "Invalid chart data structure")
                else:
                    self.log_test("Chart Data Months", False, f"Expected 12 months, got {len(chart_data)}")
            else:
                self.log_test("Chart Data Response Structure", False, "Missing required fields in chart data response")
        
        # Test 7: Test with different numerical values and comments
        test_cases = [
            {"value": 10.0, "comment": "Mükemmel performans gösterdik bu ay."},
            {"value": 5.0, "comment": "Orta düzeyde ilerleme kaydettik."},
            {"value": 2.0, "comment": "Bu ay zorluklarla karşılaştık, iyileştirme gerekiyor."},
            {"value": None, "comment": "Sadece yorum bırakıyorum, sayısal değer yok."}
        ]
        
        for i, test_case in enumerate(test_cases, 2):
            test_data = {
                "question_id": question_id,
                "employee_id": employee_id,
                "year": 2025,
                "month": i,
                "numerical_value": test_case["value"],
                "employee_comment": test_case["comment"]
            }
            
            success, response = self.run_test(
                f"Monthly Response Test Case {i}",
                "POST",
                "monthly-responses",
                200,
                data=test_data
            )
            
            if success and response.get('ai_comment'):
                print(f"   ✅ AI comment generated for test case {i}")

    def setup_test_data_for_responses(self):
        """Setup test question and employee for response testing"""
        print("\n🔧 Setting up test data for Cevaplar tests...")
        
        # Create test question
        test_question_data = {
            "category": "Dijital Dönüşüm",
            "question_text": "Bu ay dijital dönüşüm projelerindeki ilerlemenizi nasıl değerlendiriyorsunuz?",
            "importance_reason": "Dijital dönüşüm sürecinin takibi için kritik önem taşır.",
            "expected_action": "Aylık ilerleme raporları hazırlanmalı ve aksiyonlar belirlenmelidir.",
            "period": "Aylık",
            "chart_type": "Sütun"
        }
        
        success, response = self.run_test(
            "Create Test Question for Responses",
            "POST",
            "questions",
            200,
            data=test_question_data
        )
        
        question_id = None
        if success and 'id' in response:
            question_id = response['id']
            print(f"   ✅ Test question created: {question_id}")
        
        # Create test employee
        test_employee_data = {
            "first_name": "Ahmet",
            "last_name": "Yılmaz",
            "phone": "05551234567",
            "email": "ahmet.yilmaz@test.com",
            "department": "Bilgi İşlem",
            "age": 35,
            "gender": "Erkek",
            "hire_date": "2020-01-15",
            "birth_date": "1988-05-20",
            "salary": 15000.0
        }
        
        success, response = self.run_test(
            "Create Test Employee for Responses",
            "POST",
            "employees",
            200,
            data=test_employee_data
        )
        
        employee_id = None
        if success and 'id' in response:
            employee_id = response['id']
            print(f"   ✅ Test employee created: {employee_id}")
        
        return question_id, employee_id

    def test_ai_integration(self):
        """Test AI comment generation specifically"""
        print("\n" + "="*50)
        print("AI INTEGRATION TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping AI tests")
            return
        
        # Setup test data
        question_id, employee_id = self.setup_test_data_for_responses()
        
        if not question_id or not employee_id:
            print("❌ Failed to setup test data - skipping AI tests")
            return
        
        # Test different types of employee comments for AI generation
        ai_test_cases = [
            {
                "comment": "Bu ay çok başarılı geçti, tüm hedeflerimizi aştık.",
                "value": 9.5,
                "expected_tone": "positive"
            },
            {
                "comment": "Bazı zorluklar yaşadık ama üstesinden geldik.",
                "value": 6.0,
                "expected_tone": "neutral"
            },
            {
                "comment": "Maalesef bu ay hedeflerimize ulaşamadık, ciddi sorunlar var.",
                "value": 3.0,
                "expected_tone": "negative"
            },
            {
                "comment": "Yeni teknolojileri öğrenme konusunda ilerleme kaydettik.",
                "value": 7.5,
                "expected_tone": "learning"
            }
        ]
        
        for i, test_case in enumerate(ai_test_cases, 1):
            test_data = {
                "question_id": question_id,
                "employee_id": employee_id,
                "year": 2025,
                "month": i + 5,  # Use different months
                "numerical_value": test_case["value"],
                "employee_comment": test_case["comment"]
            }
            
            success, response = self.run_test(
                f"AI Comment Generation - {test_case['expected_tone'].title()} Tone",
                "POST",
                "monthly-responses",
                200,
                data=test_data
            )
            
            if success:
                ai_comment = response.get('ai_comment', '')
                if ai_comment and len(ai_comment) > 10:
                    print(f"   ✅ AI comment generated ({len(ai_comment)} chars)")
                    print(f"   📝 AI Comment: {ai_comment[:150]}...")
                    
                    # Check if AI comment is in Turkish
                    turkish_indicators = ['bu', 'bir', 've', 'için', 'ile', 'da', 'de', 'ki', 'olan']
                    if any(indicator in ai_comment.lower() for indicator in turkish_indicators):
                        print(f"   ✅ AI comment appears to be in Turkish")
                    else:
                        self.log_test(f"AI Comment Turkish Language - {test_case['expected_tone']}", False, "AI comment may not be in Turkish")
                else:
                    self.log_test(f"AI Comment Generation - {test_case['expected_tone']}", False, "AI comment not generated or too short")

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
        """Run all API tests including new Cevaplar feature"""
        print("🚀 Starting Complete API Testing...")
        print(f"Backend URL: {self.base_url}")
        
        # Run authentication first
        if not self.test_auth_and_setup():
            print("\n❌ Authentication failed - cannot proceed with tests")
            return 1
        
        # Run all test suites
        self.test_question_bank_endpoints()
        self.test_question_validation()
        self.test_dashboard_stats()
        
        # NEW: Test Cevaplar (Monthly Responses) feature
        self.test_cevaplar_responses_feature()
        self.test_ai_integration()
        
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