import requests
import json
from datetime import datetime

class CevaplarTester:
    def __init__(self, base_url="https://qmanage-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None

    def authenticate(self):
        """Get authentication token"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = f"testuser_{timestamp}"
        test_email = f"test_{timestamp}@example.com"
        test_password = "TestPass123!"

        # Try registration
        response = requests.post(f"{self.api_url}/auth/register", json={
            "username": test_user,
            "email": test_email,
            "password": test_password
        })
        
        if response.status_code == 200:
            self.token = response.json()['access_token']
            print(f"✅ Authenticated successfully")
            return True
        
        print(f"❌ Authentication failed: {response.status_code}")
        return False

    def test_cevaplar_endpoints(self):
        """Test Cevaplar endpoints specifically"""
        if not self.token:
            print("❌ No token available")
            return
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
        
        # 1. Test questions-for-responses
        print("\n🔍 Testing GET /api/questions-for-responses")
        response = requests.get(f"{self.api_url}/questions-for-responses", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Retrieved {len(data.get('questions', []))} questions and {len(data.get('employees', []))} employees")
            
            # Get first question and employee for testing
            if data.get('questions') and data.get('employees'):
                question_id = data['questions'][0]['id']
                employee_id = data['employees'][0]['id']
                print(f"Using question_id: {question_id}, employee_id: {employee_id}")
                
                # 2. Test monthly-responses creation
                print("\n🔍 Testing POST /api/monthly-responses")
                monthly_data = {
                    "question_id": question_id,
                    "employee_id": employee_id,
                    "year": 2025,
                    "month": 1,
                    "numerical_value": 8.5,
                    "employee_comment": "Bu ay dijital dönüşüm projelerinde önemli ilerlemeler kaydettik."
                }
                
                response = requests.post(f"{self.api_url}/monthly-responses", json=monthly_data, headers=headers, timeout=30)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Monthly response created with ID: {result.get('id')}")
                    if result.get('ai_comment'):
                        print(f"✅ AI comment generated: {result['ai_comment'][:100]}...")
                    else:
                        print("⚠️ No AI comment generated")
                else:
                    print(f"❌ Failed: {response.text}")
                
                # 3. Test get all monthly responses
                print("\n🔍 Testing GET /api/monthly-responses")
                response = requests.get(f"{self.api_url}/monthly-responses", headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Retrieved {len(data)} monthly responses")
                else:
                    print(f"❌ Failed: {response.text}")
                
                # 4. Test get responses by question
                print(f"\n🔍 Testing GET /api/monthly-responses/question/{question_id}")
                response = requests.get(f"{self.api_url}/monthly-responses/question/{question_id}", headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Retrieved responses for question: {len(data.get('responses', []))} responses")
                else:
                    print(f"❌ Failed: {response.text}")
                
                # 5. Test chart data
                print(f"\n🔍 Testing GET /api/monthly-responses/chart-data/{question_id}")
                response = requests.get(f"{self.api_url}/monthly-responses/chart-data/{question_id}", headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Chart data retrieved with {len(data.get('chart_data', []))} months")
                else:
                    print(f"❌ Failed: {response.text}")
        else:
            print(f"❌ Failed: {response.text}")

    def run_test(self):
        print("🚀 Testing Cevaplar endpoints...")
        if self.authenticate():
            self.test_cevaplar_endpoints()
        else:
            print("❌ Cannot proceed without authentication")

if __name__ == "__main__":
    tester = CevaplarTester()
    tester.run_test()