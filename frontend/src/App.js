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
import { Loader2, User, Lock, Mail, BarChart3, Users, Activity, Plus, Edit, Trash2, Phone, Calendar, DollarSign } from "lucide-react";

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

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
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
      isAuthenticated: !!user 
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
    department: '',
    age: '',
    gender: '',
    hire_date: '',
    birth_date: '',
    salary: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

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
                  <Label htmlFor="department">Departman</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    placeholder="IT, İK, Muhasebe..."
                    data-testid="department-input"
                  />
                </div>
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
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
                  <h1 className="text-xl font-bold text-gray-900">Personel Yönetimi</h1>
                  <p className="text-sm text-gray-600">Çalışan bilgilerini yönetin</p>
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
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Hoş geldiniz, {user?.username}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {stats?.stats?.total_users || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Durum Kontrolleri</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats?.stats?.total_status_checks || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Üye Olma Tarihi</p>
                  <p className="text-lg font-semibold text-teal-600">
                    {stats?.stats?.user_since || 'Bilinmiyor'}
                  </p>
                </div>
                <User className="w-8 h-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {stats?.message || `Hoş geldiniz ${user?.username}!`}
            </h2>
            <p className="text-gray-600 mb-6">
              Dashboard'unuz başarıyla yüklendi. Buraya yeni özellikler ekleyebilirsiniz.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700">
                Yeni Özellik Ekle
              </Button>
              <Button variant="outline">
                Ayarları Görüntüle
              </Button>
            </div>
          </CardContent>
        </Card>
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

// Main App Component
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
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