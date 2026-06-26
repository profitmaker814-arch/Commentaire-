export interface YTVideo {
  id: string;
  channelId?: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  commentCount: number;
  isShort?: boolean;
  ownerId?: string;
  createdAt?: any;
}

export interface YTComment {
  id: string;
  channelId?: string;
  videoId: string;
  videoTitle?: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  publishedAt: string;
  likeCount: number;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'question' | 'spam';
  category?: 'Question' | 'Félicitation' | 'Critique' | 'Spam' | 'Autre' | 'Urgent';
  language?: string;
  translation?: string;
  replyDraft?: string;
  isReplied: boolean;
  replyText?: string;
  replyPublishedAt?: string;
  tags: string[];
  notes?: string;
  ownerId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface YTChannel {
  id: string;
  name: string;
  avatar: string;
  subscriberCount: number;
  ownerId?: string;
  createdAt?: any;
}
