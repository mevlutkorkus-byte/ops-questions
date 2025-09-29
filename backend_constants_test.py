import requests
import sys
import json
from datetime import datetime

class ProgramConstantsAPITester:
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
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success and response.content:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                except:
                    details += f", Response: {response.text[:100]}..."
            elif not success:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Error: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test user authentication"""
        print("\n🔐 Testing Authentication...")
        
        # Test login
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"username": "testuser", "password": "testpass123"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        
        # If login fails, try registration
        success, response = self.run_test(
            "User Registration",
            "POST", 
            "auth/register",
            200,
            data={
                "username": "testuser",
                "email": "test@example.com", 
                "password": "testpass123"
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
            
        return False

    def test_categories_crud(self):
        """Test Categories CRUD operations"""
        print("\n📂 Testing Categories CRUD...")
        
        # Test create category
        success, response = self.run_test(
            "Create Category",
            "POST",
            "categories",
            200,
            data={"name": "Test Kategori"}
        )
        
        category_id = None
        if success and 'id' in response:
            category_id = response['id']
        
        # Test duplicate category creation (should fail)
        self.run_test(
            "Create Duplicate Category (should fail)",
            "POST",
            "categories", 
            400,
            data={"name": "Test Kategori"}
        )
        
        # Test get all categories
        success, response = self.run_test(
            "Get All Categories",
            "GET",
            "categories",
            200
        )
        
        # Verify our category is in the list
        if success and isinstance(response, list):
            found_category = any(cat.get('name') == 'Test Kategori' for cat in response)
            self.log_test(
                "Verify Category in List", 
                found_category,
                f"Found {len(response)} categories, Test Kategori present: {found_category}"
            )
        
        # Test create another category for testing
        success2, response2 = self.run_test(
            "Create Second Category",
            "POST",
            "categories",
            200,
            data={"name": "İkinci Kategori"}
        )
        
        category_id2 = None
        if success2 and 'id' in response2:
            category_id2 = response2['id']
        
        # Test delete category
        if category_id:
            self.run_test(
                "Delete Category",
                "DELETE",
                f"categories/{category_id}",
                200
            )
            
            # Test delete non-existent category
            self.run_test(
                "Delete Non-existent Category (should fail)",
                "DELETE",
                f"categories/{category_id}",
                404
            )
        
        return category_id2  # Return second category for integration tests

    def test_departments_crud(self):
        """Test Departments CRUD operations"""
        print("\n🏢 Testing Departments CRUD...")
        
        # Test create department
        success, response = self.run_test(
            "Create Department",
            "POST",
            "departments",
            200,
            data={"name": "Test Departmanı"}
        )
        
        department_id = None
        if success and 'id' in response:
            department_id = response['id']
        
        # Test duplicate department creation (should fail)
        self.run_test(
            "Create Duplicate Department (should fail)",
            "POST",
            "departments",
            400,
            data={"name": "Test Departmanı"}
        )
        
        # Test get all departments
        success, response = self.run_test(
            "Get All Departments",
            "GET",
            "departments",
            200
        )
        
        # Verify our department is in the list
        if success and isinstance(response, list):
            found_department = any(dept.get('name') == 'Test Departmanı' for dept in response)
            self.log_test(
                "Verify Department in List",
                found_department,
                f"Found {len(response)} departments, Test Departmanı present: {found_department}"
            )
        
        # Test create another department for testing
        success2, response2 = self.run_test(
            "Create Second Department",
            "POST",
            "departments",
            200,
            data={"name": "İkinci Departman"}
        )
        
        department_id2 = None
        if success2 and 'id' in response2:
            department_id2 = response2['id']
        
        # Test delete department
        if department_id:
            self.run_test(
                "Delete Department",
                "DELETE",
                f"departments/{department_id}",
                200
            )
            
            # Test delete non-existent department
            self.run_test(
                "Delete Non-existent Department (should fail)",
                "DELETE",
                f"departments/{department_id}",
                404
            )
        
        return department_id2  # Return second department for integration tests

    def test_integration_with_questions(self, category_id):
        """Test integration with Question Bank"""
        print("\n🔗 Testing Category Integration with Questions...")
        
        if not category_id:
            self.log_test("Category Integration Test", False, "No category ID available")
            return
        
        # First get the category name
        success, categories = self.run_test(
            "Get Categories for Integration",
            "GET",
            "categories",
            200
        )
        
        category_name = None
        if success and isinstance(categories, list):
            for cat in categories:
                if cat.get('id') == category_id:
                    category_name = cat.get('name')
                    break
        
        if not category_name:
            self.log_test("Find Category Name", False, "Could not find category name")
            return
        
        # Test creating a question with the category
        question_data = {
            "category": category_name,
            "question_text": "Bu test sorusu kategori entegrasyonu için oluşturulmuştur?",
            "importance_reason": "Kategori entegrasyonunu test etmek için gerekli",
            "expected_action": "Entegrasyon başarılı ise kategori dropdown'ında görünmeli",
            "period": "Aylık",
            "chart_type": "Sütun"
        }
        
        self.run_test(
            "Create Question with Category",
            "POST",
            "questions",
            200,
            data=question_data
        )

    def test_integration_with_employees(self, department_id):
        """Test integration with Employee Management"""
        print("\n🔗 Testing Department Integration with Employees...")
        
        if not department_id:
            self.log_test("Department Integration Test", False, "No department ID available")
            return
        
        # First get the department name
        success, departments = self.run_test(
            "Get Departments for Integration",
            "GET",
            "departments",
            200
        )
        
        department_name = None
        if success and isinstance(departments, list):
            for dept in departments:
                if dept.get('id') == department_id:
                    department_name = dept.get('name')
                    break
        
        if not department_name:
            self.log_test("Find Department Name", False, "Could not find department name")
            return
        
        # Test creating an employee with the department
        employee_data = {
            "first_name": "Test",
            "last_name": "Çalışan",
            "phone": "05551234567",
            "department": department_name,
            "age": 30,
            "gender": "Erkek",
            "hire_date": "2024-01-15",
            "birth_date": "1994-05-20",
            "salary": 15000.0
        }
        
        self.run_test(
            "Create Employee with Department",
            "POST",
            "employees",
            200,
            data=employee_data
        )

    def test_dashboard_stats(self):
        """Test dashboard stats include categories and departments"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success and 'stats' in response:
            stats = response['stats']
            required_fields = ['total_categories', 'total_departments', 'total_employees', 'total_questions']
            
            for field in required_fields:
                has_field = field in stats
                self.log_test(
                    f"Dashboard Stats - {field}",
                    has_field,
                    f"Value: {stats.get(field, 'Missing')}"
                )

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
        
        with open('/app/test_reports/backend_constants_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Results saved to /app/test_reports/backend_constants_results.json")

def main():
    print("🚀 Starting Program Constants Backend API Testing...")
    print("=" * 60)
    
    tester = ProgramConstantsAPITester()
    
    # Test authentication first
    if not tester.test_authentication():
        print("❌ Authentication failed, stopping tests")
        return 1
    
    print(f"✅ Authentication successful, token obtained")
    
    # Test Categories CRUD
    category_id = tester.test_categories_crud()
    
    # Test Departments CRUD  
    department_id = tester.test_departments_crud()
    
    # Test integrations
    tester.test_integration_with_questions(category_id)
    tester.test_integration_with_employees(department_id)
    
    # Test dashboard stats
    tester.test_dashboard_stats()
    
    # Save results
    tester.save_results()
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 FINAL RESULTS")
    print("=" * 60)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())