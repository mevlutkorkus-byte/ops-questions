from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import hashlib
import secrets
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from jinja2 import Template


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT and security setup
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.environ.get('MAIL_USERNAME'),
    MAIL_PASSWORD=os.environ.get('MAIL_PASSWORD'),
    MAIL_FROM=os.environ.get('MAIL_FROM'),
    MAIL_PORT=int(os.environ.get('MAIL_PORT', 587)),
    MAIL_SERVER=os.environ.get('MAIL_SERVER'),
    MAIL_FROM_NAME=os.environ.get('MAIL_FROM_NAME'),
    MAIL_STARTTLS=os.environ.get('MAIL_STARTTLS', 'true').lower() == 'true',
    MAIL_SSL_TLS=os.environ.get('MAIL_SSL_TLS', 'false').lower() == 'true',
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Email Templates
EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Dijital Dönüşüm - Soru Yanıtlama</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #1f2937; font-size: 24px; font-weight: bold; margin: 0; }
        .subtitle { color: #6b7280; font-size: 16px; margin-top: 5px; }
        .question-box { background: #f0fdfa; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .question-title { font-weight: bold; color: #064e3b; margin-bottom: 10px; }
        .question-text { color: #374151; line-height: 1.6; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { opacity: 0.9; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Dijital Dönüşüm</h1>
            <p class="subtitle">Soru Yanıtlama Sistemi</p>
        </div>
        
        <p>Merhaba <strong>{{ employee_name }}</strong>,</p>
        
        <p>{{ month_year }} dönemi için size atanmış bir soru bulunmaktadır. Lütfen aşağıdaki soruyu inceleyip yanıtlayınız:</p>
        
        <div class="question-box">
            <div class="question-title">{{ question_category }} - {{ question_text }}</div>
            <div class="question-text">
                <strong>Önem/Gerekçe:</strong><br>
                {{ importance_reason }}
            </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ answer_link }}" class="button">Soruyu Yanıtla</a>
        </div>
        
        <p><strong>Not:</strong> Bu link sadece sizin için oluşturulmuştur ve tek kullanımlıktır.</p>
        
        <div class="footer">
            <p>Bu e-posta Dijital Yönetim sistemi tarafından otomatik olarak gönderilmiştir.</p>
            <p>Sorularınız için sistem yöneticinizle iletişime geçebilirsiniz.</p>
        </div>
    </div>
</body>
</html>
"""

async def send_question_email(employee_email: str, employee_name: str, question: dict, assignment_id: str, month_year: str):
    """Send question email to employee"""
    try:
        # Create email content
        answer_link = f"{frontend_url}/answer/{assignment_id}"
        
        template = Template(EMAIL_TEMPLATE)
        html_content = template.render(
            employee_name=employee_name,
            question_category=question.get('category', ''),
            question_text=question.get('question_text', ''),
            importance_reason=question.get('importance_reason', ''),
            answer_link=answer_link,
            month_year=month_year
        )
        
        message = MessageSchema(
            subject=f"Dijital Yönetim - {month_year} Dönemi Soru Yanıtlama",
            recipients=[employee_email],
            body=html_content,
            subtype=MessageType.html
        )
        
        fm = FastMail(conf)
        await fm.send_message(message)
        return True
        
    except Exception as e:
        print(f"Email gönderim hatası: {str(e)}")
        return False

# Create the main app without a prefix
app = FastAPI(title="Auth System API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper functions
def verify_password(plain_password, hashed_password):
    # Extract salt and hash
    parts = hashed_password.split('$')
    if len(parts) != 3:
        return False
    
    salt = parts[1]
    stored_hash = parts[2]
    
    # Hash the plain password with the same salt
    calculated_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
    calculated_hash_hex = calculated_hash.hex()
    
    return secrets.compare_digest(calculated_hash_hex, stored_hash)

def get_password_hash(password):
    # Generate a random salt
    salt = secrets.token_hex(16)
    
    # Hash the password with the salt
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    password_hash_hex = password_hash.hex()
    
    # Return salt$hash format
    return f"pbkdf2_sha256${salt}${password_hash_hex}"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = await db.users.find_one({"username": username})
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return User(**user)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    email: str
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class Employee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = Field(None, min_length=5, max_length=100)
    department: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=16, le=100)
    gender: str = Field(..., pattern="^(Erkek|Kadın|Diğer)$")
    hire_date: str  # YYYY-MM-DD format
    birth_date: str  # YYYY-MM-DD format
    salary: float = Field(..., ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = Field(None, min_length=5, max_length=100)
    department: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=16, le=100)
    gender: str = Field(..., pattern="^(Erkek|Kadın|Diğer)$")
    hire_date: str  # YYYY-MM-DD format
    birth_date: str  # YYYY-MM-DD format
    salary: float = Field(..., ge=0)

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str = Field(..., min_length=2, max_length=100)
    question_text: str = Field(..., min_length=10, max_length=1000)
    importance_reason: str = Field(..., min_length=10, max_length=1000)
    expected_action: str = Field(..., min_length=10, max_length=1000)
    period: str = Field(..., pattern="^(Haftalık|Aylık|Çeyreklik|Altı Aylık|Yıllık|İhtiyaç Halinde)$")
    chart_type: Optional[str] = Field(None, pattern="^(Sütun|Pasta|Çizgi|Alan|Daire|Bar|Trend)$")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionCreate(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    question_text: str = Field(..., min_length=10, max_length=1000)
    importance_reason: str = Field(..., min_length=10, max_length=1000)
    expected_action: str = Field(..., min_length=10, max_length=1000)
    period: str = Field(..., pattern="^(Haftalık|Aylık|Çeyreklik|Altı Aylık|Yıllık|İhtiyaç Halinde)$")
    chart_type: Optional[str] = Field(None, pattern="^(Sütun|Pasta|Çizgi|Alan|Daire|Bar|Trend)$")

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=2, max_length=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class Department(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=2, max_length=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class QuestionAssignment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_id: str
    employee_id: str
    year: int
    month: int
    email_sent: bool = False
    response_received: bool = False
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assignment_id: str
    question_id: str
    employee_id: str
    response_text: str = Field(..., min_length=1, max_length=2000)
    year: int
    month: int
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionResponseCreate(BaseModel):
    assignment_id: str
    response_text: str = Field(..., min_length=1, max_length=2000)

class ShareQuestionsRequest(BaseModel):
    assignments: List[dict]  # [{"question_id": "...", "employee_id": "..."}]

# Auth Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user_dict = {
        "id": str(uuid.uuid4()),
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data.username}, expires_delta=access_token_expires
    )
    
    user = User(
        id=user_dict["id"],
        username=user_dict["username"],
        email=user_dict["email"],
        created_at=datetime.fromisoformat(user_dict["created_at"].replace('Z', '+00:00')) if isinstance(user_dict["created_at"], str) else user_dict["created_at"]
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await db.users.find_one({"username": user_credentials.username})
    if not user or not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    user_obj = User(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        created_at=datetime.fromisoformat(user["created_at"].replace('Z', '+00:00')) if isinstance(user["created_at"], str) else user["created_at"]
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Protected routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    employee_count = await db.employees.count_documents({})
    question_count = await db.questions.count_documents({})
    category_count = await db.categories.count_documents({})
    department_count = await db.departments.count_documents({})
    
    return {
        "stats": {
            "total_employees": employee_count,
            "total_questions": question_count,
            "total_categories": category_count,
            "total_departments": department_count
        }
    }

# Original routes (now protected)
@api_router.get("/")
async def root():
    return {"message": "Auth System API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, current_user: User = Depends(get_current_user)):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    status_data = status_obj.dict()
    status_data["created_at"] = status_data["timestamp"].isoformat()
    status_data.pop("timestamp", None)
    _ = await db.status_checks.insert_one(status_data)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(current_user: User = Depends(get_current_user)):
    status_checks = await db.status_checks.find().to_list(1000)
    result = []
    for status_check in status_checks:
        if "created_at" in status_check:
            status_check["timestamp"] = datetime.fromisoformat(status_check["created_at"].replace('Z', '+00:00')) if isinstance(status_check["created_at"], str) else status_check["created_at"]
        result.append(StatusCheck(**status_check))
    return result

# Employee Routes
@api_router.post("/employees", response_model=Employee)
async def create_employee(employee_data: EmployeeCreate, current_user: User = Depends(get_current_user)):
    # Validate date formats
    try:
        datetime.strptime(employee_data.hire_date, "%Y-%m-%d")
        datetime.strptime(employee_data.birth_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tarih formatı YYYY-MM-DD olmalıdır"
        )
    
    # Check if employee with same phone already exists
    existing_employee = await db.employees.find_one({"phone": employee_data.phone})
    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu telefon numarası ile kayıtlı çalışan zaten mevcut"
        )
    
    employee_dict = employee_data.dict()
    employee_dict["id"] = str(uuid.uuid4())
    employee_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.employees.insert_one(employee_dict)
    
    employee = Employee(**employee_dict)
    employee.created_at = datetime.fromisoformat(employee_dict["created_at"].replace('Z', '+00:00')) if isinstance(employee_dict["created_at"], str) else employee_dict["created_at"]
    
    return employee

@api_router.get("/employees", response_model=List[Employee])
async def get_employees(current_user: User = Depends(get_current_user)):
    employees = await db.employees.find().to_list(1000)
    result = []
    for employee in employees:
        if "created_at" in employee:
            employee["created_at"] = datetime.fromisoformat(employee["created_at"].replace('Z', '+00:00')) if isinstance(employee["created_at"], str) else employee["created_at"]
        result.append(Employee(**employee))
    return result

@api_router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: str, current_user: User = Depends(get_current_user)):
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Çalışan bulunamadı"
        )
    
    if "created_at" in employee:
        employee["created_at"] = datetime.fromisoformat(employee["created_at"].replace('Z', '+00:00')) if isinstance(employee["created_at"], str) else employee["created_at"]
    
    return Employee(**employee)

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, employee_data: EmployeeCreate, current_user: User = Depends(get_current_user)):
    # Validate date formats
    try:
        datetime.strptime(employee_data.hire_date, "%Y-%m-%d")
        datetime.strptime(employee_data.birth_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tarih formatı YYYY-MM-DD olmalıdır"
        )
    
    # Check if employee exists
    existing_employee = await db.employees.find_one({"id": employee_id})
    if not existing_employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Çalışan bulunamadı"
        )
    
    # Check if phone is taken by another employee
    phone_check = await db.employees.find_one({"phone": employee_data.phone, "id": {"$ne": employee_id}})
    if phone_check:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu telefon numarası ile kayıtlı başka bir çalışan mevcut"
        )
    
    update_data = employee_data.dict()
    await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    
    updated_employee = await db.employees.find_one({"id": employee_id})
    if "created_at" in updated_employee:
        updated_employee["created_at"] = datetime.fromisoformat(updated_employee["created_at"].replace('Z', '+00:00')) if isinstance(updated_employee["created_at"], str) else updated_employee["created_at"]
    
    return Employee(**updated_employee)

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: User = Depends(get_current_user)):
    result = await db.employees.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Çalışan bulunamadı"
        )
    
    return {"message": "Çalışan başarıyla silindi"}

# Question Bank Routes
@api_router.post("/questions", response_model=Question)
async def create_question(question_data: QuestionCreate, current_user: User = Depends(get_current_user)):
    question_dict = question_data.dict()
    question_dict["id"] = str(uuid.uuid4())
    question_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.questions.insert_one(question_dict)
    
    question = Question(**question_dict)
    question.created_at = datetime.fromisoformat(question_dict["created_at"].replace('Z', '+00:00')) if isinstance(question_dict["created_at"], str) else question_dict["created_at"]
    
    return question

@api_router.get("/questions", response_model=List[Question])
async def get_questions(current_user: User = Depends(get_current_user)):
    questions = await db.questions.find().to_list(1000)
    result = []
    for question in questions:
        if "created_at" in question:
            question["created_at"] = datetime.fromisoformat(question["created_at"].replace('Z', '+00:00')) if isinstance(question["created_at"], str) else question["created_at"]
        result.append(Question(**question))
    return result

@api_router.get("/questions/{question_id}", response_model=Question)
async def get_question(question_id: str, current_user: User = Depends(get_current_user)):
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soru bulunamadı"
        )
    
    if "created_at" in question:
        question["created_at"] = datetime.fromisoformat(question["created_at"].replace('Z', '+00:00')) if isinstance(question["created_at"], str) else question["created_at"]
    
    return Question(**question)

@api_router.put("/questions/{question_id}", response_model=Question)
async def update_question(question_id: str, question_data: QuestionCreate, current_user: User = Depends(get_current_user)):
    # Check if question exists
    existing_question = await db.questions.find_one({"id": question_id})
    if not existing_question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soru bulunamadı"
        )
    
    update_data = question_data.dict()
    await db.questions.update_one({"id": question_id}, {"$set": update_data})
    
    updated_question = await db.questions.find_one({"id": question_id})
    if "created_at" in updated_question:
        updated_question["created_at"] = datetime.fromisoformat(updated_question["created_at"].replace('Z', '+00:00')) if isinstance(updated_question["created_at"], str) else updated_question["created_at"]
    
    return Question(**updated_question)

@api_router.delete("/questions/{question_id}")
async def delete_question(question_id: str, current_user: User = Depends(get_current_user)):
    result = await db.questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soru bulunamadı"
        )
    
    return {"message": "Soru başarıyla silindi"}

# Category Routes
@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    # Check if category already exists
    existing_category = await db.categories.find_one({"name": category_data.name})
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu kategori zaten mevcut"
        )
    
    category_dict = category_data.dict()
    category_dict["id"] = str(uuid.uuid4())
    category_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.categories.insert_one(category_dict)
    
    category = Category(**category_dict)
    category.created_at = datetime.fromisoformat(category_dict["created_at"].replace('Z', '+00:00')) if isinstance(category_dict["created_at"], str) else category_dict["created_at"]
    
    return category

@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: User = Depends(get_current_user)):
    categories = await db.categories.find().sort("name", 1).to_list(1000)
    result = []
    for category in categories:
        if "created_at" in category:
            category["created_at"] = datetime.fromisoformat(category["created_at"].replace('Z', '+00:00')) if isinstance(category["created_at"], str) else category["created_at"]
        result.append(Category(**category))
    return result

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kategori bulunamadı"
        )
    
    return {"message": "Kategori başarıyla silindi"}

# Department Routes
@api_router.post("/departments", response_model=Department)
async def create_department(department_data: DepartmentCreate, current_user: User = Depends(get_current_user)):
    # Check if department already exists
    existing_department = await db.departments.find_one({"name": department_data.name})
    if existing_department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu departman zaten mevcut"
        )
    
    department_dict = department_data.dict()
    department_dict["id"] = str(uuid.uuid4())
    department_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.departments.insert_one(department_dict)
    
    department = Department(**department_dict)
    department.created_at = datetime.fromisoformat(department_dict["created_at"].replace('Z', '+00:00')) if isinstance(department_dict["created_at"], str) else department_dict["created_at"]
    
    return department

@api_router.get("/departments", response_model=List[Department])
async def get_departments(current_user: User = Depends(get_current_user)):
    departments = await db.departments.find().sort("name", 1).to_list(1000)
    result = []
    for department in departments:
        if "created_at" in department:
            department["created_at"] = datetime.fromisoformat(department["created_at"].replace('Z', '+00:00')) if isinstance(department["created_at"], str) else department["created_at"]
        result.append(Department(**department))
    return result

@api_router.delete("/departments/{department_id}")
async def delete_department(department_id: str, current_user: User = Depends(get_current_user)):
    result = await db.departments.delete_one({"id": department_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Departman bulunamadı"
        )
    
    return {"message": "Departman başarıyla silindi"}

# Question Sharing Routes
@api_router.get("/questions-share-list")
async def get_questions_for_sharing(current_user: User = Depends(get_current_user)):
    """Get all questions with employees for sharing interface"""
    questions = await db.questions.find().to_list(1000)
    employees = await db.employees.find().to_list(1000)
    
    # Format questions
    formatted_questions = []
    for question in questions:
        if "created_at" in question:
            question["created_at"] = datetime.fromisoformat(question["created_at"].replace('Z', '+00:00')) if isinstance(question["created_at"], str) else question["created_at"]
        formatted_questions.append(Question(**question))
    
    # Format employees
    formatted_employees = []
    for employee in employees:
        if "created_at" in employee:
            employee["created_at"] = datetime.fromisoformat(employee["created_at"].replace('Z', '+00:00')) if isinstance(employee["created_at"], str) else employee["created_at"]
        formatted_employees.append(Employee(**employee))
    
    return {
        "questions": formatted_questions,
        "employees": formatted_employees
    }

@api_router.post("/questions-share")
async def share_questions(share_request: ShareQuestionsRequest, current_user: User = Depends(get_current_user)):
    """Share questions via email to assigned employees"""
    current_date = datetime.now(timezone.utc)
    year = current_date.year
    month = current_date.month
    month_names = {
        1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran",
        7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"
    }
    month_year = f"{month_names[month]} {year}"
    
    assignments_created = []
    email_successes = 0
    email_failures = []
    
    for assignment_data in share_request.assignments:
        question_id = assignment_data.get("question_id")
        employee_id = assignment_data.get("employee_id")
        
        if not question_id or not employee_id:
            continue
        
        # Check if assignment already exists for this month
        existing_assignment = await db.question_assignments.find_one({
            "question_id": question_id,
            "employee_id": employee_id, 
            "year": year,
            "month": month
        })
        
        if existing_assignment:
            continue  # Skip if already assigned
        
        # Get question and employee details
        question = await db.questions.find_one({"id": question_id})
        employee = await db.employees.find_one({"id": employee_id})
        
        if not question or not employee:
            continue
        
        # Create assignment
        assignment_id = str(uuid.uuid4())
        assignment_dict = {
            "id": assignment_id,
            "question_id": question_id,
            "employee_id": employee_id,
            "year": year,
            "month": month,
            "email_sent": False,
            "response_received": False,
            "assigned_at": current_date.isoformat()
        }
        
        # Send email if employee has email address
        email_sent = False
        if employee.get('email'):
            employee_name = f"{employee['first_name']} {employee['last_name']}"
            email_sent = await send_question_email(
                employee['email'],
                employee_name,
                question,
                assignment_id,
                month_year
            )
            
            if email_sent:
                email_successes += 1
            else:
                email_failures.append(employee_name)
        else:
            # No email address
            email_failures.append(f"{employee['first_name']} {employee['last_name']} (E-posta adresi yok)")
        
        # Update assignment with email status
        assignment_dict["email_sent"] = email_sent
        
        await db.question_assignments.insert_one(assignment_dict)
        assignments_created.append(assignment_dict)
    
    # Prepare response message
    message_parts = []
    if assignments_created:
        message_parts.append(f"{len(assignments_created)} soru atandı")
    
    if email_successes:
        message_parts.append(f"{email_successes} e-posta başarıyla gönderildi")
    
    if email_failures:
        message_parts.append(f"{len(email_failures)} e-posta gönderilemedi")
    
    response_message = ", ".join(message_parts) if message_parts else "İşlem tamamlandı"
    
    return {
        "message": response_message,
        "assignments_created": len(assignments_created),
        "emails_sent": email_successes,
        "email_failures": email_failures,
        "year": year,
        "month": month
    }

# Public Question Response Routes (No auth required)
@api_router.get("/public/question-form/{assignment_id}")
async def get_public_question_form(assignment_id: str):
    """Get question form for public response (no auth required)"""
    assignment = await db.question_assignments.find_one({"id": assignment_id})
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soru ataması bulunamadı"
        )
    
    # Check if already responded
    existing_response = await db.question_responses.find_one({"assignment_id": assignment_id})
    if existing_response:
        return {"message": "Bu soruya zaten yanıt verilmiş", "already_responded": True}
    
    # Get question and employee details
    question = await db.questions.find_one({"id": assignment["question_id"]})
    employee = await db.employees.find_one({"id": assignment["employee_id"]})
    
    if not question or not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soru veya çalışan bulunamadı"
        )
    
    return {
        "assignment_id": assignment_id,
        "question": {
            "id": question["id"],
            "question_text": question["question_text"],
            "category": question["category"],
            "importance_reason": question["importance_reason"],
            "expected_action": question["expected_action"]
        },
        "employee": {
            "first_name": employee["first_name"],
            "last_name": employee["last_name"],
            "department": employee["department"]
        },
        "year": assignment["year"],
        "month": assignment["month"],
        "already_responded": False
    }

@api_router.post("/public/question-response")
async def submit_public_question_response(response_data: QuestionResponseCreate):
    """Submit question response from public form (no auth required)"""
    # Verify assignment exists and not already responded
    assignment = await db.question_assignments.find_one({"id": response_data.assignment_id})
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soru ataması bulunamadı"
        )
    
    # Check if already responded
    existing_response = await db.question_responses.find_one({"assignment_id": response_data.assignment_id})
    if existing_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu soruya zaten yanıt verilmiş"
        )
    
    # Create response
    response_dict = {
        "id": str(uuid.uuid4()),
        "assignment_id": response_data.assignment_id,
        "question_id": assignment["question_id"],
        "employee_id": assignment["employee_id"],
        "response_text": response_data.response_text,
        "year": assignment["year"],
        "month": assignment["month"],
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.question_responses.insert_one(response_dict)
    
    # Update assignment as responded
    await db.question_assignments.update_one(
        {"id": response_data.assignment_id},
        {"$set": {"response_received": True}}
    )
    
    return {
        "message": "Yanıtınız başarıyla kaydedildi",
        "response_id": response_dict["id"]
    }

# Question Responses Management
@api_router.get("/question-responses")
async def get_question_responses(current_user: User = Depends(get_current_user)):
    """Get all question responses"""
    responses = await db.question_responses.find().to_list(1000)
    
    # Get additional data for each response
    formatted_responses = []
    for response in responses:
        question = await db.questions.find_one({"id": response["question_id"]})
        employee = await db.employees.find_one({"id": response["employee_id"]})
        
        if question and employee:
            formatted_response = {
                **response,
                "question_text": question["question_text"],
                "question_category": question["category"],
                "employee_name": f"{employee['first_name']} {employee['last_name']}",
                "employee_department": employee["department"]
            }
            formatted_responses.append(formatted_response)
    
    return formatted_responses

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()