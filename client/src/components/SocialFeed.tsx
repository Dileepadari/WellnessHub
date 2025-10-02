import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Trophy,
  Target,
  Users,
  Camera,
  MapPin,
  Clock,
  Award,
  Flame,
  TrendingUp,
  MoreHorizontal,
  Send,
  Image as ImageIcon,
  Video,
  Smile,
} from 'lucide-react';
import { useCommunityPosts, useCreatePost, useLikePost, useCommentOnPost } from '../hooks/useApi';

interface Post {
  _id: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
    level: number;
    badges: string[];
  };
  content: string;
  type: 'achievement' | 'challenge' | 'milestone' | 'social' | 'tip';
  attachments?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }[];
  achievement?: {
    name: string;
    badge: string;
    points: number;
  };
  challenge?: {
    name: string;
    progress: number;
    total: number;
  };
  location?: string;
  likes: string[];
  comments: {
    _id: string;
    author: {
      name: string;
      avatar?: string;
    };
    content: string;
    createdAt: string;
  }[];
  shares: number;
  createdAt: string;
  isLiked?: boolean;
  isFollowing?: boolean;
}

const mockPosts: Post[] = [
  {
    _id: '1',
    author: {
      _id: '1',
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b67b1ea4?w=100&h=100&fit=crop&crop=face',
      level: 8,
      badges: ['streak_master', 'fitness_guru'],
    },
    content: "Just completed my 7-day step challenge! 🎉 Walking 10,000 steps daily has become such a healthy habit. Who's joining me for the next challenge?",
    type: 'achievement',
    achievement: {
      name: 'Step Champion',
      badge: 'steps_champion',
      points: 500,
    },
    attachments: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop',
      }
    ],
    location: 'Central Park, NYC',
    likes: ['2', '3', '4', '5'],
    comments: [
      {
        _id: '1',
        author: { name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face' },
        content: 'Congrats! That\'s amazing dedication 👏',
        createdAt: '2024-01-15T10:30:00Z',
      },
      {
        _id: '2',
        author: { name: 'Emily Davis' },
        content: 'I\'m in for the next challenge! Let\'s do this 💪',
        createdAt: '2024-01-15T11:15:00Z',
      }
    ],
    shares: 12,
    createdAt: '2024-01-15T09:00:00Z',
    isLiked: true,
    isFollowing: false,
  },
  {
    _id: '2',
    author: {
      _id: '2',
      name: 'Alex Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      level: 12,
      badges: ['savings_star', 'budget_pro', 'community_leader'],
    },
    content: "Milestone achieved! 💰 Just hit my $1000 savings goal for this quarter. Small consistent steps really add up. Here's my simple strategy that worked...",
    type: 'milestone',
    challenge: {
      name: 'Quarterly Savings Goal',
      progress: 1000,
      total: 1000,
    },
    likes: ['1', '3', '6', '7', '8'],
    comments: [
      {
        _id: '3',
        author: { name: 'Lisa Wang' },
        content: 'Please share your strategy! I need help with saving 🙏',
        createdAt: '2024-01-15T14:20:00Z',
      }
    ],
    shares: 8,
    createdAt: '2024-01-15T13:45:00Z',
    isLiked: false,
    isFollowing: true,
  },
  {
    _id: '3',
    author: {
      _id: '3',
      name: 'Maria Garcia',
      level: 6,
      badges: ['hydration_hero'],
    },
    content: "Pro tip Tuesday! 💡 Set reminders every 2 hours to drink water. I use the WellnessHub water tracker and it's been a game-changer for my hydration goals!",
    type: 'tip',
    likes: ['1', '2', '4'],
    comments: [],
    shares: 15,
    createdAt: '2024-01-15T16:00:00Z',
    isLiked: true,
    isFollowing: false,
  },
];

