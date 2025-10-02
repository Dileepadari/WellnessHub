import React, { useState } from 'react';
import {
  User,
  Settings,
  Award,
  Target,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Edit3,
  Camera,
  Save,
  X,
  Trophy,
  Star,
  TrendingUp,
  Users,
  Heart,
  DollarSign,
  Activity,
  Shield,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Share2,
  Moon,
  Sun,
  Globe,
  Smartphone,
} from 'lucide-react';
import { useUserStats } from '../hooks/useApi';
import { useTheme } from '../contexts/ThemeContext';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate: string;
  level: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    publicProfile: boolean;
    showEmail: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  stats: {
    challengesCompleted: number;
    achievementsUnlocked: number;
    friendsCount: number;
    postsCount: number;
  };
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'health' | 'wealth' | 'social' | 'general';
  unlockedAt: string;
  points: number;
}

const mockProfile: UserProfile = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@email.com',
  phone: '+1 (555) 123-4567',
  avatar: 'https://images.unsplash.com/photo-1494790108755-2616b67b1ea4?w=200&h=200&fit=crop&crop=face',
  bio: 'Wellness enthusiast passionate about helping others achieve their health and financial goals. Love hiking, reading, and community building! 🌟',
  location: 'San Francisco, CA',
  joinedDate: '2023-06-15',
  level: 12,
  totalPoints: 4850,
  currentStreak: 23,
  longestStreak: 45,
  badges: ['streak_master', 'community_leader', 'fitness_guru', 'savings_star'],
  preferences: {
    emailNotifications: true,
    pushNotifications: true,
    publicProfile: true,
    showEmail: false,
    theme: 'system',
    language: 'en',
  },
  stats: {
    challengesCompleted: 28,
    achievementsUnlocked: 15,
    friendsCount: 142,
    postsCount: 67,
  },
};

const mockAchievements: Achievement[] = [
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first challenge',
    icon: '👟',
    rarity: 'common',
    category: 'general',
    unlockedAt: '2023-06-20',
    points: 100,
  },
  {
    id: '2',
    name: 'Hydration Hero',
    description: 'Drink 8 glasses of water daily for 7 days',
    icon: '💧',
    rarity: 'rare',
    category: 'health',
    unlockedAt: '2023-07-15',
    points: 250,
  },
  {
    id: '3',
    name: 'Savings Superstar',
    description: 'Save $1000 in emergency fund',
    icon: '⭐',
    rarity: 'epic',
    category: 'wealth',
    unlockedAt: '2023-09-10',
    points: 500,
  },
  {
    id: '4',
    name: 'Community Champion',
    description: 'Help 50 community members',
    icon: '👑',
    rarity: 'legendary',
    category: 'social',
    unlockedAt: '2023-12-01',
    points: 1000,
  },
];

export function Profile() {
  const [profile, setProfile] = useState<UserProfile>(mockProfile);
  const [achievements] = useState<Achievement[]>(mockAchievements);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'settings'>('overview');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [editForm, setEditForm] = useState({
    name: profile.name,
    bio: profile.bio || '',
    location: profile.location || '',
    phone: profile.phone || '',
  });

  const { theme, setTheme } = useTheme();
  const { data: userStats } = useUserStats();

  const handleSaveProfile = async () => {
    try {
      setProfile({
        ...profile,
        ...editForm,
      });
      setIsEditing(false);
      // In real app: await API call to update profile
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        [key]: value,
      },
    });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-400';
      case 'epic': return 'border-purple-400';
      case 'rare': return 'border-blue-400';
      default: return 'border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'health': return Heart;
      case 'wealth': return DollarSign;
      case 'social': return Users;
      default: return Star;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="card overflow-hidden">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-primary-500 via-purple-500 to-secondary-500 relative">
          <button className="absolute top-4 right-4 p-2 bg-black bg-opacity-20 rounded-lg text-white hover:bg-opacity-30 transition-colors">
            <Camera size={16} />
          </button>
        </div>

        {/* Profile Info */}
        <div className="p-6 -mt-16 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Avatar */}
            <div className="relative">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white text-4xl font-bold">
                  {profile.name.charAt(0)}
                </div>
              )}
              <button className="absolute bottom-2 right-2 p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors">
                <Camera size={14} />
              </button>
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile.name}
                  </h1>
                  <div className="flex items-center gap-4 mt-2 text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Trophy className="text-yellow-500" size={16} />
                      Level {profile.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="text-primary-500" size={16} />
                      {profile.totalPoints.toLocaleString()} points
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={16} />
                      Joined {formatDate(profile.joinedDate)}
                    </span>
                  </div>
                  {profile.location && (
                    <div className="flex items-center gap-1 mt-1 text-gray-500 dark:text-gray-400">
                      <MapPin size={14} />
                      <span className="text-sm">{profile.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4 md:mt-0">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn-outline"
                  >
                    <Edit3 size={16} />
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </button>
                  <button className="btn-primary">
                    <Share2 size={16} />
                    Share Profile
                  </button>
                </div>
              </div>

              {profile.bio && (
                <p className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Challenges', value: profile.stats.challengesCompleted, icon: Target, color: 'text-blue-500' },
          { label: 'Achievements', value: profile.stats.achievementsUnlocked, icon: Award, color: 'text-yellow-500' },
          { label: 'Friends', value: profile.stats.friendsCount, icon: Users, color: 'text-green-500' },
          { label: 'Posts', value: profile.stats.postsCount, icon: Activity, color: 'text-purple-500' },
        ].map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="card p-4 text-center">
              <IconComponent size={24} className={`${stat.color} mx-auto mb-2`} />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'achievements', label: 'Achievements', icon: Award },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <IconComponent size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={3}
                      className="input-field resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="input-field"
                        placeholder="City, Country"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="input-field"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button onClick={handleSaveProfile} className="btn-primary">
                      <Save size={16} />
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn-outline"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="text-gray-400" size={16} />
                        <span className="text-gray-700 dark:text-gray-300">{profile.email}</span>
                      </div>
                      {profile.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="text-gray-400" size={16} />
                          <span className="text-gray-700 dark:text-gray-300">{profile.phone}</span>
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex items-center gap-3">
                          <MapPin className="text-gray-400" size={16} />
                          <span className="text-gray-700 dark:text-gray-300">{profile.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Activity Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Current Streak</span>
                        <div className="flex items-center gap-1 text-orange-500 font-medium">
                          <span>{profile.currentStreak} days</span>
                          <Activity size={16} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Longest Streak</span>
                        <div className="flex items-center gap-1 text-green-500 font-medium">
                          <span>{profile.longestStreak} days</span>
                          <TrendingUp size={16} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Points</span>
                        <div className="flex items-center gap-1 text-primary-500 font-medium">
                          <span>{profile.totalPoints.toLocaleString()}</span>
                          <Star size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Achievements ({achievements.length})
                </h3>
                <button className="btn-outline btn-sm">
                  <Download size={14} />
                  Export
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement) => {
                  const CategoryIcon = getCategoryIcon(achievement.category);
                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-lg border-2 ${getRarityBorder(achievement.rarity)} bg-gradient-to-br ${getRarityColor(achievement.rarity)} bg-opacity-10 hover:shadow-lg transition-shadow`}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-3">{achievement.icon}</div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {achievement.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {achievement.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <CategoryIcon size={12} />
                            <span className="capitalize text-gray-500">
                              {achievement.category}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full capitalize font-medium ${
                            achievement.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            achievement.rarity === 'epic' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                            achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {achievement.rarity}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-gray-500">
                            {formatDate(achievement.unlockedAt)}
                          </span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            +{achievement.points} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Notifications */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Bell size={20} />
                  Notifications
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Receive updates about challenges and achievements
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.preferences.emailNotifications}
                        onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Push Notifications</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Get notified about new challenges and friend activity
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.preferences.pushNotifications}
                        onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Privacy */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield size={20} />
                  Privacy
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Public Profile</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Allow others to view your profile and achievements
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.preferences.publicProfile}
                        onChange={(e) => handlePreferenceChange('publicProfile', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Show Email</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Display your email address on your public profile
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.preferences.showEmail}
                        onChange={(e) => handlePreferenceChange('showEmail', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Eye size={20} />
                  Appearance
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Theme</h4>
                    <div className="flex items-center gap-4">
                      {[
                        { value: 'light', label: 'Light', icon: Sun },
                        { value: 'dark', label: 'Dark', icon: Moon },
                        { value: 'system', label: 'System', icon: Smartphone },
                      ].map((themeOption) => {
                        const IconComponent = themeOption.icon;
                        return (
                          <button
                            key={themeOption.value}
                            onClick={() => {
                              setTheme(themeOption.value as any);
                              handlePreferenceChange('theme', themeOption.value);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                              profile.preferences.theme === themeOption.value
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <IconComponent size={16} />
                            {themeOption.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Language</h4>
                    <select
                      value={profile.preferences.language}
                      onChange={(e) => handlePreferenceChange('language', e.target.value)}
                      className="input-field w-48"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Lock size={20} />
                  Security
                </h3>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="btn-outline w-full md:w-auto"
                  >
                    Change Password
                  </button>

                  {showPasswordChange && (
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Password
                        </label>
                        <input type="password" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          New Password
                        </label>
                        <input type="password" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirm New Password
                        </label>
                        <input type="password" className="input-field" />
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="btn-primary">Update Password</button>
                        <button
                          onClick={() => setShowPasswordChange(false)}
                          className="btn-outline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <button className="btn-outline text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 w-full md:w-auto">
                    <Trash2 size={16} />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}