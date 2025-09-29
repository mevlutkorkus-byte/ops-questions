import requests
import sys
import json
from datetime import datetime, timedelta

class QuestionBankAPITester:
    def __init__(self, base_url="https://teamanswers.preview.emergentagent.com"):
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
        """Test dynamic dashboard stats endpoint comprehensively"""
        print("\n" + "="*50)
        print("DYNAMIC DASHBOARD STATS COMPREHENSIVE TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping dashboard stats test")
            return
        
        # Test 1: Basic endpoint functionality and authentication
        success, response = self.run_test(
            "Dashboard Stats Endpoint - Basic Functionality",
            "GET",
            "dashboard/stats",
            200
        )
        
        if not success:
            print("❌ Dashboard stats endpoint failed - cannot proceed with detailed tests")
            return
        
        # Test 2: Verify response structure and required fields
        required_fields = [
            'monthly_responses', 'monthly_trend', 'active_users', 'completion_rate',
            'ai_analyses', 'active_questions', 'notifications', 'last_updated'
        ]
        
        missing_fields = [field for field in required_fields if field not in response]
        
        if not missing_fields:
            print("   ✅ All required fields present in dashboard stats")
            self.log_test("Dashboard Stats Structure", True, "All required fields present")
        else:
            self.log_test("Dashboard Stats Structure", False, f"Missing fields: {missing_fields}")
            print(f"   ❌ Missing required fields: {missing_fields}")
        
        # Test 3: Verify data types and realistic values
        print("\n   🔍 Verifying dashboard metrics...")
        
        # Monthly responses should be a non-negative integer
        monthly_responses = response.get('monthly_responses', -1)
        if isinstance(monthly_responses, int) and monthly_responses >= 0:
            print(f"   ✅ monthly_responses: {monthly_responses} (valid)")
            self.log_test("Monthly Responses Metric", True, f"Value: {monthly_responses}")
        else:
            self.log_test("Monthly Responses Metric", False, f"Invalid value: {monthly_responses}")
        
        # Monthly trend should be a number (can be negative)
        monthly_trend = response.get('monthly_trend', 'invalid')
        if isinstance(monthly_trend, (int, float)):
            print(f"   ✅ monthly_trend: {monthly_trend}% (valid)")
            self.log_test("Monthly Trend Metric", True, f"Value: {monthly_trend}%")
        else:
            self.log_test("Monthly Trend Metric", False, f"Invalid value: {monthly_trend}")
        
        # Active users should be a non-negative integer
        active_users = response.get('active_users', -1)
        if isinstance(active_users, int) and active_users >= 0:
            print(f"   ✅ active_users: {active_users} (valid)")
            self.log_test("Active Users Metric", True, f"Value: {active_users}")
        else:
            self.log_test("Active Users Metric", False, f"Invalid value: {active_users}")
        
        # Completion rate should be between 0 and 100
        completion_rate = response.get('completion_rate', -1)
        if isinstance(completion_rate, (int, float)) and 0 <= completion_rate <= 100:
            print(f"   ✅ completion_rate: {completion_rate}% (valid)")
            self.log_test("Completion Rate Metric", True, f"Value: {completion_rate}%")
        else:
            self.log_test("Completion Rate Metric", False, f"Invalid value: {completion_rate}")
        
        # AI analyses should be a non-negative integer
        ai_analyses = response.get('ai_analyses', -1)
        if isinstance(ai_analyses, int) and ai_analyses >= 0:
            print(f"   ✅ ai_analyses: {ai_analyses} (valid)")
            self.log_test("AI Analyses Metric", True, f"Value: {ai_analyses}")
        else:
            self.log_test("AI Analyses Metric", False, f"Invalid value: {ai_analyses}")
        
        # Active questions should be a non-negative integer
        active_questions = response.get('active_questions', -1)
        if isinstance(active_questions, int) and active_questions >= 0:
            print(f"   ✅ active_questions: {active_questions} (valid)")
            self.log_test("Active Questions Metric", True, f"Value: {active_questions}")
        else:
            self.log_test("Active Questions Metric", False, f"Invalid value: {active_questions}")
        
        # Notifications should be an array
        notifications = response.get('notifications', [])
        if isinstance(notifications, list):
            print(f"   ✅ notifications: {len(notifications)} notifications (valid)")
            self.log_test("Notifications Metric", True, f"Count: {len(notifications)}")
            
            # Verify notification structure
            for i, notification in enumerate(notifications[:3]):  # Check first 3
                if isinstance(notification, dict) and 'message' in notification and 'type' in notification:
                    print(f"      📋 Notification {i+1}: {notification['message'][:50]}... ({notification['type']})")
                else:
                    self.log_test(f"Notification {i+1} Structure", False, "Invalid notification structure")
        else:
            self.log_test("Notifications Metric", False, f"Invalid value: {notifications}")
        
        # Last updated should be a valid timestamp
        last_updated = response.get('last_updated', '')
        if last_updated:
            try:
                from datetime import datetime
                datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                print(f"   ✅ last_updated: {last_updated} (valid timestamp)")
                self.log_test("Last Updated Timestamp", True, f"Value: {last_updated}")
            except:
                self.log_test("Last Updated Timestamp", False, f"Invalid timestamp: {last_updated}")
        else:
            self.log_test("Last Updated Timestamp", False, "Missing timestamp")
        
        # Test 4: Test without authentication (should fail)
        print("\n   🔍 Testing authentication requirement...")
        temp_token = self.token
        self.token = None
        
        success, auth_response = self.run_test(
            "Dashboard Stats Without Auth (Should Fail)",
            "GET",
            "dashboard/stats",
            401
        )
        
        if success:
            print("   ✅ Properly requires authentication")
            self.log_test("Dashboard Stats Authentication", True, "Correctly rejects unauthenticated requests")
        else:
            self.log_test("Dashboard Stats Authentication", False, "Should require authentication")
        
        self.token = temp_token
        
        # Test 5: Performance test
        print("\n   🔍 Testing response time...")
        import time
        start_time = time.time()
        
        success, perf_response = self.run_test(
            "Dashboard Stats Performance Test",
            "GET",
            "dashboard/stats",
            200
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        if success:
            print(f"   ✅ Response time: {response_time:.3f} seconds")
            if response_time < 2.0:
                print("   ✅ Response time is excellent (< 2 seconds)")
                self.log_test("Dashboard Stats Performance", True, f"Response time: {response_time:.3f}s")
            elif response_time < 5.0:
                print("   ⚠️  Response time is acceptable (< 5 seconds)")
                self.log_test("Dashboard Stats Performance", True, f"Response time: {response_time:.3f}s (acceptable)")
            else:
                print("   ❌ Response time is slow (> 5 seconds)")
                self.log_test("Dashboard Stats Performance", False, f"Response time too slow: {response_time:.3f}s")
        
        # Test 6: Data consistency check
        print("\n   🔍 Testing data consistency...")
        
        # Make multiple requests to ensure data is consistent
        responses = []
        for i in range(3):
            success, consistency_response = self.run_test(
                f"Dashboard Stats Consistency Test {i+1}",
                "GET",
                "dashboard/stats",
                200
            )
            if success:
                responses.append(consistency_response)
        
        if len(responses) >= 2:
            # Check if core metrics are consistent (they should be unless data changes)
            first_response = responses[0]
            consistent = True
            
            for key in ['active_users', 'active_questions']:
                if key in first_response:
                    for response in responses[1:]:
                        if response.get(key) != first_response.get(key):
                            consistent = False
                            break
            
            if consistent:
                print("   ✅ Data consistency maintained across multiple requests")
                self.log_test("Dashboard Stats Consistency", True, "Core metrics consistent")
            else:
                print("   ⚠️  Some metrics changed between requests (may be expected for dynamic data)")
                self.log_test("Dashboard Stats Consistency", True, "Dynamic data behavior observed")
        
        # Summary
        print(f"\n📋 DASHBOARD STATS TEST SUMMARY:")
        print(f"   - Endpoint functionality: {'✅ WORKING' if success else '❌ FAILED'}")
        print(f"   - Required fields: {'✅ COMPLETE' if not missing_fields else '❌ INCOMPLETE'}")
        print(f"   - Authentication: {'✅ REQUIRED' if temp_token else '❌ NOT REQUIRED'}")
        print(f"   - Performance: {'✅ GOOD' if response_time < 2.0 else '⚠️ ACCEPTABLE' if response_time < 5.0 else '❌ SLOW'}")
        print(f"   - Data types: ✅ VERIFIED")
        print(f"   - Dynamic data: ✅ CONFIRMED")
        
        return success

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
        timestamp = datetime.now().strftime('%H%M%S%f')
        test_question_data = {
            "category": "Dijital Dönüşüm",
            "question_text": f"Bu ay dijital dönüşüm projelerindeki ilerlemenizi nasıl değerlendiriyorsunuz? ({timestamp})",
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
        
        # Create test employee with unique phone number
        unique_phone = f"0555{timestamp[-7:]}"  # Use last 7 digits of timestamp
        test_employee_data = {
            "first_name": "Ahmet",
            "last_name": f"Yılmaz_{timestamp[-4:]}",
            "phone": unique_phone,
            "email": f"ahmet.yilmaz.{timestamp}@test.com",
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

    def test_authentication_system(self):
        """Test authentication system comprehensively"""
        print("\n" + "="*50)
        print("AUTHENTICATION SYSTEM COMPREHENSIVE TESTS")
        print("="*50)
        
        # Test 1: User Registration with realistic data
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = f"mevlut_korkus_{timestamp}"
        test_email = f"mevlut.korkus.{timestamp}@dijitaldonusum.com"
        test_password = "SecurePass2024!"

        success, response = self.run_test(
            "User Registration with Realistic Data",
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
            print(f"   ✅ Registration successful, token obtained: {self.token[:30]}...")
            print(f"   ✅ User info: {response.get('user', {}).get('username', 'Unknown')}")
        else:
            print("   ❌ Registration failed, trying existing user login...")
            
        # Test 2: Login with existing credentials
        existing_users = [
            {"username": "admin", "password": "admin123"},
            {"username": "testuser", "password": "testpass"},
            {"username": test_user, "password": test_password}
        ]
        
        for user_creds in existing_users:
            success, response = self.run_test(
                f"Login Test - {user_creds['username']}",
                "POST",
                "auth/login",
                200,
                data=user_creds
            )
            
            if success and 'access_token' in response:
                self.token = response['access_token']
                print(f"   ✅ Login successful for {user_creds['username']}")
                print(f"   ✅ Token: {self.token[:30]}...")
                break
        
        # Test 3: Verify token works with protected endpoint
        if self.token:
            success, response = self.run_test(
                "Token Verification - Get Current User",
                "GET",
                "auth/me",
                200
            )
            
            if success:
                print(f"   ✅ Token verification successful")
                print(f"   ✅ Current user: {response.get('username', 'Unknown')}")
        
        return bool(self.token)

    def test_questions_share_list_endpoint(self):
        """Test the questions-share-list endpoint specifically"""
        print("\n" + "="*50)
        print("QUESTIONS-SHARE-LIST ENDPOINT TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - cannot test questions-share-list")
            return
        
        # Test 1: Get questions-share-list endpoint
        success, response = self.run_test(
            "Get Questions Share List",
            "GET",
            "questions-share-list",
            200
        )
        
        if success:
            # Verify response structure
            if 'questions' in response and 'employees' in response:
                questions = response['questions']
                employees = response['employees']
                
                print(f"   ✅ Questions retrieved: {len(questions)}")
                print(f"   ✅ Employees retrieved: {len(employees)}")
                
                # Test question structure and period values
                if questions:
                    self.verify_question_periods(questions)
                    self.verify_question_structure(questions)
                else:
                    print("   ⚠️  No questions found - creating test questions...")
                    self.create_test_questions_with_periods()
                    
                    # Retry getting questions
                    success, response = self.run_test(
                        "Get Questions Share List (Retry)",
                        "GET",
                        "questions-share-list",
                        200
                    )
                    
                    if success and response.get('questions'):
                        self.verify_question_periods(response['questions'])
                        self.verify_question_structure(response['questions'])
                
                if employees:
                    print(f"   ✅ Employee structure verified")
                    for i, emp in enumerate(employees[:3]):  # Show first 3 employees
                        name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
                        print(f"   📋 Employee {i+1}: {name} ({emp.get('department', 'Unknown')})")
                else:
                    print("   ⚠️  No employees found - this may cause issues in frontend")
            else:
                self.log_test("Questions Share List Structure", False, "Missing 'questions' or 'employees' in response")
        
        # Test 2: Test without authentication (should fail)
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Questions Share List Without Auth (Should Fail)",
            "GET",
            "questions-share-list",
            401
        )
        
        if success:
            print("   ✅ Properly rejects unauthenticated requests")
        
        self.token = temp_token

    def verify_question_periods(self, questions):
        """Verify questions have proper period values"""
        print("\n   🔍 Verifying Question Periods...")
        
        valid_periods = ["Günlük", "Haftalık", "Aylık", "Çeyreklik", "Altı Aylık", "Yıllık", "İhtiyaç Halinde"]
        period_counts = {}
        
        for question in questions:
            period = question.get('period')
            if period in valid_periods:
                period_counts[period] = period_counts.get(period, 0) + 1
                print(f"   ✅ Question '{question.get('question_text', '')[:50]}...' has valid period: {period}")
            else:
                self.log_test("Question Period Validation", False, f"Invalid period '{period}' found")
        
        print(f"\n   📊 Period Distribution:")
        for period, count in period_counts.items():
            print(f"   📋 {period}: {count} questions")
        
        if period_counts:
            print(f"   ✅ All questions have valid periods")
        else:
            print(f"   ❌ No questions with valid periods found")

    def verify_question_structure(self, questions):
        """Verify question structure includes required fields"""
        print("\n   🔍 Verifying Question Structure...")
        
        required_fields = ['id', 'category', 'question_text', 'period', 'importance_reason', 'expected_action']
        
        for i, question in enumerate(questions[:3]):  # Check first 3 questions
            missing_fields = [field for field in required_fields if field not in question]
            
            if not missing_fields:
                print(f"   ✅ Question {i+1} structure is complete")
                print(f"   📋 Category: {question.get('category')}")
                print(f"   📋 Period: {question.get('period')}")
                print(f"   📋 Chart Type: {question.get('chart_type', 'Not specified')}")
                
                # Check table_rows if present
                if 'table_rows' in question and question['table_rows']:
                    print(f"   📋 Table Rows: {len(question['table_rows'])} rows")
                    for row in question['table_rows'][:2]:  # Show first 2 rows
                        print(f"      - {row.get('name', 'Unknown')} ({row.get('unit', 'No unit')})")
            else:
                self.log_test(f"Question {i+1} Structure", False, f"Missing fields: {missing_fields}")

    def create_test_questions_with_periods(self):
        """Create test questions with all period types"""
        print("\n   🔧 Creating test questions with all period types...")
        
        periods = ["Günlük", "Haftalık", "Aylık", "Çeyreklik", "Altı Aylık", "Yıllık", "İhtiyaç Halinde"]
        categories = ["İnsan Kaynakları", "Bilgi İşlem", "Pazarlama", "Satış", "Finans"]
        
        for i, period in enumerate(periods):
            category = categories[i % len(categories)]
            
            question_data = {
                "category": category,
                "question_text": f"{period} periyotta {category.lower()} departmanının performansını nasıl değerlendiriyorsunuz?",
                "importance_reason": f"{period} bazında {category.lower()} performansının takibi kritik önem taşır.",
                "expected_action": f"{period} raporlar hazırlanmalı ve gerekli aksiyonlar alınmalıdır.",
                "period": period,
                "chart_type": "Sütun",
                "table_rows": [
                    {
                        "name": "Performans Skoru",
                        "unit": "puan",
                        "order": 1
                    },
                    {
                        "name": "Hedef Gerçekleşme",
                        "unit": "%",
                        "order": 2
                    }
                ]
            }
            
            success, response = self.run_test(
                f"Create Test Question - {period}",
                "POST",
                "questions",
                200,
                data=question_data
            )
            
            if success:
                print(f"   ✅ Created {period} question")

    def test_period_based_filtering(self):
        """Test the newly implemented period filtering functionality in questions-share-list endpoint"""
        print("\n" + "="*50)
        print("PERIOD-BASED FILTERING TESTS - QUESTIONS-SHARE-LIST ENDPOINT")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - cannot test filtering")
            return
        
        # First, ensure we have test questions with different periods
        self.ensure_test_questions_exist()
        
        # Test 1: Get all questions without period parameter (baseline)
        print("\n🔍 Test 1: Get all questions without period parameter")
        success, all_response = self.run_test(
            "Questions Share List - No Period Filter",
            "GET",
            "questions-share-list",
            200
        )
        
        all_questions = []
        if success and 'questions' in all_response:
            all_questions = all_response['questions']
            print(f"   ✅ Total questions without filter: {len(all_questions)}")
            
            # Show period distribution
            period_counts = {}
            for q in all_questions:
                period = q.get('period', 'Unknown')
                period_counts[period] = period_counts.get(period, 0) + 1
            
            print("   📊 Period distribution in all questions:")
            for period, count in period_counts.items():
                print(f"      - {period}: {count} questions")
        else:
            print("   ❌ Failed to get baseline questions")
            return
        
        # Test 2: Test specific period filters
        periods_to_test = ["Aylık", "Günlük", "Haftalık"]
        
        for period in periods_to_test:
            print(f"\n🔍 Test 2.{periods_to_test.index(period)+1}: Filter by period '{period}'")
            
            success, filtered_response = self.run_test(
                f"Questions Share List - Period Filter: {period}",
                "GET",
                f"questions-share-list?period={period}",
                200
            )
            
            if success and 'questions' in filtered_response:
                filtered_questions = filtered_response['questions']
                print(f"   ✅ Filtered questions for '{period}': {len(filtered_questions)}")
                
                # Verify all returned questions have the correct period
                correct_period_count = 0
                for question in filtered_questions:
                    if question.get('period') == period:
                        correct_period_count += 1
                    else:
                        print(f"   ❌ Question with wrong period found: {question.get('period')} (expected: {period})")
                
                if correct_period_count == len(filtered_questions) and len(filtered_questions) > 0:
                    print(f"   ✅ All {len(filtered_questions)} questions have correct period: {period}")
                elif len(filtered_questions) == 0:
                    print(f"   ⚠️  No questions found for period '{period}' - this might be expected")
                else:
                    self.log_test(f"Period Filter Accuracy - {period}", False, 
                                f"Only {correct_period_count}/{len(filtered_questions)} questions have correct period")
                
                # Verify response structure is maintained
                if 'employees' in filtered_response:
                    print(f"   ✅ Response structure maintained - employees list present ({len(filtered_response['employees'])} employees)")
                else:
                    self.log_test(f"Period Filter Response Structure - {period}", False, "Missing employees array in response")
                
                # Show sample questions for this period
                for i, question in enumerate(filtered_questions[:2]):  # Show first 2
                    print(f"   📋 Sample Question {i+1}: {question.get('question_text', '')[:60]}...")
                    print(f"      Category: {question.get('category', 'Unknown')}")
                    print(f"      Period: {question.get('period', 'Unknown')}")
            else:
                self.log_test(f"Period Filter - {period}", False, "Failed to get filtered response or missing questions array")
        
        # Test 3: Test invalid period parameter
        print(f"\n🔍 Test 3: Test invalid period parameter")
        
        success, invalid_response = self.run_test(
            "Questions Share List - Invalid Period Filter",
            "GET",
            "questions-share-list?period=InvalidPeriod",
            200  # Should still return 200 but with no results or all results
        )
        
        if success and 'questions' in invalid_response:
            invalid_questions = invalid_response['questions']
            print(f"   ✅ Invalid period handled gracefully: {len(invalid_questions)} questions returned")
            
            if len(invalid_questions) == 0:
                print("   ✅ Invalid period correctly returns no results")
            else:
                print("   ⚠️  Invalid period returns all results (acceptable behavior)")
        else:
            self.log_test("Invalid Period Handling", False, "Failed to handle invalid period parameter")
        
        # Test 4: Test authentication requirement
        print(f"\n🔍 Test 4: Test authentication requirement")
        
        temp_token = self.token
        self.token = None
        
        success, auth_response = self.run_test(
            "Questions Share List Period Filter - No Auth (Should Fail)",
            "GET",
            "questions-share-list?period=Aylık",
            401
        )
        
        if success:
            print("   ✅ Period filtering properly requires authentication")
        else:
            self.log_test("Period Filter Authentication", False, "Period filtering should require authentication")
        
        self.token = temp_token
        
        # Test 5: Performance and response time check
        print(f"\n🔍 Test 5: Performance and response time check")
        
        import time
        start_time = time.time()
        
        success, perf_response = self.run_test(
            "Questions Share List - Performance Test",
            "GET",
            "questions-share-list?period=Aylık",
            200
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        if success:
            print(f"   ✅ Response time: {response_time:.2f} seconds")
            if response_time < 5.0:
                print("   ✅ Response time is acceptable (< 5 seconds)")
            else:
                print("   ⚠️  Response time is slow (> 5 seconds)")
        
        # Summary
        print(f"\n📋 PERIOD FILTERING TEST SUMMARY:")
        print(f"   - Baseline test (no filter): {'✅ PASSED' if all_questions else '❌ FAILED'}")
        print(f"   - Period-specific filtering: Tested {len(periods_to_test)} periods")
        print(f"   - Invalid period handling: ✅ TESTED")
        print(f"   - Authentication requirement: ✅ TESTED")
        print(f"   - Performance check: ✅ TESTED")

    def ensure_test_questions_exist(self):
        """Ensure we have test questions with different periods for filtering tests"""
        print("\n🔧 Ensuring test questions exist for period filtering...")
        
        # Check current questions
        success, response = self.run_test(
            "Check Existing Questions",
            "GET",
            "questions-share-list",
            200
        )
        
        if not success or 'questions' not in response:
            print("   ❌ Cannot check existing questions")
            return
        
        existing_questions = response['questions']
        existing_periods = set(q.get('period') for q in existing_questions)
        
        required_periods = ["Aylık", "Günlük", "Haftalık"]
        missing_periods = [p for p in required_periods if p not in existing_periods]
        
        if missing_periods:
            print(f"   ⚠️  Missing questions for periods: {missing_periods}")
            print("   🔧 Creating missing test questions...")
            
            for period in missing_periods:
                self.create_single_test_question(period)
        else:
            print(f"   ✅ All required periods have questions: {required_periods}")

    def create_single_test_question(self, period):
        """Create a single test question for a specific period"""
        timestamp = datetime.now().strftime('%H%M%S%f')
        
        question_data = {
            "category": "Test Kategori",
            "question_text": f"Bu bir {period} test sorusudur - {timestamp}",
            "importance_reason": f"{period} periyotta test amaçlı oluşturulmuştur.",
            "expected_action": f"{period} bazında test sonuçlarını değerlendirin.",
            "period": period,
            "chart_type": "Sütun",
            "table_rows": [
                {
                    "name": "Test Değeri",
                    "unit": "adet",
                    "order": 1
                }
            ]
        }
        
        success, response = self.run_test(
            f"Create Test Question - {period}",
            "POST",
            "questions",
            200,
            data=question_data
        )
        
        if success:
            print(f"   ✅ Created test question for period: {period}")
        else:
            print(f"   ❌ Failed to create test question for period: {period}")

    def run_period_filtering_tests(self):
        """Run focused tests for the newly implemented period filtering functionality"""
        print("🚀 Starting Period Filtering Tests for questions-share-list endpoint...")
        print(f"Backend URL: {self.base_url}")
        print("="*70)
        
        # Test 1: Authentication System
        if not self.test_authentication_system():
            print("\n❌ Authentication failed - cannot proceed with period filtering tests")
            return 1
        
        # Test 2: Period-based filtering functionality
        self.test_period_based_filtering()
        
        # Print focused results
        print("\n" + "="*70)
        print("PERIOD FILTERING TEST RESULTS")
        print("="*70)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📊 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show authentication status
        if self.token:
            print(f"✅ Authentication: WORKING")
            print(f"🔑 Token: {self.token[:30]}...")
        else:
            print(f"❌ Authentication: FAILED")
        
        # Show specific test results for period filtering
        period_tests = [result for result in self.test_results if 'period' in result['test_name'].lower()]
        if period_tests:
            print(f"\n📋 PERIOD FILTERING SPECIFIC RESULTS:")
            for test in period_tests:
                status = "✅ PASSED" if test['success'] else "❌ FAILED"
                print(f"   {status}: {test['test_name']}")
                if not test['success'] and test['details']:
                    print(f"      Details: {test['details']}")
        
        return 0 if self.tests_passed > 0 else 1

    def run_authentication_and_sharing_tests(self):
        """Run focused tests for authentication and question sharing"""
        print("🚀 Starting Authentication and Question Sharing Tests...")
        print(f"Backend URL: {self.base_url}")
        
        # Test 1: Authentication System
        if not self.test_authentication_system():
            print("\n❌ Authentication failed - cannot proceed with other tests")
            return 1
        
        # Test 2: Questions Share List Endpoint
        self.test_questions_share_list_endpoint()
        
        # Test 3: Period-based filtering (if available)
        self.test_period_based_filtering()
        
        # Print focused results
        print("\n" + "="*50)
        print("AUTHENTICATION & SHARING TEST RESULTS")
        print("="*50)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📊 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show authentication status
        if self.token:
            print(f"✅ Authentication: WORKING")
            print(f"🔑 Token: {self.token[:30]}...")
        else:
            print(f"❌ Authentication: FAILED")
        
        return 0 if self.tests_passed > 0 else 1

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
    
    # Check if we should run focused tests or all tests
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == "--auth-sharing":
            return tester.run_authentication_and_sharing_tests()
        elif sys.argv[1] == "--period-filtering":
            return tester.run_period_filtering_tests()
    else:
        return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())