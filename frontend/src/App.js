import React, { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToastProvider } from "@/components/ui/toast";
import { Loader2, User, Lock, Mail, BarChart3, Users, Activity, Plus, Edit, Trash2, Phone, Calendar, DollarSign, FileQuestion, Clock, Target, Settings, ChevronDown, Share, Send, Brain, Bell, ArrowLeft, Building, AlertCircle, Moon, Sun } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={isDark ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchCurrentUser();
      } else {
        setLoading(false);
      }
      setInitialized(true);
    };
    
    initializeAuth();
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Clear token and user on any error
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });
      
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Giriş başarısız' 
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        username,
        email,
        password
      });
      
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Kayıt başarısız' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      loading,
      isAuthenticated: !!token && !!user && initialized
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const AuthPage = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let result;
    if (activeTab === 'login') {
      result = await login(formData.username, formData.password);
    } else {
      if (!formData.email) {
        setError('Email alanı zorunludur');
        setLoading(false);
        return;
      }
      result = await register(formData.username, formData.email, formData.password);
    }

    if (!result.success) {
      setError(result.error);
    } else {
      // Redirect to dashboard on success
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hoş Geldiniz</h1>
          <p className="text-gray-600">Hesabınıza giriş yapın veya yeni hesap oluşturun</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                <TabsTrigger value="login" className="data-[state=active]:bg-white">
                  Giriş Yap
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-white">
                  Kayıt Ol
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-xs sm:text-sm font-medium text-gray-700">
                  Kullanıcı Adı
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="kullanıcı_adınız"
                    data-testid="username-input"
                  />
                </div>
              </div>

              {activeTab === 'register' && (
                <div>
                  <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required={activeTab === 'register'}
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="email@örnek.com"
                      data-testid="email-input"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700">
                  Şifre
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="••••••••"
                    data-testid="password-input"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
                disabled={loading}
                data-testid="auth-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {activeTab === 'login' ? 'Giriş yapılıyor...' : 'Kayıt oluşturuluyor...'}
                  </>
                ) : (
                  activeTab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Answer Status Component
const AnswerStatusComponent = ({ onBack }) => {
  const [answerStatus, setAnswerStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnswerStatus();
  }, []);

  const fetchAnswerStatus = async () => {
    try {
      const response = await axios.get(`${API}/answer-status`);
      setAnswerStatus(response.data);
    } catch (error) {
      console.error('Cevap durumu yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const getStatusBadge = (item) => {
    if (item.response.submitted) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✅ Yanıtlandı
        </span>
      );
    } else if (item.email_sent) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ⏳ Gönderildi, Yanıt Bekleniyor
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          ❌ E-posta Gönderilemedi
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onBack}>
            ← Geri Dön
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Cevap Durumu</h2>
        </div>
      </div>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Soru</TableHead>
                  <TableHead>İlgili Kişi</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead>Atanma Tarihi</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Yanıt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {answerStatus.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Henüz soru ataması yapılmamış
                    </TableCell>
                  </TableRow>
                ) : (
                  answerStatus.map((item) => (
                    <TableRow key={item.assignment_id}>
                      <TableCell className="max-w-xs">
                        <div>
                          <div className="font-medium text-gray-900">{item.question.category}</div>
                          <div className="text-sm text-gray-600 truncate" title={item.question.question_text}>
                            {item.question.question_text.length > 60 
                              ? item.question.question_text.substring(0, 60) + '...'
                              : item.question.question_text
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.month}/{item.year} dönemi
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{item.employee.name}</div>
                          <div className="text-sm text-gray-600">{item.employee.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-900">{item.employee.department}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(item.assignment_date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item)}
                      </TableCell>
                      <TableCell>
                        {item.response.submitted ? (
                          <div className="max-w-xs">
                            <div className="text-sm text-gray-900 truncate" title={item.response.text}>
                              {item.response.text.length > 50 
                                ? item.response.text.substring(0, 50) + '...'
                                : item.response.text
                              }
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(item.response.submitted_at)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Henüz yanıt verilmemiş</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Email Logs Component
const EmailLogsComponent = ({ onBack }) => {
  const [emailLogs, setEmailLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmailLogs();
  }, []);

  const fetchEmailLogs = async () => {
    try {
      const response = await axios.get(`${API}/email-logs`);
      setEmailLogs(response.data);
    } catch (error) {
      console.error('Email logları yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onBack}>
            ← Geri Dön
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gönderilen E-postalar</h2>
        </div>
      </div>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-4">
            {emailLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Henüz e-posta gönderilmemiş
              </div>
            ) : (
              emailLogs.map((log) => (
                <div key={log.assignment_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <span className="font-semibold text-gray-900">{log.employee_name}</span>
                        <span className="text-sm text-gray-500">({log.employee_email})</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Konu:</strong> Dijital Dönüşüm - {log.month}/{log.year} Dönemi Soru Yanıtlama
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Kategori:</strong> {log.question_category}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Soru:</strong> {log.question_text}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-sm text-gray-500">
                        {formatDate(log.sent_date)}
                      </div>
                      <div className={`text-xs sm:text-sm font-medium ${log.response_received ? 'text-green-600' : 'text-orange-600'}`}>
                        {log.response_received ? '✅ Yanıtlandı' : '⏳ Bekliyor'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Yanıt Linki:</span>
                      <a 
                        href={log.answer_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Soruyu Yanıtla →
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Share Questions Management
const ShareQuestionsManagement = ({ onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]); // Store all questions for filtering
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(''); // Filter state

  useEffect(() => {
    fetchQuestionsAndEmployees();
  }, []);

  const fetchQuestionsAndEmployees = async () => {
    try {
      const response = await axios.get(`${API}/questions-share-list`);
      setQuestions(response.data.questions);
      setAllQuestions(response.data.questions); // Store all questions
      setEmployees(response.data.employees);
      
      // Initialize assignments array
      const initialAssignments = response.data.questions.map(question => ({
        question_id: question.id,
        employee_id: '',
        department: '',
        employee_email: ''
      }));
      setAssignments(initialAssignments);
      
    } catch (error) {
      console.error('Veri yüklenemedi:', error);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Filter questions by period
  const filterQuestionsByPeriod = async (period) => {
    setSelectedPeriod(period);
    setLoading(true);
    
    try {
      // Call backend with period filter
      const url = period ? `${API}/questions-share-list?period=${encodeURIComponent(period)}` : `${API}/questions-share-list`;
      const response = await axios.get(url);
      
      setQuestions(response.data.questions);
      // Keep all questions for count display
      if (period === '') {
        setAllQuestions(response.data.questions);
      }
      
      // Update assignments array based on filtered questions
      const newAssignments = response.data.questions.map(question => {
        // Keep existing assignments if they exist
        const existingAssignment = assignments.find(a => a.question_id === question.id);
        return existingAssignment || {
          question_id: question.id,
          employee_id: '',
          department: '',
          employee_email: ''
        };
      });
      setAssignments(newAssignments);
      
    } catch (error) {
      console.error('Filtering error:', error);
      setError('Filtreleme sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (questionIndex, employeeId) => {
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    
    setAssignments(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        employee_id: employeeId,
        department: selectedEmployee ? selectedEmployee.department : '',
        employee_email: selectedEmployee ? selectedEmployee.email : ''
      };
      return updated;
    });
  };

  const handleShareQuestions = async () => {
    // Filter out assignments without selected employees
    const validAssignments = assignments.filter(assignment => assignment.employee_id);
    
    if (validAssignments.length === 0) {
      setError('Lütfen en az bir soru için çalışan seçin');
      return;
    }

    setSharing(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API}/questions-share`, {
        assignments: validAssignments.map(a => ({
          question_id: a.question_id,
          employee_id: a.employee_id
        }))
      });
      
      setSuccess(response.data.message);
      
    } catch (error) {
      setError(error.response?.data?.detail || 'Paylaşım sırasında hata oluştu');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onBack}>
            ← Geri Dön
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Soruları Paylaş</h2>
        </div>
      </div>

      {/* Period Filter Buttons */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center space-x-1 sm:space-x-2 mb-2">
            <span className="text-sm font-semibold text-gray-700">Periyod Filtresi:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPeriod === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => filterQuestionsByPeriod('')}
              className={selectedPeriod === '' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              Tümü ({allQuestions.length})
            </Button>
            {['Günlük', 'Haftalık', 'Aylık', 'Çeyreklik', 'Altı Aylık', 'Yıllık', 'İhtiyaç Halinde'].map((period) => {
              return (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => filterQuestionsByPeriod(period)}
                  className={selectedPeriod === period ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {period}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-600">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Questions Assignment Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Soru Metni</TableHead>
                  <TableHead className="w-20">Periyod</TableHead>
                  <TableHead>İlgili Kişi</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead>E-posta Adresi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {selectedPeriod ? `${selectedPeriod} periyoduna ait soru bulunmuyor` : 'Henüz soru bulunmuyor'}
                    </TableCell>
                  </TableRow>
                ) : (
                  questions.map((question, index) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-xs">
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            {question.category}
                          </p>
                          <p className="text-sm text-gray-600 truncate" title={question.question_text}>
                            {question.question_text.length > 80 
                              ? question.question_text.substring(0, 80) + '...'
                              : question.question_text
                            }
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {question.period}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select 
                          onValueChange={(value) => handleEmployeeChange(index, value)}
                          value={assignments[index]?.employee_id || ''}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Çalışan seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.first_name} {employee.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {assignments[index]?.department || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {assignments[index]?.employee_email || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {questions.length > 0 && (
            <div className="flex justify-end mt-6">
              <Button 
                onClick={handleShareQuestions}
                disabled={sharing}
                className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
                data-testid="bulk-share-button"
              >
                {sharing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Paylaşılıyor...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Toplu Gönder
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Responses Component for Cevaplar Feature
const ResponsesComponent = ({ onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'form', 'chart'
  const [responses, setResponses] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [formData, setFormData] = useState({
    year: 2025,
    month: new Date().getMonth() + 1,
    numerical_value: '',
    data_values: {},
    employee_comment: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchQuestionsAndEmployees();
  }, []);

  const fetchQuestionsAndEmployees = async () => {
    try {
      const response = await axios.get(`${API}/questions-for-responses`);
      setQuestions(response.data.questions);
      setEmployees(response.data.employees);
    } catch (error) {
      console.error('Veri yüklenemedi:', error);
      setError('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchResponsesByQuestion = async (questionId) => {
    try {
      const response = await axios.get(`${API}/monthly-responses/question/${questionId}`);
      setResponses(response.data.responses);
      return response.data.responses;
    } catch (error) {
      console.error('Cevaplar yüklenemedi:', error);
      setError('Cevaplar yüklenirken hata oluştu');
      return [];
    }
  };

  const fetchChartData = async (questionId) => {
    try {
      const response = await axios.get(`${API}/monthly-responses/chart-data/${questionId}`);
      setChartData(response.data);
    } catch (error) {
      console.error('Grafik verileri yüklenemedi:', error);
      setError('Grafik verileri yüklenirken hata oluştu');
    }
  };

  const handleQuestionSelect = async (question) => {
    setSelectedQuestion(question);
    setCurrentView('form');
    await fetchResponsesByQuestion(question.id);
    await fetchChartData(question.id);
  };

  const handleSubmitResponse = async () => {
    if (!selectedQuestion || !selectedEmployee) {
      setError('Lütfen soru ve çalışan seçin');
      return;
    }

    // Validate based on response type
    const responseType = selectedQuestion.response_type || 'Her İkisi';
    const hasDataFields = selectedQuestion.data_fields && selectedQuestion.data_fields.length > 0;
    const hasDataValues = Object.values(formData.data_values).some(val => val && val.toString().trim());
    
    if (responseType === 'Sadece Sayısal') {
      if (hasDataFields && !hasDataValues) {
        setError('Bu soru için veri alanlarını doldurmanız gerekiyor');
        return;
      } else if (!hasDataFields && !formData.numerical_value) {
        setError('Bu soru için sayısal değer girmeniz gerekiyor');
        return;
      }
    } else if (responseType === 'Sadece Sözel' && !formData.employee_comment.trim()) {
      setError('Bu soru için yorum yazmanız gerekiyor');
      return;
    } else if (responseType === 'Her İkisi') {
      const hasNumericalData = hasDataFields ? hasDataValues : formData.numerical_value;
      if (!hasNumericalData && !formData.employee_comment.trim()) {
        setError('Lütfen sayısal değer veya yorum girin');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/monthly-responses`, {
        question_id: selectedQuestion.id,
        employee_id: selectedEmployee.id,
        year: formData.year,
        month: formData.month,
        numerical_value: formData.numerical_value ? parseFloat(formData.numerical_value) : null,
        data_values: formData.data_values || {},
        employee_comment: formData.employee_comment.trim() || null
      });

      setSuccess('Cevap başarıyla kaydedildi ve AI yorumu oluşturuldu');
      setFormData({
        year: 2025,
        month: new Date().getMonth() + 1,
        numerical_value: '',
        data_values: {},
        employee_comment: ''
      });
      
      // Refresh data
      await fetchResponsesByQuestion(selectedQuestion.id);
      await fetchChartData(selectedQuestion.id);
      
    } catch (error) {
      setError(error.response?.data?.detail || 'Cevap kaydedilirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const renderChart = () => {
    if (!chartData || !chartData.chart_data) return null;

    const { BarChart, LineChart, PieChart, AreaChart, Bar, Line, Pie, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } = require('recharts');
    
    const chartType = chartData.chart_type;
    const data = chartData.chart_data;
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

    switch (chartType) {
      case 'sütun':
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'çizgi':
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'alan':
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'pasta':
      case 'pie':
        const pieData = data.filter(d => d.value > 0).map((d, index) => ({
          name: d.month,
          value: d.value,
          color: colors[index % colors.length]
        }));
        
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (currentView === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Cevaplar</h2>
            <p className="text-gray-600">Sorulara sayısal değer ve yorum ekleyin, AI analizini görün</p>
          </div>
          <Button 
            onClick={onBack}
            variant="outline"
            className="hover:bg-gray-50"
          >
            Geri Dön
          </Button>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {questions.map((question) => (
            <Card 
              key={question.id}
              className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => handleQuestionSelect(question)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-1 sm:space-x-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {question.category}
                      </span>
                      {question.chart_type && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {question.chart_type}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        question.response_type === 'Sadece Sayısal' ? 'bg-yellow-100 text-yellow-800' :
                        question.response_type === 'Sadece Sözel' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {question.response_type || 'Her İkisi'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {question.question_text}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {question.importance_reason}
                    </p>
                  </div>
                  <div className="ml-4">
                    <BarChart3 className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (currentView === 'form' && selectedQuestion) {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Cevap Girişi</h2>
            <p className="text-gray-600">{selectedQuestion.category}</p>
          </div>
          <div className="flex space-x-1 sm:space-x-2">
            <Button 
              onClick={() => setCurrentView('chart')}
              variant="outline"
              className="hover:bg-blue-50"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Grafik
            </Button>
            <Button 
              onClick={() => setCurrentView('list')}
              variant="outline"
              className="hover:bg-gray-50"
            >
              Geri Dön
            </Button>
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">{selectedQuestion.question_text}</h3>
            
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-600">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="employee">Çalışan Seçin</Label>
                  <Select onValueChange={(value) => {
                    const employee = employees.find(emp => emp.id === value);
                    setSelectedEmployee(employee);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Çalışan seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.first_name} {employee.last_name} - {employee.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="month">Ay</Label>
                  <Select 
                    value={formData.month.toString()} 
                    onValueChange={(value) => setFormData({...formData, month: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month} {formData.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional fields based on response type */}
                {(selectedQuestion.response_type === 'Sadece Sayısal' || selectedQuestion.response_type === 'Her İkisi') && (
                  <div className="space-y-4">
                    {/* Çoklu veri alanları varsa onları göster */}
                    {selectedQuestion.data_fields && selectedQuestion.data_fields.length > 0 ? (
                      <div>
                        <Label className="text-xs sm:text-sm font-medium mb-3 block">Veri Alanları</Label>
                        <div className="space-y-3">
                          {selectedQuestion.data_fields.map((field) => (
                            <div key={field.id}>
                              <Label htmlFor={`field_${field.id}`}>
                                {field.name} {field.unit && `(${field.unit})`}
                              </Label>
                              <Input
                                id={`field_${field.id}`}
                                type="number"
                                step="any"
                                value={formData.data_values[field.id] || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  data_values: {
                                    ...formData.data_values,
                                    [field.id]: e.target.value
                                  }
                                })}
                                placeholder={`${field.name} değerini girin`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Çoklu veri alanları yoksa tek sayısal alan
                      <div>
                        <Label htmlFor="numerical_value">Sayısal Değer</Label>
                        <Input
                          id="numerical_value"
                          type="number"
                          step="any"
                          value={formData.numerical_value}
                          onChange={(e) => setFormData({...formData, numerical_value: e.target.value})}
                          placeholder="Herhangi bir sayısal değer (milyon, yüzde, adet vb.)"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Milyonlar, yüzdeler, adetler vb. herhangi bir sayısal değer girilebilir
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Conditional comment field */}
              {(selectedQuestion.response_type === 'Sadece Sözel' || selectedQuestion.response_type === 'Her İkisi') && (
                <div>
                  <Label htmlFor="employee_comment">Çalışan Yorumu</Label>
                  <Textarea
                    id="employee_comment"
                    value={formData.employee_comment}
                    onChange={(e) => setFormData({...formData, employee_comment: e.target.value})}
                    placeholder="Yorumunuzu buraya yazın..."
                    rows={6}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button 
                onClick={handleSubmitResponse}
                disabled={submitting}
                className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Cevabı Kaydet'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Display Monthly Responses */}
        {responses.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">2025 Yılı Aylık Cevaplar</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ay</TableHead>
                      <TableHead>Çalışan</TableHead>
                      <TableHead>Sayısal Değer</TableHead>
                      <TableHead>Çalışan Yorumu</TableHead>
                      <TableHead>AI Yorumu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell>{months[response.month - 1]}</TableCell>
                        <TableCell>{response.employee?.name}</TableCell>
                        <TableCell>
                          {/* Çoklu veri alanları varsa onları göster */}
                          {response.data_values && Object.keys(response.data_values).length > 0 ? (
                            <div className="space-y-1">
                              {Object.entries(response.data_values).map(([fieldId, value]) => {
                                const field = selectedQuestion.data_fields?.find(f => f.id === fieldId);
                                const unit = field?.unit ? ` ${field.unit}` : '';
                                const name = field?.name || fieldId;
                                return (
                                  <div key={fieldId} className="text-xs">
                                    <span className="font-medium">{name}:</span> {value}{unit}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            // Legacy tek sayısal değer
                            response.numerical_value || '-'
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={response.employee_comment}>
                            {response.employee_comment || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={response.ai_comment}>
                            {response.ai_comment || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (currentView === 'chart' && selectedQuestion && chartData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Grafik Görünümü</h2>
            <p className="text-gray-600">{selectedQuestion.category} - {selectedQuestion.question_text}</p>
          </div>
          <Button 
            onClick={() => setCurrentView('form')}
            variant="outline"
            className="hover:bg-gray-50"
          >
            Geri Dön
          </Button>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              2025 Yılı Aylık Ortalama Değerler - {chartData.chart_type || 'Sütun'} Grafik
            </h3>
            {renderChart()}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

// Program Constants Management
const ProgramConstantsManagement = ({ onBack, type }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  const isCategory = type === 'category';
  const endpoint = isCategory ? 'categories' : 'departments';
  const title = isCategory ? 'Soru Kategorisi Yönetimi' : 'Departman Yönetimi';
  const itemName = isCategory ? 'Kategori' : 'Departman';

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/${endpoint}`);
      setItems(response.data);
    } catch (error) {
      console.error(`${itemName} verileri yüklenemedi:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      await axios.post(`${API}/${endpoint}`, { name: newItemName });
      await fetchItems();
      setShowAddModal(false);
      setNewItemName('');
    } catch (error) {
      setError(error.response?.data?.detail || 'İşlem başarısız');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm(`Bu ${itemName.toLowerCase()}yı silmek istediğinizden emin misiniz?`)) return;

    try {
      await axios.delete(`${API}/${endpoint}/${itemId}`);
      await fetchItems();
    } catch (error) {
      console.error('Silme işlemi başarısız:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onBack}>
            ← Geri Dön
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
              onClick={() => { setNewItemName(''); setError(''); }}
              data-testid={`add-${type}-button`}
            >
              <Plus className="w-4 h-4 mr-2" />
              {itemName} Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni {itemName} Ekle</DialogTitle>
              <DialogDescription>
                {itemName} adını girin.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{itemName} Adı</Label>
                <Input
                  id="name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  placeholder={`${itemName} adı girin`}
                  data-testid={`${type}-name-input`}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={formLoading}
                  className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
                  data-testid={`save-${type}-button`}
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    'Kaydet'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Items Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{itemName} Adı</TableHead>
                  <TableHead>Oluşturma Tarihi</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      Henüz {itemName.toLowerCase()} eklenmemiş
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="hover:bg-red-50 hover:border-red-200"
                          data-testid={`delete-${type}-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Question Bank Management Component
const QuestionBankManagement = ({ onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    question_text: '',
    importance_reason: '',
    expected_action: '',
    period: '',
    chart_type: '',
    table_rows: []
  });
  const [categories, setCategories] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuestions();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API}/questions`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Soru verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const resetForm = () => {
    setFormData({
      category: '',
      question_text: '',
      importance_reason: '',
      expected_action: '',
      period: '',
      chart_type: '',
      table_rows: []
    });
    setError('');
    setEditingQuestion(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const dataToSend = {
        ...formData,
        chart_type: formData.chart_type || null
      };

      if (editingQuestion) {
        await axios.put(`${API}/questions/${editingQuestion.id}`, dataToSend);
      } else {
        await axios.post(`${API}/questions`, dataToSend);
      }

      await fetchQuestions();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      setError(error.response?.data?.detail || 'İşlem başarısız');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      category: question.category,
      question_text: question.question_text,
      importance_reason: question.importance_reason,
      expected_action: question.expected_action,
      period: question.period,
      chart_type: question.chart_type || '',
      table_rows: question.table_rows || []
    });
    setShowAddModal(true);
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return;

    try {
      await axios.delete(`${API}/questions/${questionId}`);
      await fetchQuestions();
    } catch (error) {
      console.error('Silme işlemi başarısız:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onBack}>
            ← Geri Dön
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Soru Ekle Yönetimi</h2>
        </div>
        
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
              onClick={() => resetForm()}
              data-testid="add-question-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Soru Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? 'Soru Düzenle' : 'Yeni Soru Ekle'}
              </DialogTitle>
              <DialogDescription>
                Soru bankası için standardize edilmiş soru bilgilerini doldurun.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Kategori</Label>
                  <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="period">Periyot</Label>
                  <Select onValueChange={(value) => handleSelectChange('period', value)} value={formData.period}>
                    <SelectTrigger data-testid="period-select">
                      <SelectValue placeholder="Sıklık seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Günlük">Günlük</SelectItem>
                      <SelectItem value="Haftalık">Haftalık</SelectItem>
                      <SelectItem value="Aylık">Aylık</SelectItem>
                      <SelectItem value="Çeyreklik">Çeyreklik</SelectItem>
                      <SelectItem value="Altı Aylık">Altı Aylık</SelectItem>
                      <SelectItem value="Yıllık">Yıllık</SelectItem>
                      <SelectItem value="İhtiyaç Halinde">İhtiyaç Halinde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="question_text">Soru Metni</Label>
                <Textarea
                  id="question_text"
                  name="question_text"
                  value={formData.question_text}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  placeholder="Kullanıcıya yöneltilecek temel soru..."
                  data-testid="question-text-input"
                />
              </div>

              <div>
                <Label htmlFor="importance_reason">Önemi / Gerekçe</Label>
                <Textarea
                  id="importance_reason"
                  name="importance_reason"
                  value={formData.importance_reason}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  placeholder="Bu sorunun neden sorulduğu, işletme açısından taşıdığı kritik değer..."
                  data-testid="importance-input"
                />
              </div>

              <div>
                <Label htmlFor="expected_action">Beklenen Aksiyon</Label>
                <Textarea
                  id="expected_action"
                  name="expected_action"
                  value={formData.expected_action}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  placeholder="Sorunun yanıtına göre alınması planlanan karar veya yapılacak işlem..."
                  data-testid="action-input"
                />
              </div>

              <div>
                <Label htmlFor="chart_type">Grafik Tipi (Opsiyonel)</Label>
                <Select onValueChange={(value) => handleSelectChange('chart_type', value)} value={formData.chart_type}>
                  <SelectTrigger data-testid="chart-type-select">
                    <SelectValue placeholder="Grafik tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sütun">Sütun Grafiği</SelectItem>
                    <SelectItem value="Pasta">Pasta Grafiği</SelectItem>
                    <SelectItem value="Çizgi">Çizgi Grafiği</SelectItem>
                    <SelectItem value="Alan">Alan Grafiği</SelectItem>
                    <SelectItem value="Bar">Bar Grafiği</SelectItem>
                    <SelectItem value="Trend">Trend Çizgisi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tablo Satırları - Temiz Sistem */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm font-medium">Tablo Satırları (2-10 satır)</Label>
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newRow = {
                        id: Date.now().toString(),
                        name: '',
                        unit: '',
                        order: formData.table_rows.length
                      };
                      setFormData({
                        ...formData,
                        table_rows: [...formData.table_rows, newRow]
                      });
                    }}
                    disabled={formData.table_rows.length >= 10}
                  >
                    + Satır Ekle
                  </Button>
                </div>
                
                {formData.table_rows.map((row, index) => (
                  <div key={row.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium">Satır {index + 1}</span>
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            table_rows: formData.table_rows.filter(r => r.id !== row.id)
                          });
                        }}
                      >
                        Sil
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Satır Adı</Label>
                        <Input
                          value={row.name}
                          onChange={(e) => {
                            const updatedRows = formData.table_rows.map(r => 
                              r.id === row.id ? {...r, name: e.target.value} : r
                            );
                            setFormData({...formData, table_rows: updatedRows});
                          }}
                          placeholder="örn: Satış, Pazarlama, İK"
                        />
                      </div>
                      
                      <div>
                        <Label>Birim</Label>
                        <Input
                          value={row.unit}
                          onChange={(e) => {
                            const updatedRows = formData.table_rows.map(r => 
                              r.id === row.id ? {...r, unit: e.target.value} : r
                            );
                            setFormData({...formData, table_rows: updatedRows});
                          }}
                          placeholder="örn: adet, TL, %, kişi"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {formData.table_rows.length === 0 && (
                  <div className="text-center py-4 text-gray-500 border-2 border-dashed rounded-lg">
                    Tablo satırlarını eklemek için "Satır Ekle" butonuna tıklayın
                    <br />
                    <span className="text-xs">Örnek: "Satış (adet)", "Pazarlama (TL)", "İK (kişi)"</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={formLoading}
                  className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
                  data-testid="save-question-button"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    editingQuestion ? 'Güncelle' : 'Kaydet'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Questions Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Soru Metni</TableHead>
                  <TableHead>Periyot</TableHead>
                  <TableHead>Grafik Tipi</TableHead>
                  <TableHead>Tablo Satırları</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Henüz soru eklenmemiş
                    </TableCell>
                  </TableRow>
                ) : (
                  questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">
                        {question.category}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={question.question_text}>
                          {question.question_text.length > 50 
                            ? question.question_text.substring(0, 50) + '...'
                            : question.question_text
                          }
                        </div>
                      </TableCell>
                      <TableCell>{question.period}</TableCell>
                      <TableCell>{question.chart_type || 'Belirlenmemiş'}</TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-600">
                          {question.table_rows?.length || 0} satır
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1 sm:space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(question)}
                            data-testid={`edit-question-${question.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(question.id)}
                            className="hover:bg-red-50 hover:border-red-200"
                            data-testid={`delete-question-${question.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Employee Management Component
const EmployeeManagement = ({ onBack }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    department: '',
    age: '',
    gender: '',
    hire_date: '',
    birth_date: '',
    salary: ''
  });
  const [departments, setDepartments] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error('Departmanlar yüklenemedi:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Çalışan verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      department: '',
      age: '',
      gender: '',
      hire_date: '',
      birth_date: '',
      salary: ''
    });
    setError('');
    setEditingEmployee(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const dataToSend = {
        ...formData,
        age: parseInt(formData.age),
        salary: parseFloat(formData.salary)
      };

      if (editingEmployee) {
        await axios.put(`${API}/employees/${editingEmployee.id}`, dataToSend);
      } else {
        await axios.post(`${API}/employees`, dataToSend);
      }

      await fetchEmployees();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      setError(error.response?.data?.detail || 'İşlem başarısız');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone: employee.phone,
      email: employee.email,
      department: employee.department,
      age: employee.age.toString(),
      gender: employee.gender,
      hire_date: employee.hire_date,
      birth_date: employee.birth_date,
      salary: employee.salary.toString()
    });
    setShowAddModal(true);
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm('Bu çalışanı silmek istediğinizden emin misiniz?')) return;

    try {
      await axios.delete(`${API}/employees/${employeeId}`);
      await fetchEmployees();
    } catch (error) {
      console.error('Silme işlemi başarısız:', error);
    }
  };

  const formatSalary = (salary) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(salary);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onBack}>
            ← Geri Dön
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Personel Yönetimi</h2>
        </div>
        
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
              onClick={() => resetForm()}
              data-testid="add-employee-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Kişi Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}
              </DialogTitle>
              <DialogDescription>
                Çalışan bilgilerini doldurun ve kaydedin.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Ad</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                    data-testid="first-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Soyad</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                    data-testid="last-name-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefon Numarası</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="05XX XXX XX XX"
                    data-testid="phone-input"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-posta Adresi</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="email@example.com"
                    data-testid="email-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="department">Departman</Label>
                <Select onValueChange={(value) => handleSelectChange('department', value)} value={formData.department}>
                  <SelectTrigger data-testid="department-select">
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.name}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Yaş</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="16"
                    max="100"
                    value={formData.age}
                    onChange={handleInputChange}
                    required
                    data-testid="age-input"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Cinsiyet</Label>
                  <Select onValueChange={(value) => handleSelectChange('gender', value)} value={formData.gender}>
                    <SelectTrigger data-testid="gender-select">
                      <SelectValue placeholder="Cinsiyet seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Erkek">Erkek</SelectItem>
                      <SelectItem value="Kadın">Kadın</SelectItem>
                      <SelectItem value="Diğer">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birth_date">Doğum Tarihi</Label>
                  <Input
                    id="birth_date"
                    name="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={handleInputChange}
                    required
                    data-testid="birth-date-input"
                  />
                </div>
                <div>
                  <Label htmlFor="hire_date">İşe Giriş Tarihi</Label>
                  <Input
                    id="hire_date"
                    name="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={handleInputChange}
                    required
                    data-testid="hire-date-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="salary">Maaş (TL)</Label>
                <Input
                  id="salary"
                  name="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salary}
                  onChange={handleInputChange}
                  required
                  placeholder="0.00"
                  data-testid="salary-input"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={formLoading}
                  className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
                  data-testid="save-employee-button"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    editingEmployee ? 'Güncelle' : 'Kaydet'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employee Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead>Yaş</TableHead>
                  <TableHead>Cinsiyet</TableHead>
                  <TableHead>İşe Giriş</TableHead>
                  <TableHead>Doğum Tarihi</TableHead>
                  <TableHead>Maaş</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      Henüz çalışan eklenmemiş
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.age}</TableCell>
                      <TableCell>{employee.gender}</TableCell>
                      <TableCell>{formatDate(employee.hire_date)}</TableCell>
                      <TableCell>{formatDate(employee.birth_date)}</TableCell>
                      <TableCell>{formatSalary(employee.salary)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1 sm:space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            data-testid={`edit-employee-${employee.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(employee.id)}
                            className="hover:bg-red-50 hover:border-red-200"
                            data-testid={`delete-employee-${employee.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [constantsType, setConstantsType] = useState(''); // 'category' or 'department'

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Dashboard verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (currentView === 'status') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dijital Dönüşüm</h1>
                  <p className="text-sm text-gray-600">Cevap durumu takibi</p>
                </div>
              </div>
              <Button 
                onClick={logout}
                variant="outline"
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                data-testid="logout-button"
              >
                Çıkış Yap
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnswerStatusComponent onBack={() => setCurrentView('dashboard')} />
        </main>
      </div>
    );
  }

  if (currentView === 'emails') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dijital Dönüşüm</h1>
                  <p className="text-sm text-gray-600">E-posta logları</p>
                </div>
              </div>
              <Button 
                onClick={logout}
                variant="outline"
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                data-testid="logout-button"
              >
                Çıkış Yap
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmailLogsComponent onBack={() => setCurrentView('dashboard')} />
        </main>
      </div>
    );
  }

  if (currentView === 'share') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Share className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dijital Dönüşüm</h1>
                  <p className="text-sm text-gray-600">Soru paylaşımı</p>
                </div>
              </div>
              <Button 
                onClick={logout}
                variant="outline"
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                data-testid="logout-button"
              >
                Çıkış Yap
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ShareQuestionsManagement onBack={() => setCurrentView('dashboard')} />
        </main>
      </div>
    );
  }

  if (currentView === 'demo') {
    return <DemoQuestionResponse />;
  }

  if (currentView === 'analysis') {
    return <DataAnalysisPage />;
  }

  if (currentView === 'responses') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dijital Dönüşüm</h1>
                  <p className="text-sm text-gray-600">Cevaplar ve AI Analizi</p>
                </div>
              </div>
              <Button 
                onClick={logout}
                variant="outline"
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                data-testid="logout-button"
              >
                Çıkış Yap
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ResponsesComponent onBack={() => setCurrentView('dashboard')} />
        </main>
      </div>
    );
  }

  if (currentView === 'constants') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dijital Dönüşüm</h1>
                  <p className="text-sm text-gray-600">Program sabitleri yönetimi</p>
                </div>
              </div>
              <Button 
                onClick={logout}
                variant="outline"
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                data-testid="logout-button"
              >
                Çıkış Yap
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProgramConstantsManagement 
            onBack={() => setCurrentView('dashboard')} 
            type={constantsType}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'questions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <FileQuestion className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dijital Dönüşüm</h1>
                  <p className="text-sm text-gray-600">Soru ekleme sistemi</p>
                </div>
              </div>
              <Button 
                onClick={logout}
                variant="outline"
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                data-testid="logout-button"
              >
                Çıkış Yap
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <QuestionBankManagement onBack={() => setCurrentView('dashboard')} />
        </main>
      </div>
    );
  }

  if (currentView === 'employees') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dijital Dönüşüm</h1>
                  <p className="text-sm text-gray-600">Çalışan bilgilerini yönetin</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
                  onClick={() => setCurrentView('employees')}
                  data-testid="manage-employees-button"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Kişi Ekle
                </Button>
                <Button 
                  onClick={logout}
                  variant="outline"
                  className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                  data-testid="logout-button"
                >
                  Çıkış Yap
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmployeeManagement onBack={() => setCurrentView('dashboard')} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50" data-testid="dashboard">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {/* Logo Area */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dijital Dönüşüm</h1>
                  <p className="text-xs text-gray-500">Performans Yönetim Sistemi</p>
                </div>
              </div>
              
              {/* Breadcrumb */}
              <div className="hidden md:flex items-center space-x-1 sm:space-x-2 text-sm text-gray-500">
                <span>Dashboard</span>
              </div>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors"
                title={isDark ? 'Light Mode' : 'Dark Mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </Button>
              
              {/* Bildirimler */}
              <div className="relative cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors group">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                  {stats?.notifications?.length || 3}
                </span>
                
                {/* Notification Dropdown */}
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">🔔 Bildirimler</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sistem durumu ve güncellemeler</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {stats?.notifications?.map((notification, index) => (
                      <div key={index} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'warning' ? 'bg-amber-500' :
                            notification.type === 'info' ? 'bg-blue-500' : 'bg-green-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{notification.message}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <>
                        <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 dark:text-gray-300">Sistem çalışıyor</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Az önce</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 dark:text-gray-300">Dashboard güncellendi</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 dk önce</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 dark:text-gray-300">Yeni veriler mevcut</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">5 dk önce</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 text-center">
                    <button className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                      Tüm bildirimleri gör →
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Kullanıcı Profili */}
              <div className="flex items-center space-x-3 border-l border-gray-200 dark:border-gray-700 pl-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Admin</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sistem Yöneticisi</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <Button 
                onClick={logout}
                variant="outline"
                size="sm"
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400"
                data-testid="logout-button"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* KPI İstatistik Kartları */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 px-2 sm:px-0">📊 Sistem Durumu</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 px-2 sm:px-0">
            
            {/* Bu Ay Yanıtları */}
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs sm:text-sm font-medium">Bu Ay Yanıtları</p>
                    <div className="flex items-baseline space-x-1 sm:space-x-2">
                      <p className="text-xl sm:text-2xl font-bold">{stats?.monthly_responses || 0}</p>
                      <span className={`text-xs px-1 sm:px-1.5 py-0.5 rounded-full ${
                        (stats?.monthly_trend || 0) >= 0 
                          ? 'bg-blue-400' 
                          : 'bg-red-400'
                      }`}>
                        {stats?.monthly_trend >= 0 ? '+' : ''}{stats?.monthly_trend || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-400 rounded-lg flex items-center justify-center">
                    <FileQuestion className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aktif Kullanıcılar */}
            <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-xs sm:text-sm font-medium">Aktif Kullanıcılar</p>
                    <div className="flex items-baseline space-x-1 sm:space-x-2">
                      <p className="text-xl sm:text-2xl font-bold">{stats?.active_users || 0}</p>
                      <span className="text-xs bg-emerald-400 px-1 sm:px-1.5 py-0.5 rounded-full">Online</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-400 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tamamlanma Oranı */}
            <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-xs sm:text-sm font-medium">Tamamlanma Oranı</p>
                    <div className="flex items-baseline space-x-1 sm:space-x-2">
                      <p className="text-xl sm:text-2xl font-bold">{stats?.completion_rate || 0}%</p>
                      <span className="text-xs bg-amber-400 px-1 sm:px-1.5 py-0.5 rounded-full">Hedef</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-400 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Analizleri */}
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs sm:text-sm font-medium">AI Analizleri</p>
                    <div className="flex items-baseline space-x-1 sm:space-x-2">
                      <p className="text-xl sm:text-2xl font-bold">{stats?.ai_analyses || 0}</p>
                      <span className="text-xs bg-purple-400 px-1 sm:px-1.5 py-0.5 rounded-full">Hazır</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-400 rounded-lg flex items-center justify-center">
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Hızlı Bilgiler Çubuğu - Mobile Friendly */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 sm:p-4 mb-6 mx-2 sm:mx-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm gap-4 sm:gap-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
                {stats?.notifications?.map((notification, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      notification.type === 'warning' ? 'bg-amber-500' :
                      notification.type === 'info' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                    <span className="text-gray-600 text-xs sm:text-sm">{notification.message}</span>
                  </div>
                )) || (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600 text-xs sm:text-sm">Sistem hazır</span>
                    </div>
                  </>
                )}
              </div>
              <div className="text-gray-500 text-xs sm:text-sm">
                Son güncelleme: {stats?.last_updated ? 
                  new Date(stats.last_updated).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) :
                  new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                }
              </div>
            </div>
          </div>

          {/* Mini Trendler */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📈 Haftalık Trendler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mini Yanıt Trendi */}
              <Card className="bg-white/70 border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Yanıt Trendi (7 Gün)</span>
                  <span className="text-xs text-green-600">+{stats?.monthly_trend || 0}%</span>
                </div>
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { day: 'Pzt', responses: 2 },
                      { day: 'Sal', responses: 5 },
                      { day: 'Çar', responses: 3 },
                      { day: 'Per', responses: 8 },
                      { day: 'Cum', responses: 6 },
                      { day: 'Cmt', responses: 4 },
                      { day: 'Paz', responses: 7 }
                    ]}>
                      <Area 
                        type="monotone" 
                        dataKey="responses" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Mini Kullanıcı Aktivitesi */}
              <Card className="bg-white/70 border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Kullanıcı Aktivitesi</span>
                  <span className="text-xs text-blue-600">{stats?.active_users || 0} Online</span>
                </div>
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { hour: '09', users: 2 },
                      { hour: '10', users: 5 },
                      { hour: '11', users: 3 },
                      { hour: '12', users: 1 },
                      { hour: '13', users: 4 },
                      { hour: '14', users: 6 },
                      { hour: '15', users: 3 }
                    ]}>
                      <Bar dataKey="users" fill="#3b82f6" radius={[1, 1, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Ana Fonksiyon Kartları */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 px-2 sm:px-0">🚀 Ana Fonksiyonlar</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Taraf - Ana Kartlar */}
          <div className="lg:col-span-2 space-y-4">

            {/* Program Sabitleri Card */}
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="p-6 flex items-center justify-between w-full">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                          <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Program Sabitleri</h3>
                          <p className="text-sm text-gray-600">Sistem ayarları ve temel veri yönetimi</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium">
                          Aktif
                        </span>
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 shadow-lg border border-gray-200">
                    <DropdownMenuItem 
                      onClick={() => {
                        setConstantsType('category');
                        setCurrentView('constants');
                      }}
                      data-testid="category-constants-menu"
                      className="p-3 hover:bg-slate-50"
                    >
                      <FileQuestion className="w-4 h-4 mr-3 text-slate-600" />
                      <div>
                        <p className="font-medium">Soru Kategorileri</p>
                        <p className="text-xs text-gray-500">Sistemdeki soru kategorilerini yönet</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setConstantsType('department');
                        setCurrentView('constants');
                      }}
                      data-testid="department-constants-menu"
                      className="p-3 hover:bg-slate-50"
                    >
                      <Building className="w-4 h-4 mr-3 text-slate-600" />
                      <div>
                        <p className="font-medium">Departmanlar</p>
                        <p className="text-xs text-gray-500">Şirket departmanlarını düzenle</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setConstantsType('employee');
                        setCurrentView('constants');
                      }}
                      data-testid="employee-constants-menu"
                      className="p-3 hover:bg-slate-50"
                    >
                      <Users className="w-4 h-4 mr-3 text-slate-600" />
                      <div>
                        <p className="font-medium">Çalışan Bilgileri</p>
                        <p className="text-xs text-gray-500">Personel listesini güncelle</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setConstantsType('question');
                        setCurrentView('constants');
                      }}
                      data-testid="question-constants-menu"
                      className="p-3 hover:bg-slate-50"
                    >
                      <Target className="w-4 h-4 mr-3 text-slate-600" />
                      <div>
                        <p className="font-medium">Soru Bankası</p>
                        <p className="text-xs text-gray-500">Değerlendirme sorularını ekle/düzenle</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>

            {/* Soruları Paylaş Card */}
            <Card 
              className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => setCurrentView('share')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                      <Share className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Soruları Paylaş</h3>
                      <p className="text-sm text-gray-600">Çalışanlara soru ataması ve e-posta gönderimi</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">
                      {stats?.active_questions || 0} Aktif
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DEMO & VERİ ANALİZİ Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DEMO SAYFA Card */}
              <Card 
                className="bg-white/90 backdrop-blur-sm border-2 border-orange-300 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => setCurrentView('demo')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                        <FileQuestion className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">DEMO SAYFA</h3>
                        <p className="text-xs text-gray-600">Kullanıcı ekranı demo</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full font-medium">
                        DEMO
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* VERİ ANALİZİ Card */}
              <Card 
                className="bg-white/90 backdrop-blur-sm border-2 border-emerald-300 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => setCurrentView('analysis')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">VERİ ANALİZİ</h3>
                        <p className="text-xs text-gray-600">Grafikler ve AI analizi</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-1 rounded-full font-medium">
                        {stats?.ai_analyses || 0} Rapor
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sağ Taraf - Activity Feed */}
          <div className="lg:col-span-1">
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-1 sm:space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <span>Aktivite Feed</span>
                </CardTitle>
                <CardDescription>Son sistem hareketleri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {/* Real-time aktiviteler */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Admin giriş yaptı</p>
                      <p className="text-xs text-gray-500">Az önce</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Dashboard verileri güncellendi</p>
                      <p className="text-xs text-gray-500">2 dk önce</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
                    <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                      <FileQuestion className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{stats?.active_questions || 0} aktif soru mevcut</p>
                      <p className="text-xs text-gray-500">5 dk önce</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">AI analiz motoru çalışıyor</p>
                      <p className="text-xs text-gray-500">10 dk önce</p>
                    </div>
                  </div>

                  {stats?.notifications?.map((notification, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.type === 'warning' ? 'bg-amber-500' :
                        notification.type === 'info' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        <AlertCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500">Şimdi</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* See more link */}
                <div className="pt-3 text-center border-t border-gray-200">
                  <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Daha fazla aktivite gör →
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Area - Clean */}
      </main>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

// Public Question Response Page
const PublicQuestionResponse = () => {
  const assignmentId = window.location.pathname.split('/').pop();
  const [questionData, setQuestionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Table data for months vs categories
  const [tableData, setTableData] = useState({});
  const [existingResponses, setExistingResponses] = useState([]);
  
  // Generate period array based on question period type
  const generatePeriodsArray = (questionPeriod) => {
    const periods = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const currentWeek = Math.ceil(now.getDate() / 7);
    const currentDay = now.getDate();
    
    // Define period configurations
    switch (questionPeriod) {
      case 'Aylık': {
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                           'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        
        for (let year = 2025; year <= 2030; year++) {
          const startMonth = year === 2025 ? 8 : 0; // Sep = 8 (0-indexed)
          const endMonth = year === 2030 ? 11 : 11; // Dec = 11
          
          for (let month = startMonth; month <= endMonth; month++) {
            periods.push({
              year,
              month: month + 1, // Convert to 1-indexed
              monthName: monthNames[month],
              key: `${year}-${month + 1}`,
              displayText: `${monthNames[month]} ${year}`,
              isCurrentPeriod: (year === currentYear && month + 1 === currentMonth)
            });
          }
        }
        break;
      }
      
      case 'Haftalık': {
        for (let year = 2025; year <= 2030; year++) {
          const startWeek = year === 2025 ? 36 : 1; // Start from Sep week
          const endWeek = year === 2030 ? 52 : 52;
          
          for (let week = startWeek; week <= endWeek; week++) {
            periods.push({
              year,
              week,
              key: `${year}-W${week}`,
              displayText: `${week}. Hafta ${year}`,
              isCurrentPeriod: (year === currentYear && week === Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)))
            });
          }
        }
        break;
      }
      
      case 'Günlük': {
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                           'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        
        for (let year = 2025; year <= 2030; year++) {
          const startMonth = year === 2025 ? 8 : 0; // Sep = 8 (0-indexed)
          const endMonth = year === 2030 ? 11 : 11; // Dec = 11
          
          for (let month = startMonth; month <= endMonth; month++) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
              periods.push({
                year,
                month: month + 1,
                day,
                monthName: monthNames[month],
                key: `${year}-${month + 1}-${day}`,
                displayText: `${day} ${monthNames[month]} ${year}`,
                isCurrentPeriod: (year === currentYear && month + 1 === currentMonth && day === currentDay)
              });
            }
          }
        }
        break;
      }
      
      case 'Çeyreklik': {
        const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
        
        for (let year = 2025; year <= 2030; year++) {
          const startQuarter = year === 2025 ? 3 : 0; // Start from Q3 (Sep)
          
          for (let quarter = startQuarter; quarter < 4; quarter++) {
            const currentQuarter = Math.floor((currentMonth - 1) / 3);
            periods.push({
              year,
              quarter: quarter + 1,
              key: `${year}-Q${quarter + 1}`,
              displayText: `${quarterNames[quarter]} ${year}`,
              isCurrentPeriod: (year === currentYear && quarter === currentQuarter)
            });
          }
        }
        break;
      }
      
      case 'Altı Aylık': {
        for (let year = 2025; year <= 2030; year++) {
          const startHalf = year === 2025 ? 2 : 1; // Start from H2 (Jul-Dec)
          
          for (let half = startHalf; half <= 2; half++) {
            const currentHalf = Math.ceil(currentMonth / 6);
            periods.push({
              year,
              half,
              key: `${year}-H${half}`,
              displayText: `${half}. Yarıyıl ${year}`,
              isCurrentPeriod: (year === currentYear && half === currentHalf)
            });
          }
        }
        break;
      }
      
      case 'Yıllık': {
        for (let year = 2025; year <= 2030; year++) {
          periods.push({
            year,
            key: `${year}`,
            displayText: `${year}`,
            isCurrentPeriod: (year === currentYear)
          });
        }
        break;
      }
      
      default: // 'İhtiyaç Halinde'
        periods.push({
          year: currentYear,
          key: 'on-demand',
          displayText: 'İhtiyaç Halinde',
          isCurrentPeriod: true
        });
        break;
    }
    
    return periods;
  };
  
  const [periodsArray, setPeriodsArray] = useState([]);
  
  // Get the current active period display text
  const getActivePeriodDisplayText = () => {
    const activePeriod = periodsArray.find(p => p.isCurrentPeriod);
    return activePeriod ? activePeriod.displayText : 'Aktif Dönem';
  };

  useEffect(() => {
    if (assignmentId) {
      fetchQuestionData();
    }
  }, [assignmentId]);

  const fetchQuestionData = async () => {
    try {
      const response = await axios.get(`${API}/public/question-form/${assignmentId}`);
      setQuestionData(response.data);
      
      // Generate periods based on question period type
      const periods = generatePeriodsArray(response.data.question.period);
      setPeriodsArray(periods);
      
      // Initialize table data structure
      const initialTableData = {};
      
      // Initialize table data for each period
      periods.forEach(periodInfo => {
        initialTableData[periodInfo.key] = {
          data: {}, // row_id -> value mapping
          comment: '',
          isActive: periodInfo.isCurrentPeriod
        };
      });
      
      setTableData(initialTableData);
      
      // Fetch existing responses to populate table
      if (response.data.question && response.data.employee) {
        await fetchExistingResponses(response.data.question.id, response.data.employee.id);
      }
      
    } catch (error) {
      setError('Soru yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingResponses = async (questionId, employeeId) => {
    try {
      const response = await axios.get(`${API}/table-responses/question/${questionId}`);
      const userResponses = response.data.responses.filter(r => r.employee_id === employeeId);
      
      // Populate existing data in table
      const updatedTableData = { ...tableData };
      userResponses.forEach(response => {
        const monthKey = `${response.year}-${response.month}`;
        if (updatedTableData[monthKey]) {
          updatedTableData[monthKey].data = response.table_data || {};
          updatedTableData[monthKey].comment = response.monthly_comment || '';
        }
      });
      
      setTableData(updatedTableData);
      setExistingResponses(userResponses);
    } catch (error) {
      console.log('Existing responses could not be loaded:', error);
    }
  };

  const handleSubmit = async () => {
    // Find the active period
    const activePeriod = periodsArray.find(p => p.isCurrentPeriod);
    if (!activePeriod) {
      setError('Aktif dönem bulunamadı');
      return;
    }
    
    const activeData = tableData[activePeriod.key];
    if (!activeData) {
      setError('Aktif dönem verisi bulunamadı');
      return;
    }
    
    // Check if there's any data to submit
    const hasData = Object.values(activeData.data).some(val => val && val.toString().trim());
    const hasComment = activeData.comment && activeData.comment.trim();
    
    if (!hasData && !hasComment) {
      setError('Lütfen en az bir veri girişi yapın veya yorum yazın');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Prepare submission data based on period type
      const submissionData = {
        question_id: questionData.question.id,
        employee_id: questionData.employee.id,
        table_data: activeData.data,
        monthly_comment: activeData.comment || null
      };
      
      // Add period-specific fields
      if (activePeriod.year) submissionData.year = activePeriod.year;
      if (activePeriod.month) submissionData.month = activePeriod.month;
      if (activePeriod.day) submissionData.day = activePeriod.day;
      if (activePeriod.week) submissionData.week = activePeriod.week;
      if (activePeriod.quarter) submissionData.quarter = activePeriod.quarter;
      if (activePeriod.half) submissionData.half = activePeriod.half;
      
      await axios.post(`${API}/table-responses`, submissionData);
      
      setSuccess('Verileriniz başarıyla kaydedildi ve AI yorumu oluşturuldu!');
      setSubmitted(true);
    } catch (error) {
      setError(error.response?.data?.detail || 'Veriler gönderilirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const updateTableCell = (monthKey, rowId, value) => {
    setTableData(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        data: {
          ...prev[monthKey].data,
          [rowId]: value
        }
      }
    }));
  };

  const updateMonthComment = (monthKey, comment) => {
    setTableData(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        comment: comment
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <Card className="max-w-lg mx-auto bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Teşekkürler!</h2>
            <p className="text-gray-600">
              Yanıtınız başarıyla kaydedildi. Bu sayfayı kapatabilirsiniz.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !questionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <Card className="max-w-lg mx-auto bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Hata</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 p-4">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center border-b border-gray-200">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileQuestion className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Dijital Dönüşüm</CardTitle>
            <CardDescription>
              {questionData?.question?.period} Değerlendirme Formu - {getActivePeriodDisplayText()}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {questionData && (
              <>
                <div className="bg-emerald-50 border-l-4 border-emerald-400 p-6 mb-6 rounded-r-lg">
                  <h3 className="text-lg font-semibold text-emerald-800 mb-2">
                    {questionData.question.category}
                  </h3>
                  <p className="text-emerald-700 font-medium mb-4">
                    {questionData.question.question_text}
                  </p>
                  <div className="text-sm text-emerald-600">
                    <p className="mb-2">
                      <strong>Önem/Gerekçe:</strong><br />
                      {questionData.question.importance_reason}
                    </p>
                    <p>
                      <strong>Beklenen Aksiyon:</strong><br />
                      {questionData.question.expected_action}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-600">
                    <strong>Çalışan:</strong> {questionData.employee.first_name} {questionData.employee.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Departman:</strong> {questionData.employee.department}
                  </p>
                </div>

                {error && (
                  <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertDescription className="text-red-600">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-6 border-green-200 bg-green-50">
                    <AlertDescription className="text-green-600">{success}</AlertDescription>
                  </Alert>
                )}

                {/* Clean Table: Months as Rows, Categories as Columns */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {questionData.question.period} Değerlendirme Tablosu
                    </h3>
                    <div className="text-sm text-gray-500">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        Aktif: {getActivePeriodDisplayText()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {/* Dynamic period columns based on question period */}
                            {questionData.question.period === 'Günlük' && (
                              <>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Ay</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Gün</th>
                              </>
                            )}
                            {questionData.question.period === 'Haftalık' && (
                              <>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Hafta</th>
                              </>
                            )}
                            {questionData.question.period === 'Aylık' && (
                              <>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Ay</th>
                              </>
                            )}
                            {questionData.question.period === 'Çeyreklik' && (
                              <>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Çeyrek</th>
                              </>
                            )}
                            {questionData.question.period === 'Altı Aylık' && (
                              <>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yarıyıl</th>
                              </>
                            )}
                            {questionData.question.period === 'Yıllık' && (
                              <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                            )}
                            {questionData.question.period === 'İhtiyaç Halinde' && (
                              <th className="px-3 py-3 text-left font-medium text-gray-900 w-32">Dönem</th>
                            )}
                            
                            {/* Dynamic columns from table_rows */}
                            {questionData.question.table_rows && questionData.question.table_rows.map(row => (
                              <th key={row.id} className="px-3 py-3 text-left font-medium text-gray-900 min-w-20">
                                {row.name}
                                {row.unit && <span className="text-xs text-gray-500 block">({row.unit})</span>}
                              </th>
                            ))}
                            
                            {/* Always include comment column */}
                            <th className="px-3 py-3 text-left font-medium text-gray-900 min-w-32">Yorum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periodsArray.map(periodInfo => {
                            const periodData = tableData[periodInfo.key] || { data: {}, comment: '', isActive: false };
                            const isActive = periodInfo.isCurrentPeriod;
                            const hasExistingData = existingResponses.some(r => {
                              // Check based on period type
                              if (periodInfo.year && periodInfo.month && periodInfo.day) {
                                return r.year === periodInfo.year && r.month === periodInfo.month && r.day === periodInfo.day;
                              } else if (periodInfo.year && periodInfo.month) {
                                return r.year === periodInfo.year && r.month === periodInfo.month;
                              } else if (periodInfo.year && periodInfo.week) {
                                return r.year === periodInfo.year && r.week === periodInfo.week;
                              } else if (periodInfo.year && periodInfo.quarter) {
                                return r.year === periodInfo.year && r.quarter === periodInfo.quarter;
                              } else if (periodInfo.year && periodInfo.half) {
                                return r.year === periodInfo.year && r.half === periodInfo.half;
                              } else if (periodInfo.year) {
                                return r.year === periodInfo.year;
                              }
                              return false;
                            });
                            
                            return (
                              <tr 
                                key={periodInfo.key} 
                                className={`border-t ${
                                  isActive ? 'bg-green-50 hover:bg-green-100' : 
                                  hasExistingData ? 'bg-blue-50' : 
                                  'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                {/* Dynamic period columns */}
                                {questionData.question.period === 'Günlük' && (
                                  <>
                                    <td className="px-3 py-2 font-medium">
                                      <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                        {periodInfo.year}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                      <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                        {periodInfo.monthName}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                      <div className="flex items-center space-x-1 sm:space-x-2">
                                        <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                          {periodInfo.day}
                                        </span>
                                        {isActive && (
                                          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            AKTİF
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                                
                                {questionData.question.period === 'Haftalık' && (
                                  <>
                                    <td className="px-3 py-2 font-medium">
                                      <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                        {periodInfo.year}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                      <div className="flex items-center space-x-1 sm:space-x-2">
                                        <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                          {periodInfo.week}
                                        </span>
                                        {isActive && (
                                          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            AKTİF
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                                
                                {questionData.question.period === 'Aylık' && (
                                  <>
                                    <td className="px-3 py-2 font-medium">
                                      <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                        {periodInfo.year}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                      <div className="flex items-center space-x-1 sm:space-x-2">
                                        <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                          {periodInfo.monthName}
                                        </span>
                                        {isActive && (
                                          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            AKTİF
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                                
                                {questionData.question.period === 'Çeyreklik' && (
                                  <>
                                    <td className="px-3 py-2 font-medium">
                                      <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                        {periodInfo.year}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                      <div className="flex items-center space-x-1 sm:space-x-2">
                                        <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                          Q{periodInfo.quarter}
                                        </span>
                                        {isActive && (
                                          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            AKTİF
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                                
                                {questionData.question.period === 'Altı Aylık' && (
                                  <>
                                    <td className="px-3 py-2 font-medium">
                                      <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                        {periodInfo.year}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                      <div className="flex items-center space-x-1 sm:space-x-2">
                                        <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                          H{periodInfo.half}
                                        </span>
                                        {isActive && (
                                          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            AKTİF
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                                
                                {questionData.question.period === 'Yıllık' && (
                                  <td className="px-3 py-2 font-medium">
                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                      <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                        {periodInfo.year}
                                      </span>
                                      {isActive && (
                                        <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          AKTİF
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )}
                                
                                {questionData.question.period === 'İhtiyaç Halinde' && (
                                  <td className="px-3 py-2 font-medium">
                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                      <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                        {periodInfo.displayText}
                                      </span>
                                      {isActive && (
                                        <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          AKTİF
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )}
                                
                                {/* Data columns */}
                                {questionData.question.table_rows && questionData.question.table_rows.map(row => (
                                  <td key={row.id} className="px-3 py-2">
                                    <Input
                                      type="text"
                                      value={periodData.data[row.id] || ''}
                                      onChange={(e) => updateTableCell(periodInfo.key, row.id, e.target.value)}
                                      disabled={!isActive}
                                      placeholder={isActive ? "0" : ""}
                                      className={`w-full h-8 text-sm ${
                                        !isActive ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 
                                        'bg-white'
                                      }`}
                                    />
                                  </td>
                                ))}
                                
                                {/* Comment column */}
                                <td className="px-3 py-2">
                                  <Input
                                    value={periodData.comment || ''}
                                    onChange={(e) => updateMonthComment(periodInfo.key, e.target.value)}
                                    disabled={!isActive}
                                    placeholder={isActive ? "Yorum yazın..." : ""}
                                    className={`w-full h-8 text-sm ${
                                      !isActive ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 
                                      'bg-white'
                                    }`}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                        <span>Aktif dönem (düzenlenebilir)</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                        <span>Geçmiş veri (sadece görüntüleme)</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                        <span>Gelecek dönemler (kapalı)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 px-8 py-2.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      `${getCurrentActivePeriod().month}/${getCurrentActivePeriod().year} Verilerini Kaydet`
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Demo Question Response Page - Test için
const DemoQuestionResponse = () => {
  // Demo data
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Demo sorular - Gerçek sistemdeki sorular
  const demoQuestions = [
    {
      id: 'demo-1',
      question_text: 'Toplam çalışan sayımız nedir?',
      category: 'İnsan Kaynakları',
      importance_reason: 'İnsan kaynakları planlaması ve bütçe hesaplamaları için temel veri.',
      expected_action: 'Mevcut toplam çalışan sayısını departman bazında giriniz.',
      period: 'Aylık',
      table_rows: [
        { id: '1', name: 'Tam Zamanlı', unit: 'kişi' },
        { id: '2', name: 'Yarı Zamanlı', unit: 'kişi' },
        { id: '3', name: 'Stajyer', unit: 'kişi' }
      ]
    },
    {
      id: 'demo-2',
      question_text: 'Departman bazında çalışan dağılımı nasıl?',
      category: 'İnsan Kaynakları',
      importance_reason: 'Departmanlar arası kaynak dağılımını optimize etmek için.',
      expected_action: 'Her departmandaki çalışan sayılarını güncel olarak giriniz.',
      period: 'Aylık',
      table_rows: [
        { id: '1', name: 'İnsan Kaynakları', unit: 'kişi' },
        { id: '2', name: 'Pazarlama', unit: 'kişi' },
        { id: '3', name: 'Satış', unit: 'kişi' },
        { id: '4', name: 'Teknik', unit: 'kişi' },
        { id: '5', name: 'Finans', unit: 'kişi' }
      ]
    },
    {
      id: 'demo-3',
      question_text: 'Yaş, cinsiyet dağılımı nedir?',
      category: 'İnsan Kaynakları',
      importance_reason: 'Çeşitlilik ve eşitlik politikalarını değerlendirmek için.',
      expected_action: 'Yaş grupları ve cinsiyet bazında çalışan dağılımını giriniz.',
      period: 'Çeyreklik',
      table_rows: [
        { id: '1', name: 'Erkek (20-30)', unit: 'kişi' },
        { id: '2', name: 'Erkek (31-40)', unit: 'kişi' },
        { id: '3', name: 'Erkek (41+)', unit: 'kişi' },
        { id: '4', name: 'Kadın (20-30)', unit: 'kişi' },
        { id: '5', name: 'Kadın (31-40)', unit: 'kişi' },
        { id: '6', name: 'Kadın (41+)', unit: 'kişi' }
      ]
    },
    {
      id: 'demo-4',
      question_text: 'Kıdem dağılımı nedir?',
      category: 'İnsan Kaynakları',
      importance_reason: 'Deneyim seviyesi analizi ve kariyer planlama için.',
      expected_action: 'Çalışanların kıdem yıllarına göre dağılımını giriniz.',
      period: 'Altı Aylık',
      table_rows: [
        { id: '1', name: '0-1 Yıl', unit: 'kişi' },
        { id: '2', name: '2-5 Yıl', unit: 'kişi' },
        { id: '3', name: '6-10 Yıl', unit: 'kişi' },
        { id: '4', name: '11+ Yıl', unit: 'kişi' }
      ]
    },
    {
      id: 'demo-5',
      question_text: 'Kritik pozisyonlar kimlerde?',
      category: 'İnsan Kaynakları',
      importance_reason: 'Risk yönetimi ve süreklilik planlaması için kritik.',
      expected_action: 'Kritik pozisyonlardaki personel durumunu değerlendirin.',
      period: 'Yıllık',
      table_rows: [
        { id: '1', name: 'Üst Yönetim', unit: 'kişi' },
        { id: '2', name: 'Orta Kademe', unit: 'kişi' },
        { id: '3', name: 'Teknik Uzman', unit: 'kişi' },
        { id: '4', name: 'Boş Pozisyon', unit: 'adet' }
      ]
    }
  ];

  const currentQuestion = demoQuestions[currentQuestionIndex];
  
  // Employee info
  const employee = {
    first_name: 'Mevlüt',
    last_name: 'Körkuş',
    department: 'İnsan Kaynakları'
  };
  
  // Generate demo periods array
  const generateDemoPeriodsArray = (questionPeriod) => {
    const periods = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const currentQuarter = Math.ceil(currentMonth / 3);
    const currentHalf = Math.ceil(currentMonth / 6);
    
    switch (questionPeriod) {
      case 'Aylık': {
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                           'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        
        for (let year = 2025; year <= 2030; year++) {
          const startMonth = year === 2025 ? 8 : 0; // Sep = 8 (0-indexed)
          const endMonth = year === 2030 ? 11 : 11; // Dec = 11
          
          for (let month = startMonth; month <= endMonth; month++) {
            periods.push({
              year,
              month: month + 1, // Convert to 1-indexed
              monthName: monthNames[month],
              key: `${year}-${month + 1}`,
              displayText: `${monthNames[month]} ${year}`,
              isCurrentPeriod: (year === currentYear && month + 1 === currentMonth)
            });
          }
        }
        break;
      }
      
      case 'Çeyreklik': {
        const quarterNames = ['Q1 (Oca-Mar)', 'Q2 (Nis-Haz)', 'Q3 (Tem-Eyl)', 'Q4 (Eki-Ara)'];
        
        for (let year = 2025; year <= 2030; year++) {
          const startQuarter = year === 2025 ? 3 : 1; // Start from Q3 (Sep)
          
          for (let quarter = startQuarter; quarter <= 4; quarter++) {
            periods.push({
              year,
              quarter,
              key: `${year}-Q${quarter}`,
              displayText: `${quarterNames[quarter-1]} ${year}`,
              isCurrentPeriod: (year === currentYear && quarter === currentQuarter)
            });
          }
        }
        break;
      }
      
      case 'Altı Aylık': {
        for (let year = 2025; year <= 2030; year++) {
          const startHalf = year === 2025 ? 2 : 1; // Start from H2 (Jul-Dec)
          
          for (let half = startHalf; half <= 2; half++) {
            periods.push({
              year,
              half,
              key: `${year}-H${half}`,
              displayText: `${half === 1 ? 'İlk' : 'İkinci'} Yarıyıl ${year}`,
              isCurrentPeriod: (year === currentYear && half === currentHalf)
            });
          }
        }
        break;
      }
      
      case 'Yıllık': {
        for (let year = 2025; year <= 2030; year++) {
          periods.push({
            year,
            key: `${year}`,
            displayText: `${year} Yılı`,
            isCurrentPeriod: (year === currentYear)
          });
        }
        break;
      }
      
      default: // 'Günlük', 'Haftalık', 'İhtiyaç Halinde'
        periods.push({
          year: currentYear,
          key: 'current',
          displayText: 'Mevcut Dönem',
          isCurrentPeriod: true
        });
        break;
    }
    
    return periods;
  };
  
  const [periodsArray, setPeriodsArray] = useState(generateDemoPeriodsArray(currentQuestion.period));
  const [tableData, setTableData] = useState(() => {
    const initialTableData = {};
    const periods = generateDemoPeriodsArray(currentQuestion.period);
    periods.forEach(periodInfo => {
      initialTableData[periodInfo.key] = {
        data: {}, // row_id -> value mapping
        comment: '',
        isActive: periodInfo.isCurrentPeriod
      };
    });
    return initialTableData;
  });
  
  // Update periods when question changes
  useEffect(() => {
    const newPeriods = generateDemoPeriodsArray(currentQuestion.period);
    setPeriodsArray(newPeriods);
    
    const initialTableData = {};
    newPeriods.forEach(periodInfo => {
      initialTableData[periodInfo.key] = {
        data: {},
        comment: '',
        isActive: periodInfo.isCurrentPeriod
      };
    });
    setTableData(initialTableData);
  }, [currentQuestionIndex]);
  
  const getActivePeriodDisplayText = () => {
    const activePeriod = periodsArray.find(p => p.isCurrentPeriod);
    return activePeriod ? activePeriod.displayText : 'Aktif Dönem';
  };
  
  const nextQuestion = () => {
    if (currentQuestionIndex < demoQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSubmitted(false);
      setError('');
      setSuccess('');
    }
  };
  
  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSubmitted(false);
      setError('');
      setSuccess('');
    }
  };
  
  const updateTableCell = (periodKey, rowId, value) => {
    setTableData(prev => ({
      ...prev,
      [periodKey]: {
        ...prev[periodKey],
        data: {
          ...prev[periodKey].data,
          [rowId]: value
        }
      }
    }));
  };

  const updatePeriodComment = (periodKey, comment) => {
    setTableData(prev => ({
      ...prev,
      [periodKey]: {
        ...prev[periodKey],
        comment: comment
      }
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    // Demo submit
    setTimeout(() => {
      setSuccess('Demo verileriniz başarıyla kaydedildi!');
      setSubmitted(true);
      setSubmitting(false);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <Card className="max-w-lg mx-auto bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Teşekkürler!</h2>
            <p className="text-gray-600">
              Demo yanıtınız başarıyla kaydedildi. Bu sayfayı kapatabilirsiniz.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/dashboard'}
              >
                ← Dashboard'a Dön
              </Button>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-sm text-gray-600">
                  Soru {currentQuestionIndex + 1} / {demoQuestions.length}
                </span>
                <span className="text-sm text-red-600 font-semibold bg-red-100 px-2 py-1 rounded">
                  GEÇİCİ DEMO
                </span>
              </div>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-center space-x-1 sm:space-x-2 mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                ← Önceki Soru
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={nextQuestion}
                disabled={currentQuestionIndex === demoQuestions.length - 1}
              >
                Sonraki Soru →
              </Button>
            </div>
            
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileQuestion className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Dijital Dönüşüm - DEMO</CardTitle>
            <CardDescription>
              {currentQuestion.period} Değerlendirme Formu - {getActivePeriodDisplayText()}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {/* Question Info */}
            <div className="bg-emerald-50 border-l-4 border-emerald-400 p-6 mb-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-emerald-800 mb-2">
                {currentQuestion.category}
              </h3>
              <p className="text-emerald-700 font-medium mb-4">
                {currentQuestion.question_text}
              </p>
              <div className="text-sm text-emerald-600">
                <p className="mb-2">
                  <strong>Önem/Gerekçe:</strong><br />
                  {currentQuestion.importance_reason}
                </p>
                <p>
                  <strong>Beklenen Aksiyon:</strong><br />
                  {currentQuestion.expected_action}
                </p>
              </div>
            </div>

            {/* Employee Info */}
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                <strong>Çalışan:</strong> {employee.first_name} {employee.last_name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Departman:</strong> {employee.department}
              </p>
            </div>

            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-600">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}

            {/* Response Table */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentQuestion.period} Değerlendirme Tablosu (DEMO)
                </h3>
                <div className="text-sm text-gray-500">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    Aktif: {getActivePeriodDisplayText()}
                  </span>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {/* Dynamic period headers based on question period */}
                        {currentQuestion.period === 'Aylık' && (
                          <>
                            <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Ay</th>
                          </>
                        )}
                        {currentQuestion.period === 'Çeyreklik' && (
                          <>
                            <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-900 w-32">Çeyrek</th>
                          </>
                        )}
                        {currentQuestion.period === 'Altı Aylık' && (
                          <>
                            <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-900 w-32">Yarıyıl</th>
                          </>
                        )}
                        {currentQuestion.period === 'Yıllık' && (
                          <th className="px-3 py-3 text-left font-medium text-gray-900 w-20">Yıl</th>
                        )}
                        
                        {/* Dynamic columns from table_rows */}
                        {currentQuestion.table_rows && currentQuestion.table_rows.map(row => (
                          <th key={row.id} className="px-3 py-3 text-left font-medium text-gray-900 min-w-32">
                            {row.name}
                            {row.unit && <span className="text-xs text-gray-500 block">({row.unit})</span>}
                          </th>
                        ))}
                        
                        <th className="px-3 py-3 text-left font-medium text-gray-900 min-w-40">Yorum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodsArray.map(periodInfo => {
                        const periodData = tableData[periodInfo.key] || { data: {}, comment: '', isActive: false };
                        const isActive = periodInfo.isCurrentPeriod;
                        const hasExistingData = false; // Demo için
                        
                        return (
                          <tr 
                            key={periodInfo.key} 
                            className={`border-t ${
                              isActive ? 'bg-green-50 hover:bg-green-100' : 
                              hasExistingData ? 'bg-blue-50' : 
                              'bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            {/* Dynamic period columns */}
                            {currentQuestion.period === 'Aylık' && (
                              <>
                                <td className="px-3 py-2 font-medium">
                                  <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                    {periodInfo.year}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-medium">
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                      {periodInfo.monthName}
                                    </span>
                                    {isActive && (
                                      <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        AKTİF
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </>
                            )}
                            
                            {currentQuestion.period === 'Çeyreklik' && (
                              <>
                                <td className="px-3 py-2 font-medium">
                                  <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                    {periodInfo.year}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-medium">
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                      Q{periodInfo.quarter}
                                    </span>
                                    {isActive && (
                                      <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        AKTİF
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </>
                            )}
                            
                            {currentQuestion.period === 'Altı Aylık' && (
                              <>
                                <td className="px-3 py-2 font-medium">
                                  <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                    {periodInfo.year}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-medium">
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                      H{periodInfo.half}
                                    </span>
                                    {isActive && (
                                      <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        AKTİF
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </>
                            )}
                            
                            {currentQuestion.period === 'Yıllık' && (
                              <td className="px-3 py-2 font-medium">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <span className={isActive ? 'text-green-700' : hasExistingData ? 'text-blue-700' : 'text-gray-500'}>
                                    {periodInfo.year}
                                  </span>
                                  {isActive && (
                                    <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      AKTİF
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            
                            {/* Data columns */}
                            {currentQuestion.table_rows && currentQuestion.table_rows.map(row => (
                              <td key={row.id} className="px-3 py-2">
                                <Input
                                  type="text"
                                  value={periodData.data[row.id] || ''}
                                  onChange={(e) => updateTableCell(periodInfo.key, row.id, e.target.value)}
                                  disabled={!isActive}
                                  placeholder={isActive ? "0" : ""}
                                  className={`w-full h-8 text-sm ${
                                    !isActive ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 
                                    'bg-white'
                                  }`}
                                />
                              </td>
                            ))}
                            
                            {/* Comment column */}
                            <td className="px-3 py-2">
                              <Input
                                value={periodData.comment || ''}
                                onChange={(e) => updatePeriodComment(periodInfo.key, e.target.value)}
                                disabled={!isActive}
                                placeholder={isActive ? "Yorum yazın..." : ""}
                                className={`w-full h-8 text-sm ${
                                  !isActive ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 
                                  'bg-white'
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                    <span>Aktif dönem (düzenlenebilir)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                    <span>Geçmiş veri (sadece görüntüleme)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                    <span>Gelecek dönemler (kapalı)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white px-8 py-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Verilerinizi Gönder
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Data Analysis Page - Veri Analizi
const DataAnalysisPage = () => {
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  
  // Demo sorular ve geçmiş verileri
  const analysisQuestions = [
    {
      id: '1',
      question_text: 'Toplam çalışan sayımız nedir?',
      category: 'İnsan Kaynakları',
      period: 'Aylık',
      table_rows: [
        { id: '1', name: 'Tam Zamanlı', unit: 'kişi' },
        { id: '2', name: 'Yarı Zamanlı', unit: 'kişi' },
        { id: '3', name: 'Stajyer', unit: 'kişi' }
      ],
      historical_data: [
        {
          period: 'Eylül 2024',
          data: { '1': '45', '2': '12', '3': '8' },
          comment: 'Yeni işe alımlar gerçekleşti.',
          ai_comment: 'Tam zamanlı çalışan sayısında %8 artış gözlendi. Bu olumlu bir trend.',
          user: 'Mevlüt Körkuş',
          date: '2024-09-15'
        },
        {
          period: 'Ağustos 2024',
          data: { '1': '42', '2': '10', '3': '6' },
          comment: 'Yaz dönemi azalması.',
          ai_comment: 'Mevsimsel azalma beklendiği gibi gerçekleşti.',
          user: 'Mevlüt Körkuş',
          date: '2024-08-15'
        },
        {
          period: 'Temmuz 2024',
          data: { '1': '48', '2': '14', '3': '5' },
          comment: 'Proje yoğunluğu sebebiyle artış.',
          ai_comment: 'Proje dönemlerinde çalışan artışı normal bir durumdur.',
          user: 'Mevlüt Körkuş',
          date: '2024-07-15'
        }
      ]
    },
    {
      id: '2',
      question_text: 'Departman bazında çalışan dağılımı nasıl?',
      category: 'İnsan Kaynakları',
      period: 'Aylık',
      table_rows: [
        { id: '1', name: 'İnsan Kaynakları', unit: 'kişi' },
        { id: '2', name: 'Pazarlama', unit: 'kişi' },
        { id: '3', name: 'Satış', unit: 'kişi' },
        { id: '4', name: 'Teknik', unit: 'kişi' },
        { id: '5', name: 'Finans', unit: 'kişi' }
      ],
      historical_data: [
        {
          period: 'Eylül 2024',
          data: { '1': '8', '2': '12', '3': '15', '4': '20', '5': '10' },
          comment: 'Teknik departmana yeni alımlar yapıldı.',
          ai_comment: 'Teknik departman %25 büyüdü. Dengeyi koruyun.',
          user: 'Mevlüt Körkuş',
          date: '2024-09-15'
        },
        {
          period: 'Ağustos 2024',
          data: { '1': '8', '2': '10', '3': '14', '4': '16', '5': '10' },
          comment: 'Normal dönem.',
          ai_comment: 'Departmanlar arası denge iyi durumda.',
          user: 'Mevlüt Körkuş',
          date: '2024-08-15'
        }
      ]
    }
  ];

  const currentQuestion = analysisQuestions[selectedQuestion];
  
  // Chart data hazırlığı
  const prepareChartData = (question) => {
    return question.historical_data.map(item => {
      const chartItem = { period: item.period };
      question.table_rows.forEach(row => {
        chartItem[row.name] = parseInt(item.data[row.id] || 0);
      });
      return chartItem;
    }).reverse(); // Son ay sola gelsin
  };

  const chartData = prepareChartData(currentQuestion);
  const chartColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/dashboard'}
              >
                ← Dashboard'a Dön
              </Button>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-sm text-emerald-600 font-semibold bg-emerald-100 px-2 py-1 rounded">
                  VERİ ANALİZİ DEMO
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900">Veri Analizi & Raporlama</CardTitle>
                <CardDescription>
                  Geçmiş veriler, trendler ve AI destekli analizler
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {/* Filtreler */}
            <div className="mb-8 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2 sm:px-0">Filtreler</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Soru Seçimi */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Soru</label>
                  <select 
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    {analysisQuestions.map((q, index) => (
                      <option key={q.id} value={index}>
                        {q.question_text.length > 40 ? q.question_text.substring(0, 40) + '...' : q.question_text}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dönem Filtresi */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Dönem</label>
                  <select 
                    value={selectedPeriodFilter}
                    onChange={(e) => setSelectedPeriodFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="all">Tüm Dönemler</option>
                    <option value="last3">Son 3 Ay</option>
                    <option value="last6">Son 6 Ay</option>
                    <option value="lastyear">Son 1 Yıl</option>
                  </select>
                </div>

                {/* Departman Filtresi */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Departman</label>
                  <select 
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="all">Tüm Departmanlar</option>
                    <option value="hr">İnsan Kaynakları</option>
                    <option value="marketing">Pazarlama</option>
                    <option value="sales">Satış</option>
                    <option value="tech">Teknik</option>
                    <option value="finance">Finans</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Soru Bilgileri */}
            <div className="bg-emerald-50 border-l-4 border-emerald-400 p-6 mb-8 rounded-r-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-emerald-800 mb-2">
                    {currentQuestion.category} - {currentQuestion.period}
                  </h3>
                  <p className="text-emerald-700 font-medium mb-2">
                    {currentQuestion.question_text}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.table_rows.map(row => (
                      <span key={row.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {row.name} ({row.unit})
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ml-4 flex space-x-1 sm:space-x-2">
                  <Button variant="outline" size="sm">
                    📄 PDF İndir
                  </Button>
                  <Button variant="outline" size="sm">
                    📊 Excel İndir
                  </Button>
                </div>
              </div>
            </div>

            {/* Grafik */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2 sm:px-0">Trend Analizi</h3>
              
              {/* Chart Type Selector */}
              <div className="mb-4 flex space-x-1 sm:space-x-2">
                <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600">
                  📈 Line Chart
                </Button>
                <Button variant="outline" size="sm">
                  📊 Bar Chart  
                </Button>
                <Button variant="outline" size="sm">
                  🥧 Pie Chart
                </Button>
              </div>
              
              <div className="bg-white border rounded-lg p-6" style={{height: '400px'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend />
                    {currentQuestion.table_rows.map((row, index) => (
                      <Line 
                        key={row.id}
                        type="monotone" 
                        dataKey={row.name} 
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={2}
                        dot={{ fill: chartColors[index % chartColors.length], strokeWidth: 2 }}
                        activeDot={{ r: 6, stroke: chartColors[index % chartColors.length], strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* İkincil Grafik - Bar Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2 sm:px-0">Karşılaştırma Analizi</h3>
              <div className="bg-white border rounded-lg p-6" style={{height: '300px'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    {currentQuestion.table_rows.map((row, index) => (
                      <Bar 
                        key={row.id}
                        dataKey={row.name} 
                        fill={chartColors[index % chartColors.length]}
                        radius={[2, 2, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Üçüncül Grafik - Pie Chart (Son dönem için) */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2 sm:px-0">Güncel Dağılım</h3>
              <div className="bg-white border rounded-lg p-6" style={{height: '300px'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={currentQuestion.table_rows.map((row, index) => ({
                        name: row.name,
                        value: parseInt(currentQuestion.historical_data[0]?.data[row.id] || 0),
                        fill: chartColors[index % chartColors.length]
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {currentQuestion.table_rows.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Geçmiş Veriler Tablosu */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2 sm:px-0">Geçmiş Veriler</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Dönem</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Kullanıcı</th>
                        {currentQuestion.table_rows.map(row => (
                          <th key={row.id} className="px-4 py-3 text-left font-medium text-gray-900">
                            {row.name} ({row.unit})
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Yorum</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">AI Analizi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentQuestion.historical_data.map((item, index) => (
                        <tr key={index} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{item.period}</td>
                          <td className="px-4 py-3 text-gray-600">{item.user}</td>
                          {currentQuestion.table_rows.map(row => (
                            <td key={row.id} className="px-4 py-3">
                              <span className="font-semibold text-emerald-600">
                                {item.data[row.id] || '0'}
                              </span>
                            </td>
                          ))}
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-gray-700 text-xs">{item.comment}</p>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-blue-700 text-xs bg-blue-50 p-2 rounded">
                              🤖 {item.ai_comment}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* AI İçgörüler - Advanced Analytics Panel */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🧠 AI Gelişmiş Analitik</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Fetch advanced insights
                    const fetchAdvancedInsights = async () => {
                      try {
                        const response = await axios.get(`${API}/analytics/insights/${currentQuestion.id}`);
                        setAdvancedInsights(response.data);
                      } catch (error) {
                        console.error('Advanced insights error:', error);
                      }
                    };
                    fetchAdvancedInsights();
                  }}
                  className="bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200"
                >
                  🔄 Analizi Yenile
                </Button>
              </div>
              
              {/* Advanced Insights Content */}
              <AdvancedInsightsPanel questionId={currentQuestion.id} />
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  // Check if this is a public question response page
  const isPublicAnswerPage = window.location.pathname.startsWith('/answer/');
  
  if (isPublicAnswerPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <PublicQuestionResponse />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/answer/:assignmentId" element={<PublicQuestionResponse />} />
                <Route path="/demo-response" element={<DemoQuestionResponse />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </div>
  );
}

export default App;