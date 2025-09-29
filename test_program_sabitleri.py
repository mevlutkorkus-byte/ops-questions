#!/usr/bin/env python3

from backend_test import QuestionBankAPITester

def main():
    """Run focused Program Sabitleri (Constants) tests"""
    tester = QuestionBankAPITester()
    
    print("🚀 Starting Program Sabitleri (Constants) Testing...")
    print(f"Backend URL: {tester.base_url}")
    print("="*70)
    
    # Test 1: Authentication System
    if not tester.test_authentication_system():
        print("\n❌ Authentication failed - cannot proceed with Program Sabitleri tests")
        return 1
    
    # Test 2: Program Sabitleri (Constants) - MAIN FOCUS
    tester.test_program_sabitleri_constants()
    
    # Print focused results
    print("\n" + "="*70)
    print("PROGRAM SABİTLERİ TEST RESULTS")
    print("="*70)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"📊 Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    # Show authentication status
    if tester.token:
        print(f"✅ Authentication: WORKING")
        print(f"🔑 Token: {tester.token[:30]}...")
    else:
        print(f"❌ Authentication: FAILED")
    
    # Show specific test results for Program Sabitleri
    program_sabitleri_tests = [result for result in tester.test_results if any(keyword in result['test_name'].lower() for keyword in ['category', 'department', 'employee', 'question', 'crud', 'data structure'])]
    if program_sabitleri_tests:
        print(f"\n📋 PROGRAM SABİTLERİ SPECIFIC RESULTS:")
        for test in program_sabitleri_tests:
            status = "✅ PASSED" if test['success'] else "❌ FAILED"
            print(f"   {status}: {test['test_name']}")
            if not test['success'] and test['details']:
                print(f"      Details: {test['details']}")
    
    # Show critical failures
    critical_failures = [result for result in tester.test_results if not result['success']]
    if critical_failures:
        print(f"\n🚨 FAILED TESTS:")
        for failure in critical_failures:
            print(f"   ❌ {failure['test_name']}: {failure['details']}")
    else:
        print(f"\n🎉 ALL PROGRAM SABİTLERİ TESTS PASSED!")
    
    return 0 if tester.tests_passed > 0 else 1

if __name__ == "__main__":
    exit(main())