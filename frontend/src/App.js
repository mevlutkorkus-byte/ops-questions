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
import { Loader2, User, Lock, Mail, BarChart3, Users, Activity, Plus, Edit, Trash2, Phone, Calendar, DollarSign, FileQuestion, Clock, Target, Settings, ChevronDown, Share, Send } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Only logout if the error is 401 (unauthorized)
      if (error.response?.status === 401) {
        console.log('Token expired or invalid, logging out');
        logout();
      } else {
        // For other errors, just log and continue with the token
        console.log('Temporary API error, keeping authentication state');
        setLoading(false);
      }
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
      loading: loading || !initialized,
      isAuthenticated: !!token && initialized
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
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
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
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
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
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
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
          <h2 className="text-2xl font-bold text-gray-900">Cevap Durumu</h2>
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
          <h2 className="text-2xl font-bold text-gray-900">Gönderilen E-postalar</h2>
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
                      <div className="flex items-center space-x-2">
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
                      <div className={`text-sm font-medium ${log.response_received ? 'text-green-600' : 'text-orange-600'}`}>
                        {log.response_received ? '✅ Yanıtlandı' : '⏳ Bekliyor'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Yanıt Linki:</span>
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
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchQuestionsAndEmployees();
  }, []);

  const fetchQuestionsAndEmployees = async () => {
    try {
      const response = await axios.get(`${API}/questions-share-list`);
      setQuestions(response.data.questions);
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
      
      setSuccess(`${response.data.assignments_created} soru başarıyla paylaşıldı!`);
      
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
          <h2 className="text-2xl font-bold text-gray-900">Soruları Paylaş</h2>
        </div>
      </div>

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
                  <TableHead className="w-1/3">Soru Metni</TableHead>
                  <TableHead>İlgili Kişi</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead>E-posta Adresi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Henüz soru bulunmuyor
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
                            {question.question_text.length > 100 
                              ? question.question_text.substring(0, 100) + '...'
                              : question.question_text
                            }
                          </p>
                        </div>
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
            <h2 className="text-2xl font-bold text-gray-900">Cevaplar</h2>
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
                    <div className="flex items-center space-x-2 mb-2">
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
            <h2 className="text-2xl font-bold text-gray-900">Cevap Girişi</h2>
            <p className="text-gray-600">{selectedQuestion.category}</p>
          </div>
          <div className="flex space-x-2">
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
                        <Label className="text-sm font-medium mb-3 block">Veri Alanları</Label>
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
            <h2 className="text-2xl font-bold text-gray-900">Grafik Görünümü</h2>
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
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
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
    response_type: 'Her İkisi',
    data_fields: []
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
      response_type: 'Her İkisi',
      data_fields: []
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
        chart_type: formData.chart_type || null,
        response_type: formData.response_type || 'Her İkisi'
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
      response_type: question.response_type || 'Her İkisi',
      data_fields: question.data_fields || []
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
          <h2 className="text-2xl font-bold text-gray-900">Soru Ekle Yönetimi</h2>
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

              <div>
                <Label htmlFor="response_type">Cevap Türü</Label>
                <Select onValueChange={(value) => handleSelectChange('response_type', value)} value={formData.response_type || 'Her İkisi'}>
                  <SelectTrigger data-testid="response-type-select">
                    <SelectValue placeholder="Cevap türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sadece Sayısal">Sadece Sayısal</SelectItem>
                    <SelectItem value="Sadece Sözel">Sadece Sözel</SelectItem>
                    <SelectItem value="Her İkisi">Her İkisi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Çoklu Veri Alanları - Sadece Sayısal sorular için */}
              {formData.response_type === 'Sadece Sayısal' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Veri Alanları</Label>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newField = {
                          id: Date.now().toString(),
                          name: '',
                          field_type: 'number',
                          unit: '',
                          required: true,
                          order: formData.data_fields.length
                        };
                        setFormData({
                          ...formData,
                          data_fields: [...formData.data_fields, newField]
                        });
                      }}
                    >
                      + Alan Ekle
                    </Button>
                  </div>
                  
                  {formData.data_fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Alan {index + 1}</span>
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              data_fields: formData.data_fields.filter(f => f.id !== field.id)
                            });
                          }}
                        >
                          Sil
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Alan Adı</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => {
                              const updatedFields = formData.data_fields.map(f => 
                                f.id === field.id ? {...f, name: e.target.value} : f
                              );
                              setFormData({...formData, data_fields: updatedFields});
                            }}
                            placeholder="örn: Erkek Sayısı"
                          />
                        </div>
                        
                        <div>
                          <Label>Birim</Label>
                          <Input
                            value={field.unit}
                            onChange={(e) => {
                              const updatedFields = formData.data_fields.map(f => 
                                f.id === field.id ? {...f, unit: e.target.value} : f
                              );
                              setFormData({...formData, data_fields: updatedFields});
                            }}
                            placeholder="örn: kişi, %, TL"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {formData.data_fields.length === 0 && (
                    <div className="text-center py-4 text-gray-500 border-2 border-dashed rounded-lg">
                      Veri alanı eklemek için "Alan Ekle" butonuna tıklayın
                      <br />
                      <span className="text-xs">Örnek: "Erkek Sayısı (kişi)", "Kadın Sayısı (kişi)"</span>
                    </div>
                  )}
                </div>
              )}

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
                  <TableHead>Cevap Türü</TableHead>
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          question.response_type === 'Sadece Sayısal' ? 'bg-blue-100 text-blue-800' :
                          question.response_type === 'Sadece Sözel' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {question.response_type || 'Her İkisi'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
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
          <h2 className="text-2xl font-bold text-gray-900">Personel Yönetimi</h2>
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
                        <div className="flex space-x-2">
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
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
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
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
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
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
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

  if (currentView === 'responses') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
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
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
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
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
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
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
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
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dijital Dönüşüm</h1>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Navigation Cards */}
        <div className="space-y-4 max-w-md">
          
          {/* Program Sabitleri Card */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
            <CardContent className="p-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="p-6 flex items-center justify-between w-full">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Program Sabitleri</h3>
                        <p className="text-sm text-gray-600">Sistem ayarları ve veri yönetimi</p>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem 
                    onClick={() => {
                      setConstantsType('category');
                      setCurrentView('constants');
                    }}
                    data-testid="category-constants-menu"
                    className="p-3"
                  >
                    <FileQuestion className="w-4 h-4 mr-3" />
                    Soru Kategorisi Ekle
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setConstantsType('department');
                      setCurrentView('constants');
                    }}
                    data-testid="department-constants-menu"
                    className="p-3"
                  >
                    <Users className="w-4 h-4 mr-3" />
                    Departman Ekle
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setCurrentView('employees')}
                    data-testid="manage-employees-menu"
                    className="p-3"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Kişi Ekle
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setCurrentView('questions')}
                    data-testid="question-bank-menu"
                    className="p-3"
                  >
                    <FileQuestion className="w-4 h-4 mr-3" />
                    Soru Ekle
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          {/* Soruları Paylaş Card */}
          <Card 
            className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => setCurrentView('share')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Share className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Soruları Paylaş</h3>
                  <p className="text-sm text-gray-600">Çalışanlara soru ataması ve e-posta gönderimi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cevap Durumu Card */}
          <Card 
            className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => setCurrentView('status')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cevap Durumu</h3>
                  <p className="text-sm text-gray-600">Tüm sorular ve yanıt durumu takibi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cevaplar Card */}
          <Card 
            className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => setCurrentView('responses')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cevaplar</h3>
                  <p className="text-sm text-gray-600">Sayısal değerler, yorumlar ve AI analizi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gönderilen E-postalar Card */}
          <Card 
            className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => setCurrentView('emails')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Gönderilen E-postalar</h3>
                  <p className="text-sm text-gray-600">E-posta logları ve yanıt durumu takibi</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
  
  // Bulk responses data (2025 Sep - 2030 Dec)
  const [bulkResponses, setBulkResponses] = useState({});
  
  // Generate all months from 2025 Sep to 2030 Dec
  const generateMonthsTable = () => {
    const months = [];
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    for (let year = 2025; year <= 2030; year++) {
      const startMonth = year === 2025 ? 8 : 0; // Sep = 8 (0-indexed)
      const endMonth = year === 2030 ? 11 : 11; // Dec = 11
      
      for (let month = startMonth; month <= endMonth; month++) {
        months.push({
          year,
          month: month + 1, // Convert to 1-indexed
          monthName: monthNames[month],
          key: `${year}-${month + 1}`
        });
      }
    }
    return months;
  };
  
  const [monthsData] = useState(generateMonthsTable());

  useEffect(() => {
    if (assignmentId) {
      fetchQuestionData();
    }
  }, [assignmentId]);

  const fetchQuestionData = async () => {
    try {
      const response = await axios.get(`${API}/public/question-form/${assignmentId}`);
      setQuestionData(response.data);
      
      // Initialize bulk responses structure
      const initialResponses = {};
      monthsData.forEach(month => {
        initialResponses[month.key] = {
          year: month.year,
          month: month.month,
          numerical_value: '',
          data_values: {},
          employee_comment: ''
        };
      });
      setBulkResponses(initialResponses);
      
      if (response.data.already_responded) {
        setSubmitted(true);
      }
    } catch (error) {
      setError('Soru yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    // Filter and prepare responses with data
    const responsesToSubmit = [];
    
    Object.entries(bulkResponses).forEach(([key, responseData]) => {
      const hasNumericalData = responseData.numerical_value || 
        (responseData.data_values && Object.values(responseData.data_values).some(v => v));
      const hasComment = responseData.employee_comment && responseData.employee_comment.trim();
      
      if (hasNumericalData || hasComment) {
        responsesToSubmit.push({
          question_id: questionData.question.id,
          employee_id: questionData.employee.id,
          year: responseData.year,
          month: responseData.month,
          numerical_value: responseData.numerical_value ? parseFloat(responseData.numerical_value) : null,
          data_values: responseData.data_values || {},
          employee_comment: responseData.employee_comment || null
        });
      }
    });

    if (responsesToSubmit.length === 0) {
      setError('Lütfen en az bir aya veri girişi yapın');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API}/monthly-responses/bulk`, responsesToSubmit);
      setSuccess(`${responsesToSubmit.length} aylık veri başarıyla kaydedildi ve AI yorumları oluşturuldu!`);
      setSubmitted(true);
    } catch (error) {
      setError(error.response?.data?.detail || 'Veriler gönderilirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const updateResponseData = (monthKey, field, value) => {
    setBulkResponses(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        [field]: value
      }
    }));
  };

  const updateDataValue = (monthKey, fieldId, value) => {
    setBulkResponses(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        data_values: {
          ...prev[monthKey].data_values,
          [fieldId]: value
        }
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Teşekkürler!</h2>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Hata</h2>
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
              {questionData?.year} {questionData?.month}. Ay Değerlendirmesi
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

                {/* 5+ Year Monthly Data Table */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      2025 Eylül - 2030 Aralık Dönem Verileri
                    </h3>
                    <span className="text-sm text-gray-500">
                      {Object.values(bulkResponses).filter(r => r.numerical_value || Object.values(r.data_values || {}).some(v => v) || r.employee_comment.trim()).length} / {monthsData.length} ay dolduruldu
                    </span>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Yıl</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Ay</th>
                            
                            {/* Dynamic headers based on question type */}
                            {questionData.question.data_fields && questionData.question.data_fields.length > 0 ? (
                              questionData.question.data_fields.map(field => (
                                <th key={field.id} className="px-3 py-2 text-left font-medium text-gray-900">
                                  {field.name} {field.unit && `(${field.unit})`}
                                </th>
                              ))
                            ) : (
                              questionData.question.response_type === 'Sadece Sayısal' || questionData.question.response_type === 'Her İkisi' ? (
                                <th className="px-3 py-2 text-left font-medium text-gray-900">Sayısal Değer</th>
                              ) : null
                            )}
                            
                            {(questionData.question.response_type === 'Sadece Sözel' || questionData.question.response_type === 'Her İkisi') && (
                              <th className="px-3 py-2 text-left font-medium text-gray-900">Yorum</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {monthsData.map(month => (
                            <tr key={month.key} className="border-t hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{month.year}</td>
                              <td className="px-3 py-2">{month.monthName}</td>
                              
                              {/* Dynamic data fields */}
                              {questionData.question.data_fields && questionData.question.data_fields.length > 0 ? (
                                questionData.question.data_fields.map(field => (
                                  <td key={field.id} className="px-3 py-2">
                                    <Input
                                      type="number"
                                      step="any"
                                      value={bulkResponses[month.key]?.data_values?.[field.id] || ''}
                                      onChange={(e) => updateDataValue(month.key, field.id, e.target.value)}
                                      placeholder="0"
                                      className="w-20 h-8 text-sm"
                                    />
                                  </td>
                                ))
                              ) : (
                                (questionData.question.response_type === 'Sadece Sayısal' || questionData.question.response_type === 'Her İkisi') && (
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      step="any"
                                      value={bulkResponses[month.key]?.numerical_value || ''}
                                      onChange={(e) => updateResponseData(month.key, 'numerical_value', e.target.value)}
                                      placeholder="0"
                                      className="w-20 h-8 text-sm"
                                    />
                                  </td>
                                )
                              )}
                              
                              {/* Comment field */}
                              {(questionData.question.response_type === 'Sadece Sözel' || questionData.question.response_type === 'Her İkisi') && (
                                <td className="px-3 py-2">
                                  <Input
                                    value={bulkResponses[month.key]?.employee_comment || ''}
                                    onChange={(e) => updateResponseData(month.key, 'employee_comment', e.target.value)}
                                    placeholder="Yorum yazın..."
                                    className="w-40 h-8 text-sm"
                                  />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    💡 İpucu: Sadece veri girdiğiniz aylar kaydedilecektir. Boş bıraktığınız aylar göz ardı edilir.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleBulkSubmit}
                    disabled={submitting}
                    className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 px-8 py-2.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      'Tüm Verileri Gönder'
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

// Main App Component
function App() {
  // Check if this is a public question response page
  const isPublicAnswerPage = window.location.pathname.startsWith('/answer/');
  
  if (isPublicAnswerPage) {
    return (
      <div className="App">
        <PublicQuestionResponse />
      </div>
    );
  }

  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/answer/:assignmentId" element={<PublicQuestionResponse />} />
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
      </AuthProvider>
    </div>
  );
}

export default App;