export function SocialFeed() {
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [newPostContent, setNewPostContent] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<{ [key: string]: string }>({});

  const { data: communityPosts } = useCommunityPosts();
  const createPostMutation = useCreatePost();
  const likePostMutation = useLikePost();
  const commentMutation = useCommentOnPost();

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    
    setIsCreatingPost(true);
    try {
      // In real app, this would call the API
      const newPost: Post = {
        _id: Date.now().toString(),
        author: {
          _id: 'current_user',
          name: 'You',
          level: 5,
          badges: ['beginner'],
        },
        content: newPostContent,
        type: 'social',
        likes: [],
        comments: [],
        shares: 0,
        createdAt: new Date().toISOString(),
        isLiked: false,
      };
      
      setPosts([newPost, ...posts]);
      setNewPostContent('');
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleLikePost = (postId: string) => {
    setPosts(posts.map(post => {
      if (post._id === postId) {
        const isCurrentlyLiked = post.isLiked;
        return {
          ...post,
          isLiked: !isCurrentlyLiked,
          likes: isCurrentlyLiked 
            ? post.likes.filter(id => id !== 'current_user')
            : [...post.likes, 'current_user']
        };
      }
      return post;
    }));
  };

  const handleAddComment = (postId: string) => {
    const comment = commentInput[postId];
    if (!comment?.trim()) return;

    setPosts(posts.map(post => {
      if (post._id === postId) {
        const newComment = {
          _id: Date.now().toString(),
          author: { name: 'You' },
          content: comment,
          createdAt: new Date().toISOString(),
        };
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    }));

    setCommentInput({ ...commentInput, [postId]: '' });
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'achievement': return Trophy;
      case 'challenge': return Target;
      case 'milestone': return Award;
      case 'tip': return TrendingUp;
      default: return MessageCircle;
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'achievement': return 'text-yellow-500';
      case 'challenge': return 'text-blue-500';
      case 'milestone': return 'text-purple-500';
      case 'tip': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
            Y
          </div>
          <div className="flex-1">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share your wellness journey, tips, or achievements..."
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
            />
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                  <ImageIcon size={20} />
                </button>
                <button className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                  <Video size={20} />
                </button>
                <button className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                  <MapPin size={20} />
                </button>
                <button className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                  <Smile size={20} />
                </button>
              </div>
              
              <button
                onClick={handleCreatePost}
                disabled={isCreatingPost || !newPostContent.trim()}
                className="btn-primary px-6 disabled:opacity-50"
              >
                {isCreatingPost ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      {posts.map((post) => {
        const PostTypeIcon = getPostTypeIcon(post.type);
        const isCommentsOpen = showComments === post._id;
        
        return (
          <div key={post._id} className="card overflow-hidden">
            {/* Post Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {post.author.avatar ? (
                    <img
                      src={post.author.avatar}
                      alt={post.author.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
                      {post.author.name.charAt(0)}
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {post.author.name}
                      </h3>
                      <span className="text-sm text-primary-500 font-medium">
                        Lv. {post.author.level}
                      </span>
                      {post.author.badges.includes('community_leader') && (
                        <Award size={16} className="text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <PostTypeIcon size={14} className={getPostTypeColor(post.type)} />
                      <span>{getTimeAgo(post.createdAt)}</span>
                      {post.location && (
                        <>
                          <span>•</span>
                          <MapPin size={12} />
                          <span>{post.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!post.isFollowing && (
                    <button className="btn-outline btn-sm">Follow</button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Achievement/Challenge Banner */}
            {(post.achievement || post.challenge) && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 border-b border-gray-100 dark:border-gray-800">
                {post.achievement && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500 rounded-lg text-white">
                      <Trophy size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Achievement Unlocked: {post.achievement.name}
                      </h4>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300">
                        +{post.achievement.points} points earned
                      </p>
                    </div>
                  </div>
                )}
                
                {post.challenge && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg text-white">
                      <Target size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                        Challenge Progress: {post.challenge.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${(post.challenge.progress / post.challenge.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-blue-600 dark:text-blue-300">
                          {post.challenge.progress}/{post.challenge.total}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Post Content */}
            <div className="p-4">
              <p className="text-gray-900 dark:text-white mb-4 leading-relaxed">
                {post.content}
              </p>

              {/* Post Attachments */}
              {post.attachments && post.attachments.length > 0 && (
                <div className="mb-4">
                  {post.attachments.map((attachment, index) => (
                    <div key={index} className="rounded-lg overflow-hidden">
                      {attachment.type === 'image' && (
                        <img
                          src={attachment.url}
                          alt="Post attachment"
                          className="w-full max-h-96 object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => handleLikePost(post._id)}
                    className={`flex items-center gap-2 transition-colors ${
                      post.isLiked 
                        ? 'text-red-500 hover:text-red-600' 
                        : 'text-gray-500 hover:text-red-500'
                    }`}
                  >
                    <Heart size={20} className={post.isLiked ? 'fill-current' : ''} />
                    <span className="text-sm font-medium">{post.likes.length}</span>
                  </button>
                  
                  <button
                    onClick={() => setShowComments(isCommentsOpen ? null : post._id)}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
                  >
                    <MessageCircle size={20} />
                    <span className="text-sm font-medium">{post.comments.length}</span>
                  </button>
                  
                  <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors">
                    <Share2 size={20} />
                    <span className="text-sm font-medium">{post.shares}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {post.likes.slice(0, 3).map((likeId, index) => (
                    <div
                      key={likeId}
                      className="w-6 h-6 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full border-2 border-white dark:border-gray-800 -ml-1 first:ml-0"
                    />
                  ))}
                  {post.likes.length > 3 && (
                    <span className="text-sm text-gray-500 ml-1">
                      +{post.likes.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              {isCommentsOpen && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  {/* Existing Comments */}
                  <div className="space-y-3 mb-4">
                    {post.comments.map((comment) => (
                      <div key={comment._id} className="flex gap-3">
                        {comment.author.avatar ? (
                          <img
                            src={comment.author.avatar}
                            alt={comment.author.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {comment.author.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                              {comment.author.name}
                            </h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                              {comment.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{getTimeAgo(comment.createdAt)}</span>
                            <button className="hover:text-gray-700 dark:hover:text-gray-300">
                              Like
                            </button>
                            <button className="hover:text-gray-700 dark:hover:text-gray-300">
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      Y
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={commentInput[post._id] || ''}
                        onChange={(e) => setCommentInput({ ...commentInput, [post._id]: e.target.value })}
                        placeholder="Write a comment..."
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post._id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(post._id)}
                        className="btn-primary px-3 py-2"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}