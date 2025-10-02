import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Calendar, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AuthModal() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    dateOfBirth: '',
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register({
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          dateOfBirth: formData.dateOfBirth || undefined,
          phoneNumber: formData.phoneNumber || undefined,
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
              <Zap size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              WellnessHub
            </h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {isLogin ? 'Welcome back!' : 'Join WellnessHub'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {isLogin 
              ? 'Sign in to continue your wellness journey' 
              : 'Start your journey to better health, wealth, and happiness'
            }
          </p>
        </div>

        {/* Auth Form */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Registration fields */}
            {!isLogin && (
              <>
                <div>
                  <label className="form-label">
                    <User size={16} className="inline mr-2" />
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Choose a username"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Last name"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email field */}
            <div>
              <label className="form-label">
                <Mail size={16} className="inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your email"
              />
            </div>

            {/* Password field */}
            <div>
              <label className="form-label">
                <Lock size={16} className="inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Additional fields (register only) */}
            {!isLogin && (
              <>
                <div>
                  <label className="form-label">
                    <Calendar size={16} className="inline mr-2" />
                    Date of Birth (Optional)
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                
                <div>
                  <label className="form-label">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle between login/register */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ 
                    username: '',
                    firstName: '',
                    lastName: '',
                    email: '', 
                    password: '', 
                    dateOfBirth: '', 
                    phoneNumber: ''
                  });
                }}
                className="text-primary-500 hover:text-primary-600 font-medium"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2">
            Demo Credentials:
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-500 text-center space-y-1">
            <div>Email: demo@wellnesshub.app</div>
            <div>Password: Demo123!</div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 text-center space-y-1 mt-2">
            <div>OR</div>
            <div>Email: admin@wellnesshub.app</div>
            <div>Password: Admin123!</div>
          </div>
        </div>
      </div>
    </div>
  );
}