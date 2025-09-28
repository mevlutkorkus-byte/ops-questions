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
    
    return {
        "stats": {
            "total_employees": employee_count,
            "total_questions": question_count
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