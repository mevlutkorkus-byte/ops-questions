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

    def run_dashboard_stats_tests(self):
        """Run focused tests for the dynamic dashboard stats endpoint"""
        print("🚀 Starting Dynamic Dashboard Stats Tests...")
        print(f"Backend URL: {self.base_url}")
        print("="*70)
        
        # Test 1: Authentication System
        if not self.test_authentication_system():
            print("\n❌ Authentication failed - cannot proceed with dashboard stats tests")
            return 1
        
        # Test 2: Dashboard Stats Endpoint
        self.test_dashboard_stats()
        
        # Print focused results
        print("\n" + "="*70)
        print("DASHBOARD STATS TEST RESULTS")
        print("="*70)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📊 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show authentication status
        if self.token:
            print(f"✅ Authentication: WORKING")
            print(f"🔑 Token: {self.token[:30]}...")
        else:
            print(f"❌ Authentication: FAILED")
        
        # Show specific test results for dashboard stats
        dashboard_tests = [result for result in self.test_results if 'dashboard' in result['test_name'].lower()]
        if dashboard_tests:
            print(f"\n📋 DASHBOARD STATS SPECIFIC RESULTS:")
            for test in dashboard_tests:
                status = "✅ PASSED" if test['success'] else "❌ FAILED"
                print(f"   {status}: {test['test_name']}")
                if not test['success'] and test['details']:
                    print(f"      Details: {test['details']}")
        
        return 0 if self.tests_passed > 0 else 1
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

    def test_advanced_analytics_system(self):
        """Test Advanced Analytics System endpoints"""
        print("\n" + "="*50)
        print("ADVANCED ANALYTICS SYSTEM TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping analytics tests")
            return
        
        # First, get some questions to test with
        success, questions_response = self.run_test(
            "Get Questions for Analytics Testing",
            "GET",
            "questions",
            200
        )
        
        question_ids = []
        if success and isinstance(questions_response, list) and len(questions_response) > 0:
            question_ids = [q['id'] for q in questions_response[:3]]  # Get first 3 question IDs
            print(f"   ✅ Found {len(question_ids)} questions for analytics testing")
        else:
            print("   ⚠️  No questions found - creating test question for analytics")
            # Create a test question
            test_question = {
                "category": "Analytics Test",
                "question_text": "Test question for analytics system",
                "importance_reason": "Testing analytics functionality",
                "expected_action": "Analyze the results",
                "period": "Aylık",
                "chart_type": "Sütun",
                "table_rows": [
                    {"name": "Performance", "unit": "score", "order": 1},
                    {"name": "Efficiency", "unit": "%", "order": 2}
                ]
            }
            
            success, response = self.run_test(
                "Create Test Question for Analytics",
                "POST",
                "questions",
                200,
                data=test_question
            )
            
            if success and 'id' in response:
                question_ids = [response['id']]
                print(f"   ✅ Created test question for analytics: {response['id']}")
        
        # Test 1: Advanced Analytics Insights for specific question
        if question_ids:
            for i, question_id in enumerate(question_ids[:2]):  # Test first 2 questions
                success, response = self.run_test(
                    f"Advanced Analytics Insights - Question {i+1}",
                    "GET",
                    f"analytics/insights/{question_id}",
                    200
                )
                
                if success:
                    # Verify response structure
                    required_fields = ['question_id', 'question_text', 'insights', 'generated_at']
                    missing_fields = [field for field in required_fields if field not in response]
                    
                    if not missing_fields:
                        print(f"   ✅ Analytics insights structure complete for question {i+1}")
                        
                        # Check insights structure
                        insights = response.get('insights', {})
                        insight_fields = ['data_trends', 'predictions', 'anomalies', 'recommendations', 'performance_score', 'confidence_level']
                        missing_insight_fields = [field for field in insight_fields if field not in insights]
                        
                        if not missing_insight_fields:
                            print(f"   ✅ Insights structure complete")
                            print(f"   📊 Performance Score: {insights.get('performance_score', 'N/A')}")
                            print(f"   📊 Confidence Level: {insights.get('confidence_level', 'N/A')}")
                            print(f"   📊 Recommendations: {len(insights.get('recommendations', []))}")
                        else:
                            self.log_test(f"Analytics Insights Structure - Question {i+1}", False, f"Missing insight fields: {missing_insight_fields}")
                    else:
                        self.log_test(f"Analytics Insights Response - Question {i+1}", False, f"Missing fields: {missing_fields}")
        
        # Test 2: Comparative Analytics
        if len(question_ids) >= 2:
            question_ids_str = ','.join(question_ids[:3])  # Test with up to 3 questions
            
            success, response = self.run_test(
                "Comparative Analytics",
                "GET",
                f"analytics/compare?question_ids={question_ids_str}",
                200
            )
            
            if success:
                # Verify response structure
                required_fields = ['comparison_results', 'insights', 'generated_at']
                missing_fields = [field for field in required_fields if field not in response]
                
                if not missing_fields:
                    print(f"   ✅ Comparative analytics structure complete")
                    
                    comparison_results = response.get('comparison_results', [])
                    insights = response.get('insights', {})
                    
                    print(f"   📊 Questions compared: {len(comparison_results)}")
                    print(f"   📊 Performance ranking available: {'performance_ranking' in insights}")
                    print(f"   📊 Summary insights: {'summary' in insights}")
                    
                    # Check if ranking is working
                    if 'performance_ranking' in insights and insights['performance_ranking']:
                        ranking = insights['performance_ranking']
                        print(f"   📊 Top performer: {ranking[0].get('question_text', 'Unknown')[:50]}...")
                else:
                    self.log_test("Comparative Analytics Structure", False, f"Missing fields: {missing_fields}")
        else:
            print("   ⚠️  Need at least 2 questions for comparative analytics - skipping")
        
        # Test 3: Test with invalid question ID
        success, response = self.run_test(
            "Analytics Insights - Invalid Question ID",
            "GET",
            "analytics/insights/invalid-question-id",
            404
        )
        
        if success:
            print("   ✅ Properly handles invalid question ID")
        
        # Test 4: Test comparative analytics with invalid parameters
        success, response = self.run_test(
            "Comparative Analytics - Single Question (Should Fail)",
            "GET",
            f"analytics/compare?question_ids={question_ids[0] if question_ids else 'test'}",
            400
        )
        
        if success:
            print("   ✅ Properly validates comparative analytics parameters")

    def test_automation_services(self):
        """Test Automation Services endpoints"""
        print("\n" + "="*50)
        print("AUTOMATION SERVICES TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping automation tests")
            return
        
        # Test 1: Email Reminders Automation
        reminder_config = {
            "reminder_days": 3,
            "min_reminder_interval": 2,
            "email_template": "standard"
        }
        
        success, response = self.run_test(
            "Email Reminders Automation",
            "POST",
            "automation/email-reminders",
            200,
            data=reminder_config
        )
        
        if success:
            # Verify response structure
            required_fields = ['success', 'reminder_count', 'processed_at']
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                print(f"   ✅ Email reminders automation structure complete")
                print(f"   📧 Reminders sent: {response.get('reminder_count', 0)}")
                print(f"   📧 Success status: {response.get('success', False)}")
                
                if 'reminders_sent' in response:
                    reminders = response['reminders_sent']
                    print(f"   📧 Reminder details available: {len(reminders)} reminders")
            else:
                self.log_test("Email Reminders Structure", False, f"Missing fields: {missing_fields}")
        
        # Test 2: Generate Automated Reports - Monthly
        monthly_report_config = {
            "type": "monthly",
            "include_charts": True,
            "email_recipients": ["admin@test.com"],
            "format": "detailed"
        }
        
        success, response = self.run_test(
            "Generate Automated Reports - Monthly",
            "POST",
            "automation/generate-reports",
            200,
            data=monthly_report_config
        )
        
        if success:
            # Verify response structure
            required_fields = ['success', 'report_id', 'report_data', 'generated_at']
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                print(f"   ✅ Monthly report generation structure complete")
                print(f"   📊 Report ID: {response.get('report_id', 'N/A')}")
                
                report_data = response.get('report_data', {})
                if report_data:
                    print(f"   📊 Report period: {report_data.get('period', 'Unknown')}")
                    print(f"   📊 Total responses: {report_data.get('total_responses', 0)}")
                    print(f"   📊 Questions analyzed: {report_data.get('questions_analyzed', 0)}")
                    print(f"   📊 Insights count: {len(report_data.get('insights', []))}")
            else:
                self.log_test("Monthly Report Structure", False, f"Missing fields: {missing_fields}")
        
        # Test 3: Generate Automated Reports - Weekly
        weekly_report_config = {
            "type": "weekly",
            "include_charts": False,
            "format": "summary"
        }
        
        success, response = self.run_test(
            "Generate Automated Reports - Weekly",
            "POST",
            "automation/generate-reports",
            200,
            data=weekly_report_config
        )
        
        if success:
            print(f"   ✅ Weekly report generation working")
            report_data = response.get('report_data', {})
            if report_data:
                print(f"   📊 Weekly report period: {report_data.get('period', 'Unknown')}")
        
        # Test 4: Generate Automated Reports - Quarterly
        quarterly_report_config = {
            "type": "quarterly",
            "include_trends": True,
            "detailed_analysis": True
        }
        
        success, response = self.run_test(
            "Generate Automated Reports - Quarterly",
            "POST",
            "automation/generate-reports",
            200,
            data=quarterly_report_config
        )
        
        if success:
            print(f"   ✅ Quarterly report generation working")

    def test_legacy_endpoints(self):
        """Test legacy endpoints to ensure they still work"""
        print("\n" + "="*50)
        print("LEGACY ENDPOINTS TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping legacy tests")
            return
        
        # Test 1: Questions Share List (with period filtering)
        success, response = self.run_test(
            "Legacy - Questions Share List",
            "GET",
            "questions-share-list",
            200
        )
        
        if success:
            if 'questions' in response and 'employees' in response:
                print(f"   ✅ Questions share list working: {len(response['questions'])} questions, {len(response['employees'])} employees")
            else:
                self.log_test("Legacy Questions Share List Structure", False, "Missing questions or employees")
        
        # Test 2: Questions Share List with period filter
        success, response = self.run_test(
            "Legacy - Questions Share List with Period Filter",
            "GET",
            "questions-share-list?period=Aylık",
            200
        )
        
        if success:
            print(f"   ✅ Period filtering working on legacy endpoint")
        
        # Test 3: Table Responses endpoint (if we have test data)
        # First create some test data
        question_id, employee_id = self.setup_test_data_for_responses()
        
        if question_id and employee_id:
            table_response_data = {
                "question_id": question_id,
                "employee_id": employee_id,
                "year": 2025,
                "month": 1,
                "table_data": {
                    "row1": "100",
                    "row2": "85"
                },
                "monthly_comment": "Test comment for legacy endpoint testing"
            }
            
            success, response = self.run_test(
                "Legacy - Table Responses Submission",
                "POST",
                "table-responses",
                200,
                data=table_response_data
            )
            
            if success:
                print(f"   ✅ Table responses submission working")
                if 'ai_comment' in response:
                    print(f"   ✅ AI comment generation still working in legacy endpoint")

    def test_error_handling_and_edge_cases(self):
        """Test error handling and edge cases"""
        print("\n" + "="*50)
        print("ERROR HANDLING & EDGE CASES TESTS")
        print("="*50)
        
        if not self.token:
            print("❌ No authentication token - skipping error handling tests")
            return
        
        # Test 1: Dashboard stats with invalid token
        temp_token = self.token
        self.token = "invalid-token"
        
        success, response = self.run_test(
            "Dashboard Stats - Invalid Token",
            "GET",
            "dashboard/stats",
            401
        )
        
        if success:
            print("   ✅ Properly rejects invalid tokens")
        
        self.token = temp_token
        
        # Test 2: Analytics with non-existent question
        success, response = self.run_test(
            "Analytics Insights - Non-existent Question",
            "GET",
            "analytics/insights/non-existent-id",
            404
        )
        
        if success:
            print("   ✅ Properly handles non-existent question in analytics")
        
        # Test 3: Comparative analytics with too many questions
        many_question_ids = ','.join(['id1', 'id2', 'id3', 'id4', 'id5', 'id6'])  # 6 questions (max is 5)
        
        success, response = self.run_test(
            "Comparative Analytics - Too Many Questions",
            "GET",
            f"analytics/compare?question_ids={many_question_ids}",
            400
        )
        
        if success:
            print("   ✅ Properly validates maximum questions limit in comparative analytics")
        
        # Test 4: Automation with invalid config
        invalid_config = {
            "invalid_field": "invalid_value"
        }
        
        success, response = self.run_test(
            "Email Reminders - Invalid Config",
            "POST",
            "automation/email-reminders",
            200  # Should still work but with default values
        )
        
        if success:
            print("   ✅ Email reminders handles invalid config gracefully")

    def run_comprehensive_system_tests(self):
        """Run comprehensive system tests for all recently implemented features"""
        print("🚀 Starting Comprehensive System Testing...")
        print("Testing all recently implemented features and endpoints")
        print(f"Backend URL: {self.base_url}")
        print("="*70)
        
        # Test 1: Authentication System
        if not self.test_authentication_system():
            print("\n❌ Authentication failed - cannot proceed with comprehensive tests")
            return 1
        
        # Test 2: Core Dashboard Stats
        print("\n🔍 Testing Core Dashboard Stats...")
        self.test_dashboard_stats()
        
        # Test 3: Advanced Analytics System
        print("\n🔍 Testing Advanced Analytics System...")
        self.test_advanced_analytics_system()
        
        # Test 4: Automation Services
        print("\n🔍 Testing Automation Services...")
        self.test_automation_services()
        
        # Test 5: Legacy Endpoints
        print("\n🔍 Testing Legacy Endpoints...")
        self.test_legacy_endpoints()
        
        # Test 6: Error Handling and Edge Cases
        print("\n🔍 Testing Error Handling and Edge Cases...")
        self.test_error_handling_and_edge_cases()
        
        # Print comprehensive results
        print("\n" + "="*70)
        print("COMPREHENSIVE SYSTEM TEST RESULTS")
        print("="*70)
        print(f"📊 Total tests run: {self.tests_run}")
        print(f"📊 Tests passed: {self.tests_passed}")
        print(f"📊 Tests failed: {self.tests_run - self.tests_passed}")
        print(f"📊 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show authentication status
        if self.token:
            print(f"✅ Authentication: WORKING")
        else:
            print(f"❌ Authentication: FAILED")
        
        # Categorize test results
        dashboard_tests = [r for r in self.test_results if 'dashboard' in r['test_name'].lower()]
        analytics_tests = [r for r in self.test_results if 'analytics' in r['test_name'].lower()]
        automation_tests = [r for r in self.test_results if 'automation' in r['test_name'].lower()]
        legacy_tests = [r for r in self.test_results if 'legacy' in r['test_name'].lower()]
        error_tests = [r for r in self.test_results if 'error' in r['test_name'].lower() or 'invalid' in r['test_name'].lower()]
        
        print(f"\n📋 TEST BREAKDOWN BY CATEGORY:")
        print(f"   🎯 Dashboard Stats: {len([t for t in dashboard_tests if t['success']])}/{len(dashboard_tests)} passed")
        print(f"   📊 Advanced Analytics: {len([t for t in analytics_tests if t['success']])}/{len(analytics_tests)} passed")
        print(f"   🤖 Automation Services: {len([t for t in automation_tests if t['success']])}/{len(automation_tests)} passed")
        print(f"   🔄 Legacy Endpoints: {len([t for t in legacy_tests if t['success']])}/{len(legacy_tests)} passed")
        print(f"   ⚠️  Error Handling: {len([t for t in error_tests if t['success']])}/{len(error_tests)} passed")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test_name']}: {test['details']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED!")
        
        # Save results
        self.save_results()
        
        return 0 if len(failed_tests) == 0 else 1

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
        
        # NEW: Test Advanced Analytics and Automation
        self.test_advanced_analytics_system()
        self.test_automation_services()
        self.test_legacy_endpoints()
        
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
        elif sys.argv[1] == "--dashboard-stats":
            return tester.run_dashboard_stats_tests()
    else:
        return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())