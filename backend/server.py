from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
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
            <p>Bu e-posta Dijital Dönüşüm sistemi tarafından otomatik olarak gönderilmiştir.</p>
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
        
        # For demo purposes - simulate successful email sending
        print("[DEMO EMAIL] E-posta gönderildi:")
        print(f"Alıcı: {employee_email}")
        print(f"Konu: Dijital Dönüşüm - {month_year} Dönemi Soru Yanıtlama")
        print(f"İçerik: {employee_name} için {question.get('category', '')} sorusu")
        print(f"Link: {answer_link}")
        print("-" * 50)
        
        # Comment out real email sending for demo
        # message = MessageSchema(
        #     subject=f"Dijital Dönüşüm - {month_year} Dönemi Soru Yanıtlama",
        #     recipients=[employee_email],
        #     body=html_content,
        #     subtype=MessageType.html
        # )
        # 
        # fm = FastMail(conf)
        # await fm.send_message(message)
        
        return True  # Simulate successful sending
        
    except Exception as e:
        print(f"Email gönderim hatası: {str(e)}")
        return False

# AI Integration for Comment Generation
async def generate_ai_comment(question_text: str, category: str, period: str, table_data: Dict[str, str], table_rows: List[dict], monthly_comment: str = None, year: int = None, month: int = None) -> str:
    """Generate AI comment based on employee response"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get the API key from environment
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return "AI yorum oluşturma servisi şu anda kullanılamıyor."
        
        # Create AI chat instance
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai_comment_{str(uuid.uuid4())}",
            system_message="""Sen bir dijital dönüşüm uzmanısın. Çalışanların verdikleri yanıtları analiz edip yapıcı, profesyonel ve gelişim odaklı yorumlar yapıyorsun. 
            
            Görevin:
            1. Çalışanın verdiği yanıtı objektif olarak değerlendirmek
            2. Güçlü yönleri vurgulamak
            3. Gelişim alanları önermek
            4. Sayısal değerler için: trend analizi, büyüklük değerlendirmesi, benchmark karşılaştırması
            5. Kısa, net ve yapıcı olmak (maksimum 200 kelime)
            
            Sayısal değerler milyonlar, yüzdeler, adetler vb. herhangi bir formatda olabilir.
            Yanıtın Türkçe olmalı ve profesyonel bir ton kullanmalısın."""
        ).with_model("openai", "gpt-5")
        
        # Prepare table data text
        months_tr = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                     "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
        month_name = months_tr[month - 1] if month and 1 <= month <= 12 else "Bilinmeyen Ay"
        
        data_text = f"\n{month_name} {year} Verileri:\n"
        if table_data and table_rows:
            row_dict = {row["id"]: row for row in table_rows}
            for row_id, value in table_data.items():
                if row_id in row_dict and value:
                    row = row_dict[row_id]
                    unit = f" {row['unit']}" if row.get('unit') else ""
                    data_text += f"- {row['name']}: {value}{unit}\n"
        
        comment_text = f"\nÇalışan Yorumu: {monthly_comment}" if monthly_comment else ""
        
        prompt = f"""
        Soru Kategorisi: {category}
        Soru: {question_text}
        Periyot: {period}{data_text}{comment_text}
        
        Bu aylık verileri analiz edip yapıcı bir AI yorumu oluştur. Değerlerin anlamı, trendler ve potansiyel iyileştirme alanları hakkında yorum yap.
        """
        
        # Create user message
        user_message = UserMessage(text=prompt)
        
        # Get AI response
        response = await chat.send_message(user_message)
        
        return response if response else "AI yorumu oluşturulamadı."
        
    except Exception as e:
        print(f"AI yorum oluşturma hatası: {str(e)}")
        return f"AI yorum oluşturulurken bir hata oluştu: {str(e)}"

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

# Table Row Model for dynamic table structure
class TableRow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=100)  # e.g., "Satış", "Pazarlama"
    unit: Optional[str] = Field(None, max_length=20)  # e.g., "adet", "TL", "%"
    order: int = Field(default=0)

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str = Field(..., min_length=2, max_length=100)
    question_text: str = Field(..., min_length=10, max_length=1000)
    importance_reason: str = Field(..., min_length=10, max_length=1000)
    expected_action: str = Field(..., min_length=10, max_length=1000)
    period: str = Field(..., pattern="^(Günlük|Haftalık|Aylık|Çeyreklik|Altı Aylık|Yıllık|İhtiyaç Halinde)$")
    chart_type: Optional[str] = Field(None, pattern="^(Sütun|Pasta|Çizgi|Alan|Daire|Bar|Trend)$")
    table_rows: List[TableRow] = Field(default_factory=list)  # Dynamic table rows (2-10 rows)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionCreate(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    question_text: str = Field(..., min_length=10, max_length=1000)
    importance_reason: str = Field(..., min_length=10, max_length=1000)
    expected_action: str = Field(..., min_length=10, max_length=1000)
    period: str = Field(..., pattern="^(Günlük|Haftalık|Aylık|Çeyreklik|Altı Aylık|Yıllık|İhtiyaç Halinde)$")
    chart_type: Optional[str] = Field(None, pattern="^(Sütun|Pasta|Çizgi|Alan|Daire|Bar|Trend)$")
    table_rows: List[TableRow] = Field(default_factory=list)

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

# Response Data Models for Cevaplar Feature
# Table Response Model - Clean and Simple
class TableResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_id: str
    employee_id: str
    year: int
    month: int
    # Table data: {"row_id": value, "row_id": value, ...}
    table_data: Dict[str, str] = Field(default_factory=dict)  # row_id -> value mapping
    monthly_comment: Optional[str] = Field(None, max_length=2000)  # Comment for this specific month
    ai_comment: Optional[str] = Field(None, max_length=3000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TableResponseCreate(BaseModel):
    question_id: str
    employee_id: str  
    year: int
    month: int
    table_data: Dict[str, str] = Field(default_factory=dict)
    monthly_comment: Optional[str] = Field(None, max_length=2000)

class TableResponseUpdate(BaseModel):
    table_data: Dict[str, str] = Field(default_factory=dict)
    monthly_comment: Optional[str] = Field(None, max_length=2000)

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
@api_router.get("/analytics/insights/{question_id}")
async def get_advanced_insights(question_id: str, current_user: User = Depends(get_current_user)):
    """Get AI-powered advanced analytics insights for a specific question"""
    from datetime import datetime, timedelta
    import statistics
    
    # Get question data
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Get all responses for this question
    responses = await db.table_responses.find({"question_id": question_id}).to_list(1000)
    
    if not responses:
        return {
            "question_id": question_id,
            "question_text": question.get("question_text", ""),
            "insights": {
                "data_trends": [],
                "predictions": [],
                "anomalies": [],
                "recommendations": ["Henüz yeterli veri bulunmuyor. Lütfen daha fazla yanıt toplayın."],
                "performance_score": 0,
                "confidence_level": "low"
            },
            "generated_at": datetime.now().isoformat()
        }
    
    # Organize data by periods and table rows
    period_data = {}
    table_rows = question.get("table_rows", [])
    
    for response in responses:
        period_key = f"{response.get('year', 0)}-{response.get('month', 0):02d}"
        if period_key not in period_data:
            period_data[period_key] = {}
        
        for row in table_rows:
            value = response.get("table_data", {}).get(row["id"], "0")
            try:
                numeric_value = float(value) if value else 0
                period_data[period_key][row["name"]] = numeric_value
            except (ValueError, TypeError):
                period_data[period_key][row["name"]] = 0
    
    # Calculate insights
    insights = {
        "data_trends": [],
        "predictions": [],
        "anomalies": [],
        "recommendations": [],
        "performance_score": 0,
        "confidence_level": "medium"
    }
    
    # Trend Analysis
    for row in table_rows:
        row_name = row["name"]
        values = []
        periods = []
        
        for period_key in sorted(period_data.keys()):
            if row_name in period_data[period_key]:
                values.append(period_data[period_key][row_name])
                periods.append(period_key)
        
        if len(values) >= 2:
            # Calculate trend
            if len(values) >= 3:
                recent_avg = statistics.mean(values[-3:])
                older_avg = statistics.mean(values[:-3]) if len(values) > 3 else values[0]
                trend_percentage = ((recent_avg - older_avg) / older_avg * 100) if older_avg != 0 else 0
            else:
                trend_percentage = ((values[-1] - values[0]) / values[0] * 100) if values[0] != 0 else 0
            
            trend_direction = "artış" if trend_percentage > 5 else "azalış" if trend_percentage < -5 else "stabil"
            
            insights["data_trends"].append({
                "metric": row_name,
                "direction": trend_direction,
                "percentage": round(trend_percentage, 2),
                "current_value": values[-1],
                "previous_value": values[-2] if len(values) >= 2 else 0,
                "confidence": "high" if len(values) >= 4 else "medium"
            })
            
            # Simple prediction (linear trend)
            if len(values) >= 3:
                # Simple linear regression for next period
                x_values = list(range(len(values)))
                slope = sum((x_values[i] - statistics.mean(x_values)) * (values[i] - statistics.mean(values)) 
                           for i in range(len(values))) / sum((x - statistics.mean(x_values))**2 for x in x_values)
                intercept = statistics.mean(values) - slope * statistics.mean(x_values)
                next_prediction = slope * len(values) + intercept
                
                insights["predictions"].append({
                    "metric": row_name,
                    "predicted_value": round(max(0, next_prediction), 2),
                    "confidence_interval": {
                        "min": round(max(0, next_prediction * 0.85), 2),
                        "max": round(next_prediction * 1.15, 2)
                    },
                    "period": "Gelecek dönem"
                })
            
            # Anomaly detection (simple outlier detection)
            if len(values) >= 4:
                mean_val = statistics.mean(values)
                std_dev = statistics.stdev(values) if len(values) > 1 else 0
                
                for i, value in enumerate(values):
                    if std_dev > 0 and abs(value - mean_val) > 2 * std_dev:
                        insights["anomalies"].append({
                            "metric": row_name,
                            "period": periods[i],
                            "value": value,
                            "expected_range": {
                                "min": round(mean_val - std_dev, 2),
                                "max": round(mean_val + std_dev, 2)
                            },
                            "severity": "high" if abs(value - mean_val) > 3 * std_dev else "medium",
                            "description": f"{row_name} değeri normal aralığın dışında ({value} vs beklenen {round(mean_val, 2)})"
                        })
    
    # Generate smart recommendations
    total_trends = len([t for t in insights["data_trends"] if t["direction"] != "stabil"])
    positive_trends = len([t for t in insights["data_trends"] if t["direction"] == "artış"])
    negative_trends = len([t for t in insights["data_trends"] if t["direction"] == "azalış"])
    
    if positive_trends > negative_trends:
        insights["recommendations"].append("🎯 Genel performans pozitif yönde. Mevcut stratejileri sürdürün.")
        insights["performance_score"] = min(95, 70 + (positive_trends * 5))
    elif negative_trends > positive_trends:
        insights["recommendations"].append("⚠️ Bazı metriklerde düşüş gözleniyor. Aksiyon planı oluşturun.")
        insights["performance_score"] = max(30, 70 - (negative_trends * 8))
    else:
        insights["recommendations"].append("📊 Metrikler stabil durumda. Sürekli iyileştirme fırsatları araştırın.")
        insights["performance_score"] = 65
    
    if len(insights["anomalies"]) > 0:
        insights["recommendations"].append(f"🔍 {len(insights['anomalies'])} adet anormal veri tespit edildi. Detaylı inceleme önerilir.")
    
    if len(responses) >= 6:
        insights["confidence_level"] = "high"
        insights["recommendations"].append("✅ Yeterli veri mevcut. Analiz sonuçları güvenilir.")
    elif len(responses) >= 3:
        insights["confidence_level"] = "medium"
        insights["recommendations"].append("📈 Orta düzey veri mevcut. Daha fazla veri toplayarak analiz kalitesini artırabilirsiniz.")
    else:
        insights["confidence_level"] = "low"
        insights["recommendations"].append("📊 Sınırlı veri mevcut. Güvenilir trend analizi için daha fazla veri gerekli.")
    
    return {
        "question_id": question_id,
        "question_text": question.get("question_text", ""),
        "insights": insights,
        "data_points": len(responses),
        "periods_analyzed": len(period_data),
        "generated_at": datetime.now().isoformat()
    }

@api_router.get("/analytics/compare")
async def get_comparative_analytics(
    question_ids: str = Query(..., description="Comma-separated question IDs to compare"),
    current_user: User = Depends(get_current_user)
):
    """Compare analytics across multiple questions"""
    from datetime import datetime
    import statistics
    
    question_id_list = [qid.strip() for qid in question_ids.split(',') if qid.strip()]
    
    if len(question_id_list) < 2:
        raise HTTPException(status_code=400, detail="At least 2 question IDs required for comparison")
    
    if len(question_id_list) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 questions can be compared at once")
    
    comparison_results = []
    
    for question_id in question_id_list:
        # Get question data
        question = await db.questions.find_one({"id": question_id})
        if not question:
            continue
        
        # Get responses
        responses = await db.table_responses.find({"question_id": question_id}).to_list(1000)
        
        # Calculate basic metrics
        total_responses = len(responses)
        latest_response = max(responses, key=lambda x: f"{x.get('year', 0)}-{x.get('month', 0):02d}") if responses else None
        
        # Calculate trend if we have enough data
        trend_data = {}
        if len(responses) >= 2:
            table_rows = question.get("table_rows", [])
            for row in table_rows:
                values = []
                for response in sorted(responses, key=lambda x: f"{x.get('year', 0)}-{x.get('month', 0):02d}"):
                    value = response.get("table_data", {}).get(row["id"], "0")
                    try:
                        numeric_value = float(value) if value else 0
                        values.append(numeric_value)
                    except (ValueError, TypeError):
                        values.append(0)
                
                if len(values) >= 2:
                    recent_avg = statistics.mean(values[-3:]) if len(values) >= 3 else values[-1]
                    older_avg = statistics.mean(values[:-3]) if len(values) > 3 else values[0]
                    trend_percentage = ((recent_avg - older_avg) / older_avg * 100) if older_avg != 0 else 0
                    
                    trend_data[row["name"]] = {
                        "trend_percentage": round(trend_percentage, 2),
                        "direction": "artış" if trend_percentage > 5 else "azalış" if trend_percentage < -5 else "stabil",
                        "current_value": values[-1] if values else 0,
                        "average_value": round(statistics.mean(values), 2) if values else 0
                    }
        
        comparison_results.append({
            "question_id": question_id,
            "question_text": question.get("question_text", ""),
            "category": question.get("category", ""),
            "period": question.get("period", ""),
            "total_responses": total_responses,
            "latest_period": f"{latest_response.get('year', 0)}-{latest_response.get('month', 0):02d}" if latest_response else None,
            "trend_data": trend_data,
            "data_quality": "high" if total_responses >= 6 else "medium" if total_responses >= 3 else "low"
        })
    
    # Generate comparison insights
    insights = {
        "summary": {
            "questions_compared": len(comparison_results),
            "total_data_points": sum(r["total_responses"] for r in comparison_results),
            "high_quality_questions": len([r for r in comparison_results if r["data_quality"] == "high"]),
            "categories": list(set(r["category"] for r in comparison_results if r["category"]))
        },
        "performance_ranking": [],
        "trend_comparison": {},
        "recommendations": []
    }
    
    # Rank questions by data quality and trend performance
    for result in comparison_results:
        score = 0
        positive_trends = 0
        negative_trends = 0
        
        for metric, trend in result["trend_data"].items():
            if trend["direction"] == "artış":
                positive_trends += 1
                score += 10
            elif trend["direction"] == "azalış":
                negative_trends += 1
                score -= 5
            else:
                score += 2
        
        # Bonus for data quality
        if result["data_quality"] == "high":
            score += 20
        elif result["data_quality"] == "medium":
            score += 10
        
        insights["performance_ranking"].append({
            "question_id": result["question_id"],
            "question_text": result["question_text"],
            "score": score,
            "positive_trends": positive_trends,
            "negative_trends": negative_trends,
            "data_quality": result["data_quality"]
        })
    
    # Sort by performance score
    insights["performance_ranking"].sort(key=lambda x: x["score"], reverse=True)
    
    # Generate recommendations
    best_performer = insights["performance_ranking"][0] if insights["performance_ranking"] else None
    worst_performer = insights["performance_ranking"][-1] if insights["performance_ranking"] else None
    
    if best_performer and worst_performer and len(insights["performance_ranking"]) > 1:
        insights["recommendations"].append(f"🏆 En iyi performans: '{best_performer['question_text'][:50]}...' (Skor: {best_performer['score']})")
        insights["recommendations"].append(f"⚠️ Dikkat gereken: '{worst_performer['question_text'][:50]}...' (Skor: {worst_performer['score']})")
    
    high_quality_count = insights["summary"]["high_quality_questions"]
    total_questions = insights["summary"]["questions_compared"]
    
    if high_quality_count == total_questions:
        insights["recommendations"].append("✅ Tüm sorular yeterli veri kalitesine sahip.")
    elif high_quality_count > total_questions / 2:
        insights["recommendations"].append("📊 Çoğu soru iyi veri kalitesine sahip, bazıları daha fazla veri gerektirebilir.")
    else:
        insights["recommendations"].append("📈 Veri kalitesini artırmak için daha fazla yanıt toplanması önerilir.")
    
    return {
        "comparison_results": comparison_results,
        "insights": insights,
        "generated_at": datetime.now().isoformat()
    }

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    from datetime import datetime, timedelta
    
    # Bu ayın başlangıcı
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1)
    
    # Bu ay yanıtları
    monthly_responses = await db.table_responses.count_documents({
        "created_at": {"$gte": start_of_month}
    })
    
    # Geçen ay yanıtları (karşılaştırma için)
    if now.month == 1:
        last_month_start = datetime(now.year - 1, 12, 1)
        last_month_end = datetime(now.year, 1, 1)
    else:
        last_month_start = datetime(now.year, now.month - 1, 1)
        last_month_end = start_of_month
        
    last_monthly_responses = await db.table_responses.count_documents({
        "created_at": {"$gte": last_month_start, "$lt": last_month_end}
    })
    
    # Yüzde hesaplama
    if last_monthly_responses > 0:
        monthly_trend = round(((monthly_responses - last_monthly_responses) / last_monthly_responses) * 100)
    else:
        monthly_trend = 100 if monthly_responses > 0 else 0
    
    # Toplam kullanıcılar
    total_employees = await db.employees.count_documents({})
    
    # Aktif sorular
    active_questions = await db.questions.count_documents({})
    
    # AI analizleri (table_responses with ai_comment)
    ai_analyses = await db.table_responses.count_documents({
        "$and": [
            {"ai_comment": {"$exists": True}},
            {"ai_comment": {"$ne": None}},
            {"ai_comment": {"$ne": ""}}
        ]
    })
    
    # Tamamlanma oranı hesaplama (bu ay)
    # Toplam beklenilen yanıt = aktif sorular * kullanıcı sayısı
    expected_responses = active_questions * total_employees
    completion_rate = round((monthly_responses / expected_responses * 100)) if expected_responses > 0 else 0
    
    # Bildirimler
    notifications = [
        {"message": f"{expected_responses - monthly_responses} soru yanıt bekliyor", "type": "warning"},
        {"message": f"{ai_analyses} AI analizi hazır", "type": "info"},
        {"message": "Aylık rapor hazırlanıyor", "type": "info"}
    ]
    
    return {
        "monthly_responses": monthly_responses,
        "monthly_trend": monthly_trend,
        "active_users": total_employees,
        "completion_rate": completion_rate,
        "ai_analyses": ai_analyses,
        "active_questions": active_questions,
        "notifications": notifications,
        "last_updated": now.isoformat()
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
async def get_questions_for_sharing(
    period: Optional[str] = Query(None, description="Filter questions by period"),
    current_user: User = Depends(get_current_user)
):
    """Get all questions with employees for sharing interface"""
    # Build filter query
    filter_query = {}
    if period:
        # Validate period value
        valid_periods = ["Günlük", "Haftalık", "Aylık", "Çeyreklik", "Altı Aylık", "Yıllık", "İhtiyaç Halinde"]
        if period in valid_periods:
            filter_query["period"] = period
    
    # Get questions with optional filtering
    questions = await db.questions.find(filter_query).to_list(1000)
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
    resend_count = 0
    
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
        
        # Allow re-sending: Don't skip if already assigned, just log it
        is_resend = bool(existing_assignment)
        if is_resend:
            resend_count += 1
        
        # Get question and employee details
        question = await db.questions.find_one({"id": question_id})
        employee = await db.employees.find_one({"id": employee_id})
        
        if not question or not employee:
            continue
        
        # Create or update assignment  
        if existing_assignment:
            # Update existing assignment for re-send
            assignment_id = existing_assignment["id"]
            assignment_dict = existing_assignment.copy()
            assignment_dict["assigned_at"] = current_date.isoformat()  # Update timestamp
            assignment_dict["email_sent"] = False  # Reset email status
        else:
            # Create new assignment
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
        
        if existing_assignment:
            # Update existing assignment
            await db.question_assignments.update_one(
                {"id": assignment_id},
                {"$set": assignment_dict}
            )
        else:
            # Insert new assignment
            await db.question_assignments.insert_one(assignment_dict)
        
        assignments_created.append(assignment_dict)
    
    # Prepare response message
    message_parts = []
    if assignments_created:
        new_assignments = len(assignments_created) - resend_count
        if new_assignments > 0:
            message_parts.append(f"{new_assignments} yeni soru atandı")
        if resend_count > 0:
            message_parts.append(f"{resend_count} soru tekrar gönderildi")
    
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
            "expected_action": question["expected_action"],
            "period": question["period"],  # ✅ Period bilgisi eklendi
            "table_rows": question.get("table_rows", [])  # ✅ Table rows eklendi
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

@api_router.get("/email-logs")
async def get_email_logs(current_user: User = Depends(get_current_user)):
    """Get demo email logs"""
    assignments = await db.question_assignments.find({"email_sent": True}).sort("assigned_at", -1).to_list(20)
    
    email_logs = []
    for assignment in assignments:
        question = await db.questions.find_one({"id": assignment["question_id"]})
        employee = await db.employees.find_one({"id": assignment["employee_id"]})
        
        if question and employee:
            email_log = {
                "assignment_id": assignment["id"],
                "employee_name": f"{employee['first_name']} {employee['last_name']}",
                "employee_email": employee.get('email', 'E-posta yok'),
                "question_category": question["category"],
                "question_text": question["question_text"],
                "answer_link": f"{frontend_url}/answer/{assignment['id']}",
                "sent_date": assignment["assigned_at"],
                "response_received": assignment.get("response_received", False),
                "year": assignment["year"],
                "month": assignment["month"]
            }
            email_logs.append(email_log)
    
    return email_logs

@api_router.get("/answer-status")
async def get_answer_status(current_user: User = Depends(get_current_user)):
    """Get all question assignments with response status"""
    assignments = await db.question_assignments.find().sort("assigned_at", -1).to_list(1000)
    
    answer_status_list = []
    for assignment in assignments:
        question = await db.questions.find_one({"id": assignment["question_id"]})
        employee = await db.employees.find_one({"id": assignment["employee_id"]})
        
        # Get response if exists
        response = await db.question_responses.find_one({"assignment_id": assignment["id"]})
        
        if question and employee:
            status_item = {
                "assignment_id": assignment["id"],
                "question": {
                    "id": question["id"],
                    "category": question["category"],
                    "question_text": question["question_text"],
                    "importance_reason": question.get("importance_reason", ""),
                    "expected_action": question.get("expected_action", "")
                },
                "employee": {
                    "id": employee["id"],
                    "name": f"{employee['first_name']} {employee['last_name']}",
                    "email": employee.get('email', 'E-posta yok'),
                    "department": employee["department"]
                },
                "assignment_date": assignment["assigned_at"],
                "year": assignment["year"],
                "month": assignment["month"],
                "email_sent": assignment.get("email_sent", False),
                "response_received": assignment.get("response_received", False),
                "response": {
                    "submitted": bool(response),
                    "text": response.get("response_text", "") if response else "",
                    "submitted_at": response.get("submitted_at", "") if response else ""
                }
            }
            answer_status_list.append(status_item)
    
    return answer_status_list

# Table Response Management - Clean System
@api_router.get("/table-responses")
async def get_table_responses(current_user: User = Depends(get_current_user)):
    """Get all table responses with question and employee details"""
    responses = await db.table_responses.find().to_list(1000)
    
    formatted_responses = []
    for response in responses:
        response.pop('_id', None)
        
        question = await db.questions.find_one({"id": response["question_id"]})
        employee = await db.employees.find_one({"id": response["employee_id"]})
        
        if question and employee:
            question.pop('_id', None)
            employee.pop('_id', None)
            
            formatted_response = {
                **response,
                "question": {
                    "id": question["id"],
                    "question_text": question["question_text"],
                    "category": question["category"],
                    "period": question["period"],
                    "table_rows": question.get("table_rows", [])
                },
                "employee": {
                    "id": employee["id"],
                    "name": f"{employee['first_name']} {employee['last_name']}",
                    "department": employee["department"]
                }
            }
            formatted_responses.append(formatted_response)
    
    return formatted_responses

@api_router.get("/table-responses/question/{question_id}")
async def get_responses_by_question(question_id: str, current_user: User = Depends(get_current_user)):
    """Get all table responses for a specific question"""
    responses = await db.table_responses.find({"question_id": question_id}).to_list(1000)
    
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soru bulunamadı"
        )
    
    formatted_responses = []
    for response in responses:
        response.pop('_id', None)
        employee = await db.employees.find_one({"id": response["employee_id"]})
        if employee:
            employee.pop('_id', None)
            formatted_response = {
                **response,
                "employee": {
                    "id": employee["id"],
                    "name": f"{employee['first_name']} {employee['last_name']}",
                    "department": employee["department"]
                }
            }
            formatted_responses.append(formatted_response)
    
    question.pop('_id', None)
    return {
        "question": question,
        "responses": formatted_responses
    }

# Original table response endpoint removed - replaced with new implementation below

@api_router.get("/questions-for-responses") 
async def get_questions_for_responses(current_user: User = Depends(get_current_user)):
    """Get all questions with employee list for response management"""
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

@api_router.post("/table-responses")
async def create_table_response(response_data: TableResponseCreate, current_user: User = Depends(get_current_user)):
    """Create or update a single table response"""
    try:
        # Check if question and employee exist
        question = await db.questions.find_one({"id": response_data.question_id})
        employee = await db.employees.find_one({"id": response_data.employee_id})
        
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Soru bulunamadı"
            )
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Çalışan bulunamadı"
            )
        
        # Check if response already exists
        existing_response = await db.table_responses.find_one({
            "question_id": response_data.question_id,
            "employee_id": response_data.employee_id,
            "year": response_data.year,
            "month": response_data.month
        })
        
        # Generate AI comment
        ai_comment = None
        if response_data.table_data or response_data.monthly_comment:
            ai_comment = await generate_ai_comment(
                question_text=question["question_text"],
                category=question["category"],
                period=question["period"],
                table_data=response_data.table_data,
                table_rows=question.get("table_rows", []),
                monthly_comment=response_data.monthly_comment,
                year=response_data.year,
                month=response_data.month
            )
        
        current_time = datetime.now(timezone.utc)
        
        if existing_response:
            # Update existing response
            update_data = {
                "table_data": response_data.table_data,
                "monthly_comment": response_data.monthly_comment,
                "ai_comment": ai_comment,
                "updated_at": current_time.isoformat()
            }
            
            await db.table_responses.update_one(
                {"id": existing_response["id"]},
                {"$set": update_data}
            )
            
            return {"success": True, "message": "Cevap güncellendi", "action": "updated"}
        
        else:
            # Create new response
            response_dict = response_data.dict()
            response_dict["id"] = str(uuid.uuid4())
            response_dict["ai_comment"] = ai_comment
            response_dict["created_at"] = current_time.isoformat()
            response_dict["updated_at"] = current_time.isoformat()
            
            await db.table_responses.insert_one(response_dict)
            
            return {"success": True, "message": "Cevap kaydedildi", "action": "created"}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cevap kaydetme hatası: {str(e)}"
        )

@api_router.post("/table-responses/bulk")
async def create_bulk_table_responses(responses_data: List[TableResponseCreate], current_user: User = Depends(get_current_user)):
    """Create multiple table responses at once"""
    try:
        results = []
        for response_data in responses_data:
            # Skip empty responses
            has_data = (
                response_data.table_data or 
                (response_data.monthly_comment and response_data.monthly_comment.strip())
            )
            if not has_data:
                continue
            
            question = await db.questions.find_one({"id": response_data.question_id})
            employee = await db.employees.find_one({"id": response_data.employee_id})
            
            if not question or not employee:
                continue
            
            existing_response = await db.table_responses.find_one({
                "question_id": response_data.question_id,
                "employee_id": response_data.employee_id,
                "year": response_data.year,
                "month": response_data.month
            })
            
            # Generate AI comment
            ai_comment = None
            if response_data.table_data or (response_data.monthly_comment and response_data.monthly_comment.strip()):
                ai_comment = await generate_ai_comment(
                    question_text=question["question_text"],
                    category=question["category"],
                    period=question["period"],
                    table_data=response_data.table_data,
                    table_rows=question.get("table_rows", []),
                    monthly_comment=response_data.monthly_comment,
                    year=response_data.year,
                    month=response_data.month
                )
            
            current_time = datetime.now(timezone.utc)
            
            if existing_response:
                update_data = {
                    "table_data": response_data.table_data,
                    "monthly_comment": response_data.monthly_comment,
                    "ai_comment": ai_comment,
                    "updated_at": current_time.isoformat()
                }
                await db.table_responses.update_one(
                    {"id": existing_response["id"]},
                    {"$set": update_data}
                )
                results.append({"id": existing_response["id"], "action": "updated"})
            else:
                response_dict = response_data.dict()
                response_dict["id"] = str(uuid.uuid4())
                response_dict["ai_comment"] = ai_comment
                response_dict["created_at"] = current_time.isoformat()
                response_dict["updated_at"] = current_time.isoformat()
                
                await db.table_responses.insert_one(response_dict)
                results.append({"id": response_dict["id"], "action": "created"})
        
        return {
            "success": True,
            "message": f"{len(results)} cevap başarıyla kaydedildi",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Toplu cevap kaydetme hatası: {str(e)}"
        )

@api_router.get("/table-responses/summary/{question_id}")
async def get_table_summary(question_id: str, current_user: User = Depends(get_current_user)):
    """Get table response summary for a specific question"""
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soru bulunamadı"
        )
    
    responses = await db.table_responses.find({"question_id": question_id}).to_list(1000)
    
    # Group responses by month
    monthly_data = {}
    for month in range(1, 13):
        month_responses = [r for r in responses if r["month"] == month]
        monthly_data[month] = {
            "count": len(month_responses),
            "responses": month_responses
        }
    
    months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
              "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
    
    summary_data = []
    for i, month_name in enumerate(months, 1):
        summary_data.append({
            "month": month_name,
            "month_number": i,
            "response_count": monthly_data[i]["count"],
            "responses": monthly_data[i]["responses"]
        })
    
    question.pop('_id', None)
    
    return {
        "question": question,
        "summary_data": summary_data,
        "total_responses": len(responses)
    }

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