import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut, signInAnonymously } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import {
  Youtube,
  Search,
  MessageSquare,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Ban,
  Clock,
  ThumbsUp,
  BrainCircuit,
  PlusCircle,
  Sparkles,
  Users,
  TrendingUp,
  AlertCircle,
  Send,
  Plus,
  X,
  Languages,
  Bookmark,
  Check,
  Edit3,
  RefreshCw,
  Eye,
  Info,
  SlidersHorizontal,
  Sun,
  Moon,
  Menu,
  ArrowLeft,
  Trash2,
  Star,
  CornerUpLeft,
  Filter,
  Check as CheckIcon,
  Sparkle,
  PlayCircle,
  Music,
  Zap,
  ShieldCheck,
  Brain,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { YTChannel, YTComment, YTVideo } from "./types";

export default function App() {
  // State variables
  const [channels, setChannels] = useState<YTChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<YTChannel | null>(null);
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [comments, setComments] = useState<YTComment[]>([]);
  const [activeComment, setActiveComment] = useState<YTComment | null>(null);
  
  // Custom Starred Comments for a Gmail-inspired experience
  const [starredCommentIds, setStarredCommentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("starredCommentIds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleStar = (commentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setStarredCommentIds(prev => {
      const next = prev.includes(commentId)
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId];
      localStorage.setItem("starredCommentIds", JSON.stringify(next));
      return next;
    });
  };
  
  // API and loading states
  const [aiStatus, setAiStatus] = useState({ hasApiKey: false, loading: false });
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [analyzingCommentId, setAnalyzingCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [publishingReply, setPublishingReply] = useState(false);

  // Filter and Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "replied">("all");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [videoFilter, setVideoFilter] = useState<string>("all");
  const [videoTypeFilter, setVideoTypeFilter] = useState<"all" | "video" | "short">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "likes-desc" | "likes-asc">("newest");

  // Custom Channel Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelCategory, setNewChannelCategory] = useState("Technologie");
  const [syncing, setSyncing] = useState(false);

  // Comment edit state (tags / notes)
  const [editingNotes, setEditingNotes] = useState("");
  const [newTagInput, setNewTagInput] = useState("");

  // New State variables for sentiment analysis features
  const [workspaceTab, setWorkspaceTab] = useState<"moderator" | "sentiment" | "channels">("moderator");
  const [tabDirection, setTabDirection] = useState(1);

  const handleTabChange = (newTab: "moderator" | "sentiment" | "channels") => {
    const tabOrder = ["moderator", "sentiment", "channels"];
    const currentIndex = tabOrder.indexOf(workspaceTab);
    const newIndex = tabOrder.indexOf(newTab);
    if (newIndex > currentIndex) setTabDirection(1);
    else if (newIndex < currentIndex) setTabDirection(-1);
    setWorkspaceTab(newTab);
  };

  const pageVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 50 : -50,
      rotateY: direction > 0 ? 15 : -15,
    }),
    animate: {
      opacity: 1,
      x: 0,
      rotateY: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction < 0 ? 50 : -50,
      rotateY: direction < 0 ? 15 : -15,
      transition: { duration: 0.2, ease: "easeIn" }
    })
  };
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [customVideoOpen, setCustomVideoOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("isDarkMode") === "true";
  });

  const [showFloatingControls, setShowFloatingControls] = useState(true);
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(null);

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Local Demo Mode States (for offline / restricted environments)
  const [demoChannels, setDemoChannels] = useState<YTChannel[]>(() => {
    const saved = localStorage.getItem("demo_channels");
    return saved ? JSON.parse(saved) : [];
  });
  const [demoVideos, setDemoVideos] = useState<YTVideo[]>(() => {
    const saved = localStorage.getItem("demo_videos");
    return saved ? JSON.parse(saved) : [];
  });
  const [demoComments, setDemoComments] = useState<YTComment[]>(() => {
    const saved = localStorage.getItem("demo_comments");
    return saved ? JSON.parse(saved) : [];
  });

  // Automatically persist Demo Mode states
  useEffect(() => {
    localStorage.setItem("demo_channels", JSON.stringify(demoChannels));
  }, [demoChannels]);

  useEffect(() => {
    localStorage.setItem("demo_videos", JSON.stringify(demoVideos));
  }, [demoVideos]);

  useEffect(() => {
    localStorage.setItem("demo_comments", JSON.stringify(demoComments));
  }, [demoComments]);

  // Seed default Demo Data if empty
  useEffect(() => {
    if (demoChannels.length === 0) {
      const initialChannel: YTChannel = {
        id: "demo_channel_default",
        name: "Cuisine Facile de Thomas",
        avatar: "https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=150&auto=format&fit=crop&q=60",
        subscriberCount: 24500,
        ownerId: "demo_user_12345",
        createdAt: null as any
      };
      const initialVideo: YTVideo = {
        id: "demo_video_default",
        channelId: "demo_channel_default",
        title: "La meilleure recette de cookies au chocolat fondants !",
        thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&auto=format&fit=crop&q=60",
        publishedAt: new Date().toISOString(),
        viewCount: 15200,
        commentCount: 4,
        ownerId: "demo_user_12345",
        createdAt: null as any
      };
      const initialComments: YTComment[] = [
        {
          id: "demo_comment_1",
          channelId: "demo_channel_default",
          videoId: "demo_video_default",
          videoTitle: "La meilleure recette de cookies au chocolat fondants !",
          authorName: "Marie Dubois",
          authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60",
          content: "Recette testée ce midi, une vraie merveille ! Mon fils a adoré.",
          publishedAt: new Date(Date.now() - 3600000).toISOString(),
          likeCount: 14,
          sentiment: "positive",
          category: "Félicitation",
          language: "fr",
          isReplied: false,
          tags: ["Recette Validée"],
          notes: "",
          ownerId: "demo_user_12345"
        },
        {
          id: "demo_comment_2",
          channelId: "demo_channel_default",
          videoId: "demo_video_default",
          videoTitle: "La meilleure recette de cookies au chocolat fondants !",
          authorName: "John Smith",
          authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60",
          content: "Can I replace the white sugar with brown sugar? Awesome video!",
          publishedAt: new Date(Date.now() - 7200000).toISOString(),
          likeCount: 3,
          sentiment: "question",
          category: "Question",
          language: "en",
          isReplied: false,
          tags: ["Question Sucre"],
          notes: "Doit répondre au sujet de la substitution de sucre.",
          ownerId: "demo_user_12345"
        },
        {
          id: "demo_comment_3",
          channelId: "demo_channel_default",
          videoId: "demo_video_default",
          videoTitle: "La meilleure recette de cookies au chocolat fondants !",
          authorName: "Lucas Bernard",
          authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60",
          content: "C'est beaucoup trop sucré ! Mauvaise recette pour la santé.",
          publishedAt: new Date(Date.now() - 14400000).toISOString(),
          likeCount: 0,
          sentiment: "negative",
          category: "Critique",
          language: "fr",
          isReplied: false,
          tags: ["Nutrition"],
          notes: "",
          ownerId: "demo_user_12345"
        }
      ];

      setDemoChannels([initialChannel]);
      setDemoVideos([initialVideo]);
      setDemoComments(initialComments);
    }
  }, [demoChannels]);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: any;
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        setUser(prev => (prev && prev.uid.startsWith("demo_")) ? prev : null);
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Persist dark mode preferences
  useEffect(() => {
    localStorage.setItem("isDarkMode", String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Initial Fetch channels
  useEffect(() => {
    if (!user) {
      setChannels([]);
      setLoadingChannels(false);
      return;
    }

    if (user.uid.startsWith("demo_")) {
      setChannels(demoChannels);
      if (demoChannels.length > 0) {
        if (!activeChannel || !demoChannels.some(ch => ch.id === activeChannel.id)) {
          setActiveChannel(demoChannels[0]);
        }
      } else {
        setActiveChannel(null);
      }
      setLoadingChannels(false);
      return;
    }

    setLoadingChannels(true);
    const q = query(collection(db, "channels"), where("ownerId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as YTChannel[];
      setChannels(data);
      if (data.length > 0 && !activeChannel) {
        setActiveChannel(data[0]);
      }
      setLoadingChannels(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "channels"));
    return () => unsub();
  }, [user, demoChannels, activeChannel]);

  // Fetch comments and videos when active channel changes
  useEffect(() => {
    if (!user || !activeChannel) {
      setVideos([]);
      setComments([]);
      return;
    }

    if (user.uid.startsWith("demo_")) {
      const activeVideos = demoVideos.filter(v => v.channelId === activeChannel.id);
      const activeComments = demoComments.filter(c => c.channelId === activeChannel.id);
      setVideos(activeVideos);
      setComments(activeComments);
      if (activeComments.length > 0) {
        if (activeComment && !activeComments.some(co => co.id === activeComment.id)) {
          setActiveComment(null);
        }
      } else {
        setActiveComment(null);
      }
      setLoadingComments(false);
      return;
    }

    setLoadingComments(true);

    const qVideos = query(collection(db, "videos"), where("ownerId", "==", user.uid), where("channelId", "==", activeChannel.id));
    const unsubVideos = onSnapshot(qVideos, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as YTVideo[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "videos"));

    const qComments = query(collection(db, "comments"), where("ownerId", "==", user.uid), where("channelId", "==", activeChannel.id));
    const unsubComments = onSnapshot(qComments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as YTComment[];
      setComments(data);
      if (data.length > 0) {
        if (activeComment && !data.some(co => co.id === activeComment.id)) {
          setActiveComment(null);
        }
      } else {
        setActiveComment(null);
      }
      setLoadingComments(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "comments"));

    return () => {
      unsubVideos();
      unsubComments();
    };
  }, [activeChannel, user, demoVideos, demoComments, activeComment]);

  // Check AI Health
  useEffect(() => {
    checkAiHealth();
  }, []);

  // Sync active comment changes with local notes editing state
  useEffect(() => {
    if (activeComment) {
      setEditingNotes(activeComment.notes || "");
      setReplyText(activeComment.replyText || activeComment.replyDraft || "");
    } else {
      setEditingNotes("");
      setReplyText("");
    }
  }, [activeComment]);

  const checkAiHealth = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setAiStatus({ hasApiKey: data.hasApiKey, loading: false });
    } catch (err) {
      console.error("Health check failed:", err);
    }
  };

  // Global scroll listener with capture phase to detect scroll in any container
  useEffect(() => {
    let lastScrollTop = 0;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || typeof target.scrollTop !== "number" || typeof target.scrollHeight !== "number") return;
      
      const scrollTop = target.scrollTop;
      const maxScroll = target.scrollHeight - target.clientHeight;

      // Force-hide when we are near the bottom to prevent covering the last text elements
      if (scrollTop >= maxScroll - 60 && maxScroll > 80) {
        setShowFloatingControls(false);
      } else if (scrollTop > lastScrollTop && scrollTop > 15) {
        // Scrolling down
        setShowFloatingControls(false);
      } else if (scrollTop < lastScrollTop) {
        // Scrolling up
        setShowFloatingControls(true);
      }
      lastScrollTop = scrollTop;
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  // Reset menu visibility when changing tabs or comments
  useEffect(() => {
    setShowFloatingControls(true);
  }, [workspaceTab, activeComment]);

  // Analyze Comment with Gemini AI
  const analyzeComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    
    setAnalyzingCommentId(commentId);
    try {
      const res = await fetch("/api/comments/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: comment.content,
          authorName: comment.authorName,
          videoTitle: comment.videoTitle
        })
      });
      const data = await res.json();
      if (data.success) {
        const updatePayload: any = {
          sentiment: data.sentiment,
          category: data.category,
        };
        if (data.translation) updatePayload.translation = data.translation;
        if (data.language) updatePayload.language = data.language;
        // Keep the generated reply in local state as a draft (or save to Firestore if needed)
        if (data.replyDraft && activeComment?.id === commentId) {
          setReplyText(data.replyDraft);
        }

        if (user?.uid.startsWith("demo_")) {
          setDemoComments(prev => prev.map(c => c.id === commentId ? { ...c, ...updatePayload } : c));
        } else {
          updatePayload.updatedAt = serverTimestamp();
          await updateDoc(doc(db, "comments", commentId), updatePayload);
        }
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      if (!user?.uid.startsWith("demo_")) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
      }
    } finally {
      setAnalyzingCommentId(null);
    }
  };

  // Translate Comment into Creator's language (French)
  const translateComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    
    setTranslatingCommentId(commentId);
    try {
      const res = await fetch("/api/comments/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: comment.content,
          targetLanguage: "fr" 
        })
      });
      const data = await res.json();
      if (data.success) {
        const updatePayload = {
          translation: data.translation,
          language: data.language
        };

        if (user?.uid.startsWith("demo_")) {
          setDemoComments(prev => prev.map(c => c.id === commentId ? { ...c, ...updatePayload } : c));
        } else {
          await updateDoc(doc(db, "comments", commentId), {
            ...updatePayload,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error("Translation failed:", err);
      if (!user?.uid.startsWith("demo_")) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
      }
    } finally {
      setTranslatingCommentId(null);
    }
  };

  // Post response
  const handleSendReply = async () => {
    if (!activeComment || !replyText.trim()) return;
    setPublishingReply(true);
    try {
      if (user?.uid.startsWith("demo_")) {
        setDemoComments(prev => prev.map(c => c.id === activeComment.id ? { ...c, isReplied: true } : c));
        setReplyText("");
      } else {
        await updateDoc(doc(db, "comments", activeComment.id), {
          isReplied: true,
          updatedAt: serverTimestamp()
        });
        setReplyText("");
      }
    } catch (err) {
      console.error("Failed to reply:", err);
      if (!user?.uid.startsWith("demo_")) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${activeComment.id}`);
      }
    } finally {
      setPublishingReply(false);
    }
  };

  // Update notes/tags on the backend
  const handleUpdateNotes = async () => {
    if (!activeComment) return;
    try {
      if (user?.uid.startsWith("demo_")) {
        setDemoComments(prev => prev.map(c => c.id === activeComment.id ? { ...c, notes: editingNotes } : c));
      } else {
        await updateDoc(doc(db, "comments", activeComment.id), {
          notes: editingNotes,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Failed to save notes:", err);
      if (!user?.uid.startsWith("demo_")) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${activeComment.id}`);
      }
    }
  };

  // Add new Tag local and remote
  const handleAddTag = async () => {
    if (!activeComment || !newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/#/g, "");
    if ((activeComment.tags || []).includes(cleanTag)) {
      setNewTagInput("");
      return;
    }
    const updatedTags = [...(activeComment.tags || []), cleanTag];
    try {
      if (user?.uid.startsWith("demo_")) {
        setDemoComments(prev => prev.map(c => c.id === activeComment.id ? { ...c, tags: updatedTags } : c));
        setNewTagInput("");
      } else {
        await updateDoc(doc(db, "comments", activeComment.id), {
          tags: updatedTags,
          updatedAt: serverTimestamp()
        });
        setNewTagInput("");
      }
    } catch (err) {
      console.error("Failed to save tag:", err);
      if (!user?.uid.startsWith("demo_")) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${activeComment.id}`);
      }
    }
  };

  // Remove Tag
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeComment) return;
    const updatedTags = (activeComment.tags || []).filter(t => t !== tagToRemove);
    try {
      if (user?.uid.startsWith("demo_")) {
        setDemoComments(prev => prev.map(c => c.id === activeComment.id ? { ...c, tags: updatedTags } : c));
      } else {
        await updateDoc(doc(db, "comments", activeComment.id), {
          tags: updatedTags,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Failed to remove tag:", err);
      if (!user?.uid.startsWith("demo_")) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${activeComment.id}`);
      }
    }
  };

  // Import channel & generate mock data with Gemini
  const handleSyncChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !user) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/channels/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName: newChannelName,
          category: newChannelCategory
        })
      });
      const data = await res.json();
      if (data.success) {
        if (user.uid.startsWith("demo_")) {
          // Add to local state
          const newChan: YTChannel = {
            ...data.channel,
            ownerId: user.uid,
            createdAt: new Date().toISOString() as any
          };
          const newVids: YTVideo[] = data.videos.map((v: any) => ({
            ...v,
            ownerId: user.uid,
            createdAt: new Date().toISOString() as any
          }));
          const newComs: YTComment[] = data.comments.map((c: any) => ({
            ...c,
            ownerId: user.uid,
            createdAt: new Date().toISOString() as any,
            updatedAt: new Date().toISOString() as any
          }));

          setDemoChannels(prev => [...prev, newChan]);
          setDemoVideos(prev => [...prev, ...newVids]);
          setDemoComments(prev => [...prev, ...newComs]);

          setActiveChannel(newChan);
          setIsSyncModalOpen(false);
          setNewChannelName("");
          handleTabChange("moderator");
        } else {
          // Write generated data to Firestore
          const batch = writeBatch(db);
          
          // Add ownerId and createdAt to channel
          const newChannel = {
            ...data.channel,
            ownerId: user.uid,
            createdAt: serverTimestamp()
          };
          batch.set(doc(db, "channels", data.channel.id), newChannel);

          // Add ownerId and createdAt to videos
          data.videos.forEach((v: any) => {
            batch.set(doc(db, "videos", v.id), {
              ...v,
              ownerId: user.uid,
              createdAt: serverTimestamp()
            });
          });

          // Add ownerId and createdAt to comments
          data.comments.forEach((c: any) => {
            batch.set(doc(db, "comments", c.id), {
              ...c,
              ownerId: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          });

          await batch.commit();

          setIsSyncModalOpen(false);
          setNewChannelName("");
          handleTabChange("moderator");
        }
      }
    } catch (err) {
      console.error("Failed to sync channel:", err);
      if (!user.uid.startsWith("demo_")) {
        handleFirestoreError(err, OperationType.WRITE, "channels/sync");
      }
    } finally {
      setSyncing(false);
    }
  };

  // Statistics calculation
  const totalCommentsCount = comments.length;
  const pendingCount = comments.filter(c => !c.isReplied).length;
  const repliedCount = comments.filter(c => c.isReplied).length;
  const positiveCount = comments.filter(c => c.sentiment === "positive").length;
  const questionCount = comments.filter(c => c.sentiment === "question").length;
  const criticalCount = comments.filter(c => c.sentiment === "negative").length;
  const spamCount = comments.filter(c => c.sentiment === "spam").length;

  const sentimentPct = totalCommentsCount > 0 
    ? Math.round(((positiveCount + questionCount * 0.5) / totalCommentsCount) * 100) 
    : 100;

  // Video-specific sentiment score and status helper
  const getVideoSentimentStats = (vId: string) => {
    const videoComments = comments.filter(c => c.videoId === vId);
    const total = videoComments.length;
    
    const positive = videoComments.filter(c => c.sentiment === "positive").length;
    const negative = videoComments.filter(c => c.sentiment === "negative").length;
    // Count neutral, question or unanalyzed comments as Neutral
    const neutral = videoComments.filter(c => c.sentiment === "neutral" || c.sentiment === "question" || !c.sentiment).length;
    const spam = videoComments.filter(c => c.sentiment === "spam").length;
    
    const validTotal = total - spam;
    
    // Score from 0 to 100
    const score = validTotal > 0
      ? Math.round(((positive * 100) + (neutral * 50)) / validTotal)
      : 100;
      
    return {
      total,
      positive,
      neutral,
      negative,
      spam,
      validTotal,
      score
    };
  };

  // Bulk Sentiment Analysis logic calling backend
  const handleBulkAnalyzeVideoComments = async (vId: string) => {
    const targetComments = comments.filter(c => vId === "all" ? true : c.videoId === vId);
    const unanalyzed = targetComments.filter(c => !c.sentiment);
    const commentsToAnalyze = unanalyzed.length > 0 ? unanalyzed : targetComments;

    if (commentsToAnalyze.length === 0) return;
    
    setBulkAnalyzing(true);
    try {
      const res = await fetch("/api/comments/bulk-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          comments: commentsToAnalyze.map(c => ({
            id: c.id,
            content: c.content,
            authorName: c.authorName,
            videoTitle: c.videoTitle
          })) 
        })
      });
      const data = await res.json();
      if (data.success) {
        if (user?.uid.startsWith("demo_")) {
          setDemoComments(prev => prev.map(commentItem => {
            const found = data.results.find((r: any) => r.id === commentItem.id);
            if (found) {
              return {
                ...commentItem,
                sentiment: found.sentiment,
                category: found.category,
                updatedAt: new Date().toISOString()
              };
            }
            return commentItem;
          }));
        } else {
          const batch = writeBatch(db);
          data.results.forEach((c: any) => {
            batch.update(doc(db, "comments", c.id), {
              sentiment: c.sentiment,
              category: c.category,
              updatedAt: serverTimestamp()
            });
          });
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("Bulk analysis failed:", err);
      if (!user?.uid.startsWith("demo_")) {
        handleFirestoreError(err, OperationType.UPDATE, "comments");
      }
    } finally {
      setBulkAnalyzing(false);
    }
  };

  // Filtered comments logic for rendering
  const filteredComments = comments.filter((comment) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === "" || 
      comment.authorName.toLowerCase().includes(query) ||
      comment.content.toLowerCase().includes(query) ||
      (comment.notes && comment.notes.toLowerCase().includes(query)) ||
      (comment.tags || []).some(t => t.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "pending" && !comment.isReplied) ||
      (statusFilter === "replied" && comment.isReplied);

    const matchesSentiment = sentimentFilter === "all" || 
      comment.sentiment === sentimentFilter ||
      comment.category?.toLowerCase() === sentimentFilter.toLowerCase();

    const matchesVideo = videoFilter === "all" || comment.videoId === videoFilter;

    // Find if the parent video is a short
    const parentVideo = videos.find(v => v.id === comment.videoId);
    const isShortFormat = parentVideo?.isShort || parentVideo?.title.toLowerCase().includes("short");
    const matchesVideoType = videoTypeFilter === "all" ||
      (videoTypeFilter === "short" && isShortFormat) ||
      (videoTypeFilter === "video" && !isShortFormat);

    const matchesStarred = !showStarredOnly || starredCommentIds.includes(comment.id);

    return matchesSearch && matchesStatus && matchesSentiment && matchesVideo && matchesVideoType && matchesStarred;
  }).sort((a, b) => {
    // First group by video
    if (a.videoId !== b.videoId) {
      return a.videoId.localeCompare(b.videoId);
    }
    // Then sort
    if (sortBy === "newest") {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    } else if (sortBy === "oldest") {
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    } else if (sortBy === "likes-desc") {
      return b.likeCount - a.likeCount;
    } else if (sortBy === "likes-asc") {
      return a.likeCount - b.likeCount;
    }
    return 0;
  });

  const getSentimentBadge = (sentiment?: string, category?: string) => {
    switch (sentiment) {
      case "positive":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#e6f4ea] dark:bg-[#0f3c20] text-[#137333] dark:text-[#81c995] uppercase tracking-wider border border-transparent">
            Félicitation
          </span>
        );
      case "question":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#fef7e0] dark:bg-[#3e2b00] text-[#b06000] dark:text-[#fdd663] uppercase tracking-wider border border-transparent">
            Question
          </span>
        );
      case "negative":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#fce8e6] dark:bg-[#3c1212] text-[#c5221f] dark:text-[#f28b82] uppercase tracking-wider border border-transparent">
            Critique
          </span>
        );
      case "spam":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#f3e8fd] dark:bg-[#28143d] text-[#8430d9] dark:text-[#d7aefb] uppercase tracking-wider border border-transparent">
            Spam
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#f1f3f4] dark:bg-[#202124] text-[#3c4043] dark:text-[#e8eaed] uppercase tracking-wider border border-transparent">
            {category || "Neutre"}
          </span>
        );
    }
  };

  if (authChecking || showSplash) {
    return (
      <div className={`h-screen w-screen flex justify-center items-center ${isDarkMode ? "bg-[#0b0c0e] text-[#e3e2e6]" : "bg-[#f0f4f9] text-[#1f1f1f]"}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-2xl mb-6">
            <MessageSquare size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Commentaire+</h1>
          <motion.div 
            className="w-12 h-1 bg-indigo-500 rounded-full mt-6"
            animate={{ width: ["0%", "100%", "0%"], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`h-screen w-screen flex justify-center items-center ${isDarkMode ? "bg-[#0b0c0e] text-[#e3e2e6]" : "bg-[#f0f4f9] text-[#1f1f1f]"} p-4 md:p-8`}>
        {/* Mock Mobile Device Container */}
        <div className={`w-full max-w-[430px] h-full max-h-[900px] flex flex-col relative overflow-hidden rounded-[44px] border-[10px] shadow-2xl ${isDarkMode ? "bg-[#111318] border-[#2f3136]" : "bg-[#f8f9fa] border-gray-200"}`}>
          <div className="overflow-y-auto flex-1 no-scrollbar pb-12 pt-16 px-6">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center text-center mb-10"
            >
              <div className="w-20 h-20 rounded-[28px] bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-xl mb-6">
                <MessageSquare size={40} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-3">Commentaire+</h1>
              <p className="text-sm opacity-70 leading-relaxed max-w-[280px] mb-4">
                Gérez, analysez et répondez à votre communauté avec l'intelligence artificielle.
              </p>
              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 p-3 rounded-xl max-w-[300px]">
                <p className="text-[10px] leading-tight font-medium">
                  <span className="font-bold uppercase tracking-wider block mb-1">Accès Restreint</span>
                  Cette plateforme professionnelle est conçue exclusivement pour les créateurs de contenu (YouTube & TikTok) souhaitant centraliser, analyser et maîtriser l'engagement de leurs communautés avec précision.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-3 mb-10"
            >
              <div className={`flex items-center gap-4 p-4 rounded-3xl border ${isDarkMode ? "bg-[#1f2128] border-slate-800" : "bg-white border-slate-200"} shadow-sm`}>
                <div className="w-12 h-12 rounded-2xl bg-[#ff0000]/10 flex items-center justify-center text-[#ff0000] shrink-0">
                  <Youtube size={24} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="font-bold text-sm">YouTube Studio</h3>
                  <p className="text-xs opacity-60 truncate">Synchronisation des vidéos et commentaires</p>
                </div>
              </div>
              <div className={`flex items-center gap-4 p-4 rounded-3xl border ${isDarkMode ? "bg-[#1f2128] border-slate-800" : "bg-white border-slate-200"} shadow-sm`}>
                <div className="w-12 h-12 rounded-2xl bg-[#00f2fe]/10 flex items-center justify-center text-[#00f2fe] shrink-0">
                  <Music size={24} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="font-bold text-sm">TikTok</h3>
                  <p className="text-xs opacity-60 truncate">Gérez les interactions de vos TikToks</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-8 space-y-3"
            >
              <button
                onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  {/* Google G Logo simplified */}
                  <span className="text-indigo-600 font-black text-xs">G</span>
                </div>
                Se connecter avec Google
              </button>

              <button
                onClick={async () => {
                  try {
                    await signInAnonymously(auth);
                  } catch (err) {
                    console.warn("Connexion anonyme restreinte ou impossible (auth/admin-restricted-operation). Basculement automatique en Mode Démo local :", err);
                    const mockUser = {
                      uid: "demo_user_12345",
                      email: "demo@example.com",
                      displayName: "Utilisateur Démo",
                      emailVerified: true,
                      isAnonymous: true,
                      providerData: []
                    } as unknown as User;
                    setUser(mockUser);
                    setAuthChecking(false);
                  }
                }}
                className={`w-full py-4 px-6 rounded-2xl border font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                  isDarkMode 
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <Sparkles size={16} className="text-indigo-500" />
                Tester en Mode Démo (Sans compte)
              </button>

              <p className="text-[10px] text-center opacity-65 leading-normal px-2 mt-2">
                ⚠️ Les bloqueurs de popups et les restrictions d'iframe peuvent gêner la connexion Google dans cet aperçu. Utilisez le <b>Mode Démo</b> ou ouvrez l'application dans un nouvel onglet pour vous connecter normalement.
              </p>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <h2 className="font-bold text-sm uppercase tracking-wider opacity-50 mb-2 pl-2">Fonctionnalités IA</h2>
              
              <div className={`p-5 rounded-[28px] ${isDarkMode ? "bg-slate-800/50" : "bg-slate-100/80"} flex flex-col gap-2`}>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center mb-1">
                  <Brain size={20} />
                </div>
                <h3 className="font-bold">Analyse de sentiment</h3>
                <p className="text-xs opacity-70 leading-relaxed">Détection automatique des questions, compliments et critiques pour prioriser vos réponses.</p>
              </div>

              <div className={`p-5 rounded-[28px] ${isDarkMode ? "bg-slate-800/50" : "bg-slate-100/80"} flex flex-col gap-2`}>
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center mb-1">
                  <Languages size={20} />
                </div>
                <h3 className="font-bold">Traduction magique</h3>
                <p className="text-xs opacity-70 leading-relaxed">Traduisez les commentaires étrangers dans votre langue d'un simple clic.</p>
              </div>

              <div className={`p-5 rounded-[28px] ${isDarkMode ? "bg-slate-800/50" : "bg-slate-100/80"} flex flex-col gap-2`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-1">
                  <Zap size={20} />
                </div>
                <h3 className="font-bold">Brouillons générés</h3>
                <p className="text-xs opacity-70 leading-relaxed">Laissez l'IA rédiger des réponses personnalisées et bienveillantes, prêtes à être envoyées.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className={`h-screen w-screen flex ${isDarkMode ? "bg-[#0b0c0e] text-[#e3e2e6]" : "bg-[#f0f4f9] text-[#1f1f1f]"} overflow-hidden font-sans justify-center items-center p-0 md:p-6 transition-colors duration-300`} id="app-container">
      {/* Phone container frame: full screen on mobile, device size on PC */}
      <div
        className={`w-full h-full md:max-w-[430px] md:h-[860px] md:max-h-[95vh] ${isDarkMode ? "bg-[#111318] text-[#e3e2e6] md:border-[#2f3136]" : "bg-white text-[#1f1f1f] md:border-[#2f3136]"} md:rounded-[44px] md:shadow-2xl md:border-[10px] overflow-hidden flex flex-col relative transition-all duration-300`}
        id="phone-container"
      >
        {/* Global Loading Bar */}
        <AnimatePresence>
          {(syncing || bulkAnalyzing || publishingReply || analyzingCommentId || translatingCommentId) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-0 left-0 right-0 h-1 bg-indigo-500/20 z-50 overflow-hidden"
            >
              <motion.div
                className="h-full bg-indigo-500 rounded-full w-1/3"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Floating Gmail-style Search Bar & Detail Action Bar */}
        {workspaceTab === "moderator" && (
          !activeComment ? (
            <div className="px-4 pt-4 pb-2 shrink-0">
              <div className={`h-12 w-full rounded-full shadow-sm border ${
                isDarkMode 
                  ? "bg-[#1f2128] border-slate-800 text-white" 
                  : "bg-[#eaf1fb] border-transparent text-[#1f1f1f]"
              } flex items-center justify-between px-4 gap-2 transition-all hover:shadow-md duration-300`}>
              <div className="flex items-center gap-2.5 flex-1 min-w-0 h-full">
                {/* Gmail Search Input */}
                <div className="flex items-center gap-2 flex-1 min-w-0 h-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher dans les commentaires..."
                    className="w-full bg-transparent border-none outline-none text-xs placeholder-slate-400 font-semibold"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="p-1 rounded-full hover:bg-slate-500/15 text-slate-400 shrink-0 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Quick Sort Cycle Button */}
                <button
                  onClick={() => {
                    const order: Array<"newest" | "oldest" | "likes-desc" | "likes-asc"> = ["newest", "oldest", "likes-desc", "likes-asc"];
                    const currentIdx = order.indexOf(sortBy);
                    const nextIdx = (currentIdx + 1) % order.length;
                    setSortBy(order[nextIdx]);
                  }}
                  className={`px-2 py-1.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                    isDarkMode 
                      ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-700 text-slate-300" 
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                  title={`Trier par : ${
                    sortBy === "newest" ? "Plus récents" : 
                    sortBy === "oldest" ? "Plus anciens" : 
                    sortBy === "likes-desc" ? "Plus de Likes" : "Moins de Likes"
                  }`}
                >
                  <span className="text-[11px]">
                    {sortBy === "newest" ? "🗓️" : 
                     sortBy === "oldest" ? "⏳" : 
                     sortBy === "likes-desc" ? "👍" : "👎"}
                  </span>
                  <span className="font-bold uppercase tracking-wider text-[8px]">
                    {sortBy === "newest" ? "Récents" : 
                     sortBy === "oldest" ? "Anciens" : 
                     sortBy === "likes-desc" ? "Likes" : "Likes"}
                  </span>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={() => setIsDarkMode(prev => !prev)}
                  className={`p-1.5 rounded-full hover:bg-slate-500/10 text-slate-500 transition-colors cursor-pointer shrink-0`}
                  title={isDarkMode ? "Mode clair" : "Mode sombre"}
                >
                  {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                {/* Profile Avatar */}
                <button 
                  onClick={() => setIsSyncModalOpen(true)}
                  className="w-7 h-7 rounded-full bg-indigo-600 overflow-hidden ring-1 ring-slate-200 cursor-pointer shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                  title="Simuler une chaîne"
                >
                  {activeChannel ? (
                    <img src={activeChannel.avatar} alt={activeChannel.name} className="w-full h-full object-cover" />
                  ) : (
                    "Y"
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Comment Conversation header action bar */
          <div className={`h-14 border-b ${isDarkMode ? "bg-[#111318] border-slate-800" : "bg-white border-slate-100"} px-4 flex items-center justify-between shrink-0 transition-colors duration-300`}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 pl-2">
                <h4 className={`text-xs font-bold truncate max-w-[180px] ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>
                  {activeComment.authorName}
                </h4>
                <p className="text-[9px] text-slate-400 truncate font-semibold">
                  Suivi du message
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Star conversation */}
              <button
                onClick={(e) => toggleStar(activeComment.id, e)}
                className={`p-2 rounded-full hover:bg-slate-500/10 cursor-pointer transition-colors ${
                  starredCommentIds.includes(activeComment.id) ? "text-amber-400" : "text-slate-400"
                }`}
                title="Suivre / Étoile"
              >
                <Star size={16} fill={starredCommentIds.includes(activeComment.id) ? "currentColor" : "none"} />
              </button>

              {/* Mark unreplied / Archive simulation */}
              <button
                onClick={() => {
                  const updated = comments.map(c => c.id === activeComment.id ? { ...c, isReplied: !c.isReplied } : c);
                  setComments(updated);
                  setActiveComment(prev => prev ? { ...prev, isReplied: !prev.isReplied } : null);
                }}
                className="p-2 rounded-full hover:bg-slate-500/10 text-slate-500 cursor-pointer transition-colors"
                title={activeComment.isReplied ? "Marquer comme non traité" : "Marquer comme traité"}
              >
                <Check size={16} className={activeComment.isReplied ? "text-indigo-600 dark:text-[#a5cbf5]" : ""} />
              </button>

              {/* Reset draft / Delete response */}
              <button
                onClick={() => {
                  setReplyText("");
                }}
                className="p-2 rounded-full hover:bg-slate-500/10 text-slate-500 cursor-pointer transition-colors"
                title="Effacer le brouillon"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          )
        )}

        {/* Scrolling Gmail Material 3 Style Filter Chips Row */}
        {!activeComment && workspaceTab === "moderator" && (
          <div className="px-4 py-2 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0" id="filter-chips-row">
            {/* Inbox / All chip */}
            <button
              onClick={() => {
                setStatusFilter("all");
                setShowStarredOnly(false);
                setSentimentFilter("all");
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                statusFilter === "all" && !showStarredOnly && sentimentFilter === "all"
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004977] dark:text-[#c2e7ff]"
                  : "bg-[#e1e3e1]/50 hover:bg-[#e1e3e1] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Principal ({totalCommentsCount})
            </button>

            {/* Pending chip */}
            <button
              onClick={() => {
                setStatusFilter("pending");
                setShowStarredOnly(false);
                setSentimentFilter("all");
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                statusFilter === "pending" && !showStarredOnly
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004977] dark:text-[#c2e7ff]"
                  : "bg-[#e1e3e1]/50 hover:bg-[#e1e3e1] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Non lus ({pendingCount})
            </button>

            {/* Replied chip */}
            <button
              onClick={() => {
                setStatusFilter("replied");
                setShowStarredOnly(false);
                setSentimentFilter("all");
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                statusFilter === "replied" && !showStarredOnly
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004977] dark:text-[#c2e7ff]"
                  : "bg-[#e1e3e1]/50 hover:bg-[#e1e3e1] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Traités
            </button>

            {/* Starred chip */}
            <button
              onClick={() => {
                setShowStarredOnly(true);
                setStatusFilter("all");
                setSentimentFilter("all");
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                showStarredOnly
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004977] dark:text-[#c2e7ff]"
                  : "bg-[#e1e3e1]/50 hover:bg-[#e1e3e1] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Star size={11} fill={showStarredOnly ? "currentColor" : "none"} />
              Suivis ({starredCommentIds.length})
            </button>

            {/* Positive Sentiment chip */}
            <button
              onClick={() => {
                setSentimentFilter(sentimentFilter === "positive" ? "all" : "positive");
                setShowStarredOnly(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                sentimentFilter === "positive"
                  ? "bg-[#e6f4ea] text-[#137333] dark:bg-[#0f3c20] dark:text-[#81c995]"
                  : "bg-[#e1e3e1]/50 hover:bg-[#e1e3e1] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Félicitations
            </button>

            {/* Question Sentiment chip */}
            <button
              onClick={() => {
                setSentimentFilter(sentimentFilter === "question" ? "all" : "question");
                setShowStarredOnly(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                sentimentFilter === "question"
                  ? "bg-[#fef7e0] text-[#b06000] dark:bg-[#3e2b00] dark:text-[#fdd663]"
                  : "bg-[#e1e3e1]/50 hover:bg-[#e1e3e1] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Questions
            </button>

            {/* Critique Sentiment chip */}
            <button
              onClick={() => {
                setSentimentFilter(sentimentFilter === "negative" ? "all" : "negative");
                setShowStarredOnly(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                sentimentFilter === "negative"
                  ? "bg-[#fce8e6] text-[#c5221f] dark:bg-[#3c1212] dark:text-[#f28b82]"
                  : "bg-[#e1e3e1]/50 hover:bg-[#e1e3e1] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Critiques
            </button>

            {/* Spam Sentiment chip */}
            <button
              onClick={() => {
                setSentimentFilter(sentimentFilter === "spam" ? "all" : "spam");
                setShowStarredOnly(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                sentimentFilter === "spam"
                  ? "bg-[#f3e8fd] text-[#8430d9] dark:bg-[#28143d] dark:text-[#d7aefb]"
                  : "bg-[#e1e3e1]/50 hover:bg-[#e1e3e1] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Spams
            </button>
          </div>
        )}

        {/* The Two-Column Workspace split: Left Sidebar list + Right Details Workspace */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* SECTION A: Comment List panel */}
          <AnimatePresence mode="wait" custom={tabDirection}>
            {workspaceTab === "moderator" && activeComment === null ? (
              <motion.section
                key="moderator-list-section"
                custom={tabDirection}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={`flex flex-col flex-1 overflow-hidden ${isDarkMode ? "bg-slate-900" : "bg-slate-50/60"} shrink-0 h-full w-full`}
              >
              {/* Active filters status banner */}
              {(searchQuery !== "" || statusFilter !== "all" || sentimentFilter !== "all" || videoFilter !== "all") && (
                <div className={`px-4 py-2.5 ${isDarkMode ? "bg-indigo-950/40 border-indigo-900/40 text-indigo-300" : "bg-indigo-50/80 border-indigo-100/50 text-indigo-700"} border-b flex items-center justify-between text-[11px] shrink-0`}>
                  <div className="flex items-center gap-1.5 font-semibold truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="truncate">
                      Filtres : {searchQuery && `"${searchQuery}" `}{statusFilter !== "all" && "Statut "}{sentimentFilter !== "all" && `${sentimentFilter} `}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setSentimentFilter("all");
                      setVideoFilter("all");
                    }}
                    className="text-[10px] font-extrabold underline hover:text-indigo-900 dark:hover:text-indigo-300 uppercase tracking-wide cursor-pointer ml-2 shrink-0"
                  >
                    Effacer
                  </button>
                </div>
              )}

            {/* Scrollable list items */}
            <div className={`flex-1 overflow-y-auto overflow-x-hidden p-3 pb-28 ${isDarkMode ? "bg-slate-900" : "bg-white"}`} id="comments-list-scroll">
              {loadingComments ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">Chargement des commentaires...</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${statusFilter}-${showStarredOnly}-${sentimentFilter}-${videoFilter}-${videoTypeFilter}-${searchQuery}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="space-y-3.5"
                  >
                    {filteredComments.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <MessageSquare size={32} className="mx-auto text-slate-300" />
                        <p className="text-xs">Aucun commentaire correspondant</p>
                      </div>
                    ) : (
                      filteredComments.map((comment) => {
                        const isActive = activeComment?.id === comment.id;
                        const isReplied = comment.isReplied;
                        const isStarred = starredCommentIds.includes(comment.id);

                        return (
                          <motion.div
                            key={comment.id}
                            onClick={() => setActiveComment(comment)}
                            whileTap={{ scale: 0.995 }}
                            className={`relative px-4 py-4 cursor-pointer transition-all duration-200 text-left flex gap-3 items-start rounded-2xl border shadow-xs ${
                              isActive
                                ? isDarkMode
                                  ? "bg-indigo-950/90 border-indigo-800 text-indigo-100 shadow-sm"
                                  : "bg-[#c2e7ff] border-blue-200/80 text-[#001d35] shadow-sm"
                                : isReplied
                                  ? isDarkMode
                                    ? "bg-black/25 border-slate-900/80 hover:bg-black/40 text-slate-400"
                                    : "bg-[#f8f9fc]/65 border-[#eaecef]/60 hover:bg-[#f1f2f6] text-slate-600"
                                  : isDarkMode
                                    ? "bg-[#0e0f12] border-slate-800/60 hover:bg-[#15161d] text-slate-100"
                                    : "bg-[#f4f5f8] border-[#e2e4e9] hover:bg-[#ebedf2] text-slate-900"
                            }`}
                          >
                            {/* Unread Indicator Blue Dot for Pending comments */}
                            {!isReplied && (
                              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                            )}

                            {/* Author Avatar */}
                            <img
                              src={comment.authorAvatar}
                              alt={comment.authorName}
                              className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-100 dark:ring-slate-800"
                            />

                            {/* Message details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className={`text-xs truncate max-w-[140px] xs:max-w-[180px] ${
                                  isActive
                                    ? isDarkMode
                                      ? "font-bold text-[#c2e7ff]"
                                      : "font-bold text-[#001d35]"
                                    : isReplied
                                      ? isDarkMode
                                        ? "text-slate-350 font-medium"
                                        : "text-slate-500 font-medium"
                                      : isDarkMode
                                        ? "text-slate-100 font-bold"
                                        : "text-slate-950 font-bold"
                                }`}>
                                  {comment.authorName}
                                </span>
                                <span className={`text-[10px] shrink-0 ${
                                  isActive 
                                    ? isDarkMode
                                      ? "text-[#c2e7ff]/80"
                                      : "text-[#001d35]/70"
                                    : isReplied 
                                      ? isDarkMode
                                        ? "text-slate-400"
                                        : "text-slate-400"
                                      : isDarkMode
                                        ? "text-slate-300 font-semibold"
                                        : "text-slate-700 font-semibold"
                                }`}>
                                  {new Date(comment.publishedAt).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short"
                                  })}
                                </span>
                              </div>

                              {/* Video Reference */}
                              <div className={`text-[10px] mb-1 font-bold truncate leading-tight flex items-center gap-1 ${
                                isActive 
                                  ? isDarkMode
                                    ? "text-[#c2e7ff]"
                                    : "text-[#001d35]/80"
                                  : "text-indigo-600 dark:text-indigo-400"
                              }`}>
                                Sur: {comment.videoTitle || "Vidéo YouTube"}
                              </div>

                              {/* Content text block - no line clamp to avoid breaking with ellipses, and black readable text */}
                              <p className={`text-xs leading-relaxed break-words whitespace-pre-wrap ${
                                isActive
                                  ? isDarkMode
                                    ? "text-indigo-100 font-medium"
                                    : "text-[#001d35] font-medium"
                                  : isReplied
                                    ? isDarkMode
                                      ? "text-slate-300 font-normal"
                                      : "text-slate-650 font-normal"
                                    : isDarkMode
                                      ? "text-slate-100 font-medium"
                                      : "text-slate-950 font-medium"
                              }`}>
                                {comment.content}
                              </p>

                              {/* Sentiment Badges and Star icon row */}
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex flex-wrap gap-1 items-center">
                                  {comment.sentiment && getSentimentBadge(comment.sentiment, comment.category)}
                                  {isReplied && (
                                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-[#f1f3f4] dark:bg-[#202124] text-slate-500 uppercase tracking-wider">
                                      Traité
                                    </span>
                                  )}
                                </div>

                                {/* Gmail Star Button */}
                                <button
                                  onClick={(e) => toggleStar(comment.id, e)}
                                  className={`p-1 rounded-full hover:bg-slate-500/10 transition-colors shrink-0 ${
                                    isStarred 
                                      ? "text-amber-400" 
                                      : isActive 
                                        ? "text-[#001d35]/40 dark:text-[#c2e7ff]/40 hover:text-amber-400" 
                                        : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                                  }`}
                                  title="Suivre / Étoile"
                                >
                                  <Star size={14} fill={isStarred ? "currentColor" : "none"} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
              </motion.section>
            ) : (workspaceTab === "sentiment" || (workspaceTab === "moderator" && activeComment !== null)) ? (
              <motion.section
                key="workspace-container-section"
                custom={tabDirection}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={`flex flex-col flex-1 ${isDarkMode ? "bg-slate-900" : "bg-white"} min-w-0 overflow-hidden h-full w-full`}
                id="workspace-container"
              >
            {/* Workspace Tab bar */}
            {!activeComment && (
              <div className={`hidden md:flex ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"} border-b px-6 py-2 items-center justify-between shrink-0`} id="workspace-tabs-header">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTabChange("moderator")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                      workspaceTab === "moderator"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    }`}
                    id="tab-moderator"
                  >
                    <MessageSquare size={14} />
                    <span>💬 Modérateur & Réponses</span>
                  </button>
                  <button
                    onClick={() => handleTabChange("sentiment")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                      workspaceTab === "sentiment"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    }`}
                    id="tab-sentiment"
                  >
                    <TrendingUp size={14} />
                    <span>📊 Analyse de Sentiment par Vidéo</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col" id="workspace-content-body">
              {workspaceTab === "moderator" ? (
                activeComment ? (
                  <motion.div
                    key={activeComment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto overflow-x-hidden"
                    id="comment-moderator-view"
                  >
                    {/* Gmail-style Conversation View */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" id="conversation-body">
                      {/* Original Message Card */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={activeComment.authorAvatar}
                              alt={activeComment.authorName}
                              className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-800"
                            />
                            <div>
                              <h3 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                {activeComment.authorName}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-semibold">
                                {new Date(activeComment.publishedAt).toLocaleString("fr-FR")}
                              </p>
                            </div>
                          </div>

                          {/* Likes Counter */}
                          <div className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isDarkMode ? "bg-slate-800 text-slate-400" : "bg-[#f1f3f4] text-slate-600"
                          }`}>
                            <ThumbsUp size={10} />
                            <span>{activeComment.likeCount}</span>
                          </div>
                        </div>

                        {/* Message content */}
                        <div className="pl-13 pr-2">
                          <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${
                            isDarkMode ? "text-slate-200" : "text-slate-950"
                          }`}>
                            {activeComment.content}
                          </p>

                          {/* Translation block */}
                          {activeComment.translation ? (
                            <div className={`mt-3 p-3 rounded-xl border ${
                              isDarkMode 
                                ? "bg-[#1f2128]/40 border-slate-800 text-slate-300" 
                                : "bg-[#eaf1fb]/60 border-transparent text-[#1f1f1f]"
                            } text-xs`}>
                              <div className="font-bold text-slate-400 dark:text-slate-500 flex items-center justify-between gap-1 mb-1.5 uppercase tracking-wider text-[9px]">
                                <span className="flex items-center gap-1">
                                  <Languages size={12} /> Traduction IA (original: {activeComment.language?.toUpperCase() || "FR"})
                                </span>
                                <button
                                  onClick={() => translateComment(activeComment.id)}
                                  disabled={translatingCommentId !== null}
                                  className="text-[10px] text-[#0b57d0] dark:text-[#a5cbf5] font-extrabold flex items-center gap-1 cursor-pointer bg-transparent border-none"
                                >
                                  {translatingCommentId === activeComment.id ? (
                                    <span className="w-2.5 h-2.5 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <RefreshCw size={10} />
                                  )}
                                  Retraduire
                                </button>
                              </div>
                              <p className="italic break-words whitespace-pre-wrap">"{activeComment.translation}"</p>
                            </div>
                          ) : (
                            <div className="mt-2.5">
                              <button
                                onClick={() => translateComment(activeComment.id)}
                                disabled={translatingCommentId !== null}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isDarkMode 
                                    ? "bg-slate-800/40 hover:bg-slate-700/60 border-slate-700 text-indigo-400" 
                                    : "bg-[#eaf1fb] hover:bg-[#d3e3fd] border-transparent text-indigo-700"
                                }`}
                              >
                                {translatingCommentId === activeComment.id ? (
                                  <>
                                    <div className="w-3 h-3 border border-indigo-650 border-t-transparent rounded-full animate-spin" />
                                    <span>Traduction...</span>
                                  </>
                                ) : (
                                  <>
                                    <Languages size={11} />
                                    <span>Traduire en Français</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Gmail-style Response Composer */}
                      <div className={`mt-6 border-t ${isDarkMode ? "border-slate-800" : "border-[#e1e3e1]/40"} pt-6 px-6 space-y-4`}>
                        {/* Smart AI Draft Generator Widget */}
                        <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                          isDarkMode ? "bg-[#1a1c22] border-slate-800" : "bg-[#f8fafd] border-[#e1e3e1]/60"
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              <Sparkle size={12} className="text-indigo-500 animate-pulse shrink-0" />
                              Assistant de réponse IA
                            </span>
                            <button
                              onClick={() => analyzeComment(activeComment.id)}
                              disabled={analyzingCommentId !== null}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                analyzingCommentId === activeComment.id
                                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400"
                                  : "bg-[#c2e7ff] text-[#001d35] hover:bg-[#b0dbf9]"
                              }`}
                            >
                              {analyzingCommentId === activeComment.id ? (
                                <>
                                  <div className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                  <span>Génération...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={10} />
                                  <span>Proposer un projet</span>
                                </>
                              )}
                            </button>
                          </div>

                          {activeComment.replyDraft ? (
                            <div className="space-y-2">
                              <p className={`text-xs italic leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                                "{activeComment.replyDraft}"
                              </p>
                              <button
                                onClick={() => setReplyText(activeComment.replyDraft || "")}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-[#a5cbf5] font-extrabold flex items-center gap-1 cursor-pointer"
                              >
                                <CornerUpLeft size={10} />
                                Insérer ce projet de réponse
                              </button>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-semibold">
                              Cliquez ci-dessus pour que l'IA rédige automatiquement un modèle de réponse poli et prêt à envoyer.
                            </p>
                          )}
                        </div>

                        {/* Reply Composer Textarea */}
                        <div className="flex gap-3 items-start">
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                            isDarkMode ? "bg-indigo-600" : "bg-slate-900"
                          }`}>
                            {activeChannel ? activeChannel.name[0] : "Y"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Répondre en tant que {activeChannel?.name || "Créateur"}
                              </span>
                              {activeComment.isReplied && (
                                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  <Check size={10} /> Déjà répondu
                                </span>
                              )}
                            </div>

                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className={`w-full h-32 p-3 border rounded-xl focus:border-indigo-500 outline-none transition-all resize-none text-xs leading-relaxed ${
                                isDarkMode 
                                  ? "bg-[#1c1d22] border-slate-800 text-slate-100" 
                                  : "bg-white border-[#e1e3e1] text-slate-900"
                                }`}
                              placeholder={`Répondre à ${activeComment.authorName}...`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Action bar footer */}
                    <div className={`h-20 border-t px-6 flex items-center justify-between shrink-0 ${isDarkMode ? "bg-[#111318] border-slate-800" : "bg-white border-slate-100"}`}>
                      <div className="flex gap-2">
                        {/* Secondary helper utilities */}
                        <button
                          onClick={() => {
                            if (!replyText.trim()) return;
                            setReplyText(prev => prev + " Merci pour votre fidélité et à bientôt ! 🙌");
                          }}
                          className={`px-3 py-1.5 text-[10px] font-semibold border ${
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          } rounded-lg transition-colors cursor-pointer`}
                        >
                          + Signature
                        </button>
                      </div>

                      <div className="flex gap-3 items-center">
                        <button
                          onClick={() => {
                            setReplyText("");
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          Effacer
                        </button>

                        <button
                          onClick={handleSendReply}
                          disabled={publishingReply || !replyText.trim()}
                          className="px-5 py-2 bg-[#0b57d0] text-white font-bold text-xs rounded-full hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          {publishingReply ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Envoi...</span>
                            </>
                          ) : (
                            <>
                              <CornerUpLeft size={13} />
                              <span>Envoyer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </motion.div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8" id="no-comment-fallback">
                    <MessageSquare size={48} className={`mb-2 animate-bounce ${isDarkMode ? "text-slate-700" : "text-slate-200"}`} />
                    <p className={`font-bold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Aucun commentaire sélectionné</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
                      Sélectionnez un commentaire dans la barre latérale pour l'analyser, y répondre, ou cliquez sur l'onglet "Analyse de Sentiment par Vidéo" pour afficher les statistiques globales.
                    </p>
                  </div>
                )
              ) : (
                /* Video Sentiment Dashboard panel */
                <motion.div
                  key="sentiment-dashboard"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex-1 p-4 sm:p-6 pb-28 space-y-6 overflow-y-auto overflow-x-hidden ${isDarkMode ? "bg-slate-900/40" : "bg-slate-50/40"}`}
                  id="video-sentiment-dashboard-view"
                >
                  
                  {/* Dashboard Header */}
                  <div className={`flex flex-col gap-4 p-5 rounded-2xl border shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
                    <div className="space-y-1">
                      <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        <TrendingUp className="text-indigo-600" size={18} />
                        <span>Rapport de Sentiment du Public</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 break-words whitespace-normal leading-relaxed">
                        Analysez la perception globale de votre communauté, vidéo par vidéo, grâce à l'IA Gemini.
                      </p>
                    </div>

                    {/* Video Selector Dropdown in tab */}
                    <div className={`flex items-center gap-2 pt-2 border-t ${isDarkMode ? "border-slate-700" : "border-slate-100"}`}>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filtrer :</span>
                      <select
                        value={videoFilter}
                        onChange={(e) => setVideoFilter(e.target.value)}
                        className={`border rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 w-full ${
                          isDarkMode ? "bg-slate-900 border-slate-700 text-slate-350" : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                        id="sentiment-video-select"
                      >
                        <option value="all">Toutes les vidéos (Vue d'ensemble)</option>
                        {videos.map(v => (
                          <option key={v.id} value={v.id}>{v.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Overall stats section */}
                  {videoFilter === "all" ? (
                    // CHANNEL-WIDE VIEW
                    <div className="space-y-6" id="sentiment-channel-view">
                      
                      {/* 2 cards row */}
                      <div className="grid grid-cols-1 gap-4">
                        
                        {/* Card 1: Channel average score */}
                        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center space-y-3 ${
                          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                        }`}>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score Global du Canal</span>
                          <div className="relative flex items-center justify-center">
                            {/* Simple circular ring */}
                            <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shadow-inner ${
                              isDarkMode ? "border-indigo-900/60 bg-indigo-950/20" : "border-indigo-100 bg-indigo-50/30"
                            }`}>
                              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{sentimentPct}%</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide ${
                            isDarkMode ? "bg-indigo-950/40 text-indigo-400" : "bg-indigo-100 text-indigo-800"
                          }`}>
                            {sentimentPct >= 80 ? "Excellent" : sentimentPct >= 60 ? "Très Positif" : sentimentPct >= 40 ? "Neutre / Mixte" : "Critique"}
                          </span>
                        </div>

                        {/* Card 2: Comments Breakdown */}
                        <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
                          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                        }`}>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Répartition des Sentiments</span>
                          
                          {/* Segmented bar */}
                          <div className={`h-4 w-full rounded-full overflow-hidden flex ${isDarkMode ? "bg-slate-900" : "bg-slate-100"}`}>
                            <div 
                              style={{ width: `${Math.round((positiveCount / (totalCommentsCount || 1)) * 100)}%` }} 
                              className="bg-emerald-500 h-full flex items-center justify-center text-[9px] text-white font-bold transition-all"
                              title="Positif"
                            >
                              {positiveCount > 0 && `${Math.round((positiveCount / (totalCommentsCount || 1)) * 100)}%`}
                            </div>
                            <div 
                              style={{ width: `${Math.round(((questionCount + comments.filter(c => c.sentiment === "neutral").length) / (totalCommentsCount || 1)) * 100)}%` }} 
                              className="bg-amber-400 h-full flex items-center justify-center text-[9px] text-slate-900 font-bold transition-all"
                              title="Questions / Neutre"
                            >
                              {(questionCount + comments.filter(c => c.sentiment === "neutral").length) > 0 && `${Math.round(((questionCount + comments.filter(c => c.sentiment === "neutral").length) / (totalCommentsCount || 1)) * 100)}%`}
                            </div>
                            <div 
                              style={{ width: `${Math.round((criticalCount / (totalCommentsCount || 1)) * 100)}%` }} 
                              className="bg-rose-500 h-full flex items-center justify-center text-[9px] text-white font-bold transition-all"
                              title="Critique"
                            >
                              {criticalCount > 0 && `${Math.round((criticalCount / (totalCommentsCount || 1)) * 100)}%`}
                            </div>
                            <div 
                              style={{ width: `${Math.round((spamCount / (totalCommentsCount || 1)) * 100)}%` }} 
                              className="bg-purple-400 h-full flex items-center justify-center text-[9px] text-white font-bold transition-all"
                              title="Spam"
                            >
                              {spamCount > 0 && `${Math.round((spamCount / (totalCommentsCount || 1)) * 100)}%`}
                            </div>
                          </div>

                          {/* Legend indicators */}
                          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                              <div className="truncate">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{positiveCount}</span>
                                <span className="text-slate-400 dark:text-slate-500 ml-1 text-[10px]">Positifs</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                              <div className="truncate">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{questionCount + comments.filter(c => c.sentiment === "neutral").length}</span>
                                <span className="text-slate-400 dark:text-slate-500 ml-1 text-[10px]">Questions</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                              <div className="truncate">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{criticalCount}</span>
                                <span className="text-slate-400 dark:text-slate-500 ml-1 text-[10px]">Critiques</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                              <div className="truncate">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{spamCount}</span>
                                <span className="text-slate-400 dark:text-slate-500 ml-1 text-[10px]">Spams</span>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Videos List Grid */}
                      <div className="space-y-3">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>Performance par Vidéo</h4>
                        <div className="grid grid-cols-1 gap-3.5">
                          {videos.map((vid) => {
                            const stats = getVideoSentimentStats(vid.id);
                            return (
                              <div 
                                key={vid.id}
                                onClick={() => setVideoFilter(vid.id)}
                                className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-3 shadow-sm hover:shadow-md group text-left min-w-0 ${
                                  isDarkMode ? "bg-slate-800 border-slate-700 hover:border-indigo-500 hover:bg-slate-700" : "bg-white border-slate-200 hover:border-indigo-500 hover:bg-slate-50"
                                }`}
                              >
                                <img 
                                  src={vid.thumbnail} 
                                  alt={vid.title} 
                                  className={`w-20 h-14 rounded-lg object-cover border shrink-0 self-center ${isDarkMode ? "border-slate-700" : "border-slate-100"}`}
                                />
                                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                                  <div>
                                    <h5 className={`font-bold text-xs group-hover:text-indigo-600 transition-colors line-clamp-1 break-words whitespace-normal leading-snug ${
                                      isDarkMode ? "text-white" : "text-slate-900"
                                    }`}>
                                      {vid.title}
                                    </h5>
                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                      {stats.total} comm. • {vid.viewCount.toLocaleString()} vues
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 mt-2">
                                    <div className={`h-1.5 flex-1 rounded-full overflow-hidden flex shrink-0 ${isDarkMode ? "bg-slate-900" : "bg-slate-100"}`}>
                                      <div className="bg-emerald-500 h-full" style={{ width: `${stats.validTotal > 0 ? (stats.positive / stats.validTotal) * 100 : 0}%` }} />
                                      <div className="bg-amber-400 h-full" style={{ width: `${stats.validTotal > 0 ? (stats.neutral / stats.validTotal) * 100 : 0}%` }} />
                                      <div className="bg-rose-500 h-full" style={{ width: `${stats.validTotal > 0 ? (stats.negative / stats.validTotal) * 100 : 0}%` }} />
                                    </div>
                                    
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded shrink-0 ${
                                      stats.score >= 80 ? (isDarkMode ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40" : "bg-emerald-50 text-emerald-700 border border-emerald-200") :
                                      stats.score >= 50 ? (isDarkMode ? "bg-amber-950/40 text-amber-400 border border-amber-900/40" : "bg-amber-50 text-amber-700 border border-amber-200") :
                                      (isDarkMode ? "bg-rose-950/40 text-rose-400 border border-rose-900/40" : "bg-rose-50 text-rose-700 border border-rose-200")
                                    }`}>
                                      {stats.score}/100
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  ) : (
                    // SINGLE VIDEO DETAIL VIEW
                    (() => {
                      const vid = videos.find(v => v.id === videoFilter);
                      if (!vid) return <div className="text-xs text-slate-400">Vidéo introuvable</div>;
                      
                      const stats = getVideoSentimentStats(vid.id);
                      
                      // Filter video comments
                      const videoComments = comments.filter(c => c.videoId === vid.id);
                      
                      // Get key highlights
                      const topPositives = videoComments
                        .filter(c => c.sentiment === "positive")
                        .sort((a, b) => b.likeCount - a.likeCount)
                        .slice(0, 3);
                        
                      const topNegatives = videoComments
                        .filter(c => c.sentiment === "negative")
                        .sort((a, b) => b.likeCount - a.likeCount)
                        .slice(0, 3);
                        
                      const unanalyzedCount = videoComments.filter(c => !c.sentiment).length;

                      return (
                        <div className="space-y-6" id={`sentiment-report-${vid.id}`}>
                          
                          {/* Active video card */}
                          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-4 ${isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
                            <img 
                              src={vid.thumbnail} 
                              alt={vid.title} 
                              className={`w-full h-28 sm:h-32 rounded-xl object-cover border shrink-0 ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}
                            />
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${isDarkMode ? "bg-indigo-950/40 text-indigo-400" : "bg-indigo-50 text-indigo-700"}`}>
                                  Vidéo sélectionnée
                                </span>
                                <h4 className={`text-sm font-bold mt-2 line-clamp-2 break-words whitespace-normal leading-snug ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                  {vid.title}
                                </h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 break-words whitespace-normal">
                                  Publiée le {new Date(vid.publishedAt).toLocaleDateString("fr-FR")} • {vid.viewCount.toLocaleString()} vues • {stats.total} commentaires
                                </p>
                              </div>

                              {/* Bulk analysis triggers */}
                              {unanalyzedCount > 0 && (
                                <div className={`mt-4 pt-4 border-t flex flex-col gap-3 p-4 rounded-xl border ${isDarkMode ? "border-slate-700 bg-indigo-950/10 border-indigo-900/30" : "border-slate-100 bg-indigo-50/40 border-indigo-100/30"}`}>
                                  <div className={`text-[10px] leading-relaxed ${isDarkMode ? "text-slate-350" : "text-slate-600"}`}>
                                    <span className={`font-bold ${isDarkMode ? "text-indigo-400" : "text-indigo-700"}`}>{unanalyzedCount} nouveaux commentaires</span> n'ont pas encore été classifiés par l'IA.
                                  </div>
                                  <button
                                    onClick={() => handleBulkAnalyzeVideoComments(vid.id)}
                                    disabled={bulkAnalyzing}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto w-full sm:w-auto"
                                    type="button"
                                  >
                                    {bulkAnalyzing ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Classification...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={12} />
                                        <span>Classifier {unanalyzedCount} commentaires</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Score display & breakdown */}
                          <div className="grid grid-cols-1 gap-4">
                            
                            {/* Sentiment Score ring */}
                            <div className={`p-5 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center space-y-3 ${isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score de Sentiment</span>
                              
                              <div className="relative flex items-center justify-center">
                                <div className={`w-24 h-24 rounded-full border-8 flex flex-col items-center justify-center transition-all shadow-inner ${
                                  stats.score >= 80 ? (isDarkMode ? "border-emerald-950/80 bg-emerald-950/10 text-emerald-400" : "border-emerald-100 bg-emerald-50/10 text-emerald-600") :
                                  stats.score >= 50 ? (isDarkMode ? "border-amber-950/80 bg-amber-950/10 text-amber-400" : "border-amber-100 bg-amber-50/10 text-amber-600") :
                                  (isDarkMode ? "border-rose-950/80 bg-rose-950/10 text-rose-400" : "border-rose-100 bg-rose-50/10 text-rose-600")
                                }`}>
                                  <span className="text-xl font-black">{stats.score}%</span>
                                  <span className="text-[8px] font-bold text-slate-400 mt-0.5">SCORE PUBLIC</span>
                                </div>
                              </div>

                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                stats.score >= 80 ? (isDarkMode ? "bg-emerald-950/40 text-emerald-400" : "bg-emerald-100 text-emerald-800") :
                                stats.score >= 50 ? (isDarkMode ? "bg-amber-950/40 text-amber-400" : "bg-amber-100 text-amber-800") :
                                (isDarkMode ? "bg-rose-950/40 text-rose-450" : "bg-rose-100 text-rose-800")
                              }`}>
                                {stats.score >= 80 ? "Très Positif" : stats.score >= 60 ? "Plutôt Positif" : stats.score >= 40 ? "Neutre" : "Critique"}
                              </span>
                            </div>

                            {/* Segmented breakdown */}
                            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Distribution des Commentaires</span>

                              {/* Segmented visual bar */}
                              <div className={`h-4 w-full rounded-full overflow-hidden flex ${isDarkMode ? "bg-slate-900" : "bg-slate-100"}`}>
                                <div 
                                  style={{ width: `${stats.validTotal > 0 ? Math.round((stats.positive / stats.validTotal) * 100) : 0}%` }} 
                                  className="bg-emerald-500 h-full flex items-center justify-center text-[9px] text-white font-bold transition-all"
                                >
                                  {stats.positive > 0 && `${Math.round((stats.positive / stats.validTotal) * 100)}%`}
                                </div>
                                <div 
                                  style={{ width: `${stats.validTotal > 0 ? Math.round((stats.neutral / stats.validTotal) * 100) : 0}%` }} 
                                  className="bg-amber-400 h-full flex items-center justify-center text-[9px] text-slate-900 font-bold transition-all"
                                >
                                  {stats.neutral > 0 && `${Math.round((stats.neutral / stats.validTotal) * 100)}%`}
                                </div>
                                <div 
                                  style={{ width: `${stats.validTotal > 0 ? Math.round((stats.negative / stats.validTotal) * 100) : 0}%` }} 
                                  className="bg-rose-500 h-full flex items-center justify-center text-[9px] text-white font-bold transition-all"
                                >
                                  {stats.negative > 0 && `${Math.round((stats.negative / stats.validTotal) * 100)}%`}
                                </div>
                              </div>

                              {/* Counts legend */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                                <div className={`flex flex-col p-3 rounded-xl border ${isDarkMode ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400" : "bg-emerald-50/50 border-emerald-100/40 text-slate-800"}`}>
                                  <span className="text-slate-400 text-[9px] font-bold uppercase">Positifs</span>
                                  <span className="text-lg font-black mt-1 text-emerald-600 dark:text-emerald-400">{stats.positive}</span>
                                  <span className="text-[9px] text-slate-500 mt-0.5">{stats.validTotal > 0 ? Math.round((stats.positive / stats.validTotal) * 100) : 0}% du total</span>
                                </div>
                                <div className={`flex flex-col p-3 rounded-xl border ${isDarkMode ? "bg-amber-950/20 border-amber-900/30 text-amber-400" : "bg-amber-50/50 border-amber-100/40 text-slate-800"}`}>
                                  <span className="text-slate-400 text-[9px] font-bold uppercase">Neutres</span>
                                  <span className="text-lg font-black mt-1 text-amber-600 dark:text-amber-400">{stats.neutral}</span>
                                  <span className="text-[9px] text-slate-500 mt-0.5">{stats.validTotal > 0 ? Math.round((stats.neutral / stats.validTotal) * 100) : 0}% du total</span>
                                </div>
                                <div className={`flex flex-col p-3 rounded-xl border ${isDarkMode ? "bg-rose-950/20 border-rose-900/30 text-rose-400" : "bg-rose-50/50 border-rose-100/40 text-slate-800"}`}>
                                  <span className="text-slate-400 text-[9px] font-bold uppercase">Critiques</span>
                                  <span className="text-lg font-black mt-1 text-rose-600 dark:text-rose-400">{stats.negative}</span>
                                  <span className="text-[9px] text-slate-500 mt-0.5">{stats.validTotal > 0 ? Math.round((stats.negative / stats.validTotal) * 100) : 0}% du total</span>
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* Highlights grids: Top positive & Top negatives */}
                          <div className="grid grid-cols-1 gap-4">
                            
                            {/* Top Positives */}
                            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                              <h5 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                                <ThumbsUp size={12} />
                                <span>👍 Retours les plus enthousiastes</span>
                              </h5>
                              
                              <div className={`space-y-4 divide-y ${isDarkMode ? "divide-slate-700" : "divide-slate-100"}`}>
                                {topPositives.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">Aucun retour positif à forte popularité.</p>
                                ) : (
                                  topPositives.map((c, i) => (
                                    <div key={c.id} className={`pt-3 first:pt-0 p-3 rounded-xl border mt-2 first:mt-0 ${isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200/40 text-slate-700"}`}>
                                      <div className="flex justify-between items-start gap-2 mb-1.5 min-w-0">
                                        <span className={`font-bold text-xs truncate ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{c.authorName}</span>
                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${isDarkMode ? "text-emerald-400 bg-emerald-950/40" : "text-emerald-600 bg-emerald-50"}`}>
                                          <ThumbsUp size={8} /> {c.likeCount} likes
                                        </span>
                                      </div>
                                      <p className={`text-xs leading-relaxed italic break-words whitespace-normal ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>"{c.content}"</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Top Negatives */}
                            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                              <h5 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? "text-rose-400" : "text-rose-600"}`}>
                                <AlertTriangle size={12} />
                                <span>👎 Points de vigilance & critiques</span>
                              </h5>
                              
                              <div className={`space-y-4 divide-y ${isDarkMode ? "divide-slate-700" : "divide-slate-100"}`}>
                                {topNegatives.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">Aucun retour négatif ou critique de membre.</p>
                                ) : (
                                  topNegatives.map((c, i) => (
                                    <div key={c.id} className={`pt-3 first:pt-0 p-3 rounded-xl border mt-2 first:mt-0 ${isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200/40 text-slate-700"}`}>
                                      <div className="flex justify-between items-start gap-2 mb-1.5 min-w-0">
                                        <span className={`font-bold text-xs truncate ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{c.authorName}</span>
                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${isDarkMode ? "text-rose-400 bg-rose-950/40" : "text-rose-600 bg-rose-50"}`}>
                                          <ThumbsUp size={8} /> {c.likeCount} likes
                                        </span>
                                      </div>
                                      <p className={`text-xs leading-relaxed italic break-words whitespace-normal ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>"{c.content}"</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                          </div>

                        </div>
                      );
                    })()
                  )}

                </motion.div>
              )}
            </div>
              </motion.section>
            ) : workspaceTab === "channels" ? (
              <motion.section
                key="mobile-channels-section"
                custom={tabDirection}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col flex-1 overflow-y-auto bg-slate-900 text-slate-300 p-6 pb-28 space-y-6 h-full w-full"
                id="mobile-channels-container"
              >
            {/* Brand Logo & Title */}
            <div className="pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-600/20">
                  C
                </div>
                <div>
                  <span className="text-white font-bold tracking-tight text-sm block leading-tight">
                    Commentaire+
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                    YOUTUBE STUDIO MOBILE
                  </span>
                </div>
              </div>
            </div>

            {/* Gemini Health Status & User Info (Moved to Top for better visibility and avoiding pill menu overlay) */}
            <div className="pt-2 text-[10px] space-y-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                  {activeChannel ? activeChannel.name[0] : "YT"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium truncate text-xs">
                    {activeChannel ? activeChannel.name : "Sélectionner chaîne"}
                  </div>
                  <div className="text-[9px] opacity-45 truncate">
                    {activeChannel ? `${activeChannel.subscriberCount.toLocaleString()} abonnés` : "YouTube"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/30 text-[9px] text-slate-400 border border-slate-800/40">
                {aiStatus.hasApiKey ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="truncate">Modèle Gemini 3.5-Flash</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="truncate">Démo (No key)</span>
                  </>
                )}
              </div>
            </div>

            {/* General Filters */}
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 uppercase tracking-widest font-bold px-3 py-1">
                Filtres généraux
              </div>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setSentimentFilter("all");
                  handleTabChange("moderator");
                  setActiveComment(null);
                }}
                className={`w-full p-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors text-left text-xs ${
                  statusFilter === "all" && sentimentFilter === "all"
                    ? "bg-slate-800 text-white font-medium"
                    : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="text-sm">📥</div>
                <span className="flex-1">Boîte de réception</span>
                {pendingCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setStatusFilter("pending");
                  setSentimentFilter("all");
                  handleTabChange("moderator");
                  setActiveComment(null);
                }}
                className={`w-full p-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors text-left text-xs ${
                  statusFilter === "pending"
                    ? "bg-slate-800 text-white font-medium"
                    : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="text-sm">⏳</div>
                <span>En attente</span>
              </button>

              <button
                onClick={() => {
                  setStatusFilter("replied");
                  setSentimentFilter("all");
                  handleTabChange("moderator");
                  setActiveComment(null);
                }}
                className={`w-full p-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors text-left text-xs ${
                  statusFilter === "replied"
                    ? "bg-slate-800 text-white font-medium"
                    : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="text-sm">✅</div>
                <span>Répondus</span>
              </button>
            </div>

            {/* Channels List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-[10px] opacity-40 uppercase tracking-widest font-bold">
                  Mes Chaînes ({channels.length})
                </span>
                <button
                  onClick={() => setIsSyncModalOpen(true)}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors p-0.5 rounded hover:bg-slate-800"
                  title="Importer une chaîne"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-1">
                {loadingChannels ? (
                  <div className="text-[10px] text-slate-500 p-2 italic">Chargement...</div>
                ) : (
                  channels.map((chan) => {
                    const isActive = activeChannel?.id === chan.id;
                    return (
                      <button
                        key={chan.id}
                        onClick={() => {
                          setActiveChannel(chan);
                          handleTabChange("moderator");
                          setActiveComment(null);
                        }}
                        className={`w-full p-2 rounded-lg flex items-center gap-3 cursor-pointer transition-all text-left text-xs ${
                          isActive
                            ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-semibold"
                            : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent"
                        }`}
                      >
                        <img
                          src={chan.avatar}
                          alt={chan.name}
                          className="w-5 h-5 rounded-full object-cover border border-slate-700"
                        />
                        <span className="truncate flex-1">{chan.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Session Settings / Déconnexion */}
            <div className="pt-4 border-t border-slate-800 space-y-2 mt-auto">
              <div className="text-[10px] opacity-40 uppercase tracking-widest font-bold px-3 py-1">
                Mon Compte
              </div>
              <button
                onClick={async () => {
                  try {
                    await signOut(auth);
                    setUser(null);
                  } catch (err) {
                    console.error("Erreur de déconnexion :", err);
                    setUser(null);
                  }
                }}
                className="w-full p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all text-left text-xs text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/20 active:scale-[0.98]"
              >
                <LogOut size={16} />
                <span className="font-semibold">Se déconnecter</span>
              </button>
            </div>
          </motion.section>
            ) : null}
          </AnimatePresence>

        </div>

        {/* Floating bottom controls (translucent menu pill + filter bubble button) */}
        <div className={`absolute bottom-6 left-0 right-0 px-4 flex items-center justify-center gap-3 z-30 shrink-0 pointer-events-none transition-all duration-300 ease-in-out ${
          showFloatingControls ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
        }`}>
          {/* Main Translucent Pill Menu */}
            <div className="flex-1 max-w-[280px] h-12 bg-white/75 backdrop-blur-lg border border-slate-200/50 rounded-full shadow-lg flex items-center justify-around p-1 relative pointer-events-auto">
              
              {/* Tab 1: Commentaires */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  handleTabChange("moderator");
                  setActiveComment(null);
                }}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer select-none rounded-full border-none bg-transparent"
              >
                {workspaceTab === "moderator" && (
                  <motion.div
                    layoutId="active-tab-bubble"
                    className="absolute inset-0 bg-slate-900 shadow-sm rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <MessageSquare
                  size={15}
                  className={`transition-transform duration-250 ${
                    workspaceTab === "moderator" ? "text-white scale-110" : "text-slate-500 hover:text-slate-700"
                  }`}
                />
                <span
                  className={`text-[9px] mt-0.5 font-bold transition-colors duration-250 leading-none ${
                    workspaceTab === "moderator" ? "text-white" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Comments
                </span>
              </motion.button>

              {/* Tab 2: Analyses */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  handleTabChange("sentiment");
                }}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer select-none rounded-full border-none bg-transparent"
              >
                {workspaceTab === "sentiment" && (
                  <motion.div
                    layoutId="active-tab-bubble"
                    className="absolute inset-0 bg-slate-900 shadow-sm rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <TrendingUp
                  size={15}
                  className={`transition-transform duration-250 ${
                    workspaceTab === "sentiment" ? "text-white scale-110" : "text-slate-500 hover:text-slate-700"
                  }`}
                />
                <span
                  className={`text-[9px] mt-0.5 font-bold transition-colors duration-250 leading-none ${
                    workspaceTab === "sentiment" ? "text-white" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Analyses
                </span>
              </motion.button>

              {/* Tab 3: Chaînes */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  handleTabChange("channels");
                }}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer select-none rounded-full border-none bg-transparent"
              >
                {workspaceTab === "channels" && (
                  <motion.div
                    layoutId="active-tab-bubble"
                    className="absolute inset-0 bg-slate-900 shadow-sm rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <Users
                  size={15}
                  className={`transition-transform duration-250 ${
                    workspaceTab === "channels" ? "text-white scale-110" : "text-slate-500 hover:text-slate-700"
                  }`}
                />
                <span
                  className={`text-[9px] mt-0.5 font-bold transition-colors duration-250 leading-none ${
                    workspaceTab === "channels" ? "text-white" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Paramètres
                </span>
              </motion.button>
            </div>

            {/* Floating Filter Bubble Button next to the pill */}
            {workspaceTab === "moderator" && (
              <button
                onClick={() => setIsFilterSheetOpen(true)}
                className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 active:scale-95 hover:shadow-indigo-600/30 transition-all flex items-center justify-center cursor-pointer shrink-0 pointer-events-auto border border-indigo-500/10"
                id="filter-bubble-trigger"
                title="Ouvrir les filtres (iOS 17)"
              >
                <SlidersHorizontal size={16} />
              </button>
            )}
          </div>

        {/* Bottom stylized black/theme gradient fade overlay behind the floating pill menu */}
        <div 
          className={`absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-20 bg-gradient-to-t ${
            workspaceTab === "channels"
              ? "from-slate-900 via-slate-900/95 to-transparent"
              : isDarkMode 
                ? "from-[#111318] via-[#111318]/95 to-transparent" 
                : "from-white via-white/95 to-transparent"
          }`}
        />
      </div>

      {/* 4. iOS 17 BOTTOM SHEET FILTRES */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setIsFilterSheetOpen(false)}
              className="fixed inset-0 bg-slate-950/40 z-40"
            />

            {/* Sheet Content */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "20%" }} // This covers 80% of the screen height, leaving a 20% gap at the top.
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-[32px] shadow-2xl z-50 overflow-hidden flex flex-col border-t border-slate-200 max-w-[430px] mx-auto pb-6"
              style={{ height: "80%" }}
            >
              {/* iOS Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3 shrink-0 cursor-pointer" onClick={() => setIsFilterSheetOpen(false)} />
              
              {/* Header */}
              <div className="px-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">Filtres de recherche</h3>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setSentimentFilter("all");
                    setVideoFilter("all");
                    setSortBy("newest");
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-500 cursor-pointer transition-colors"
                >
                  Réinitialiser
                </button>
              </div>

              {/* Scrollable Filters form */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-5 bg-slate-100/30">
                {/* 1. Search */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Recherche libre
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par auteur, contenu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-50 border border-slate-250/50 rounded-xl pl-10 pr-4 py-2.5 text-xs w-full focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* 2. Video filter */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Filtrer par Vidéo
                    </label>
                  </div>
                  
                  {/* Segmented control for Type: Tout, Vidéos, Shorts */}
                  <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1 text-[11px] font-bold">
                    <button
                      onClick={() => {
                        setVideoTypeFilter("all");
                        setVideoFilter("all");
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-all duration-200 cursor-pointer ${
                        videoTypeFilter === "all"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-400"
                      }`}
                    >
                      🌐 Tout
                    </button>
                    <button
                      onClick={() => {
                        setVideoTypeFilter("video");
                        setVideoFilter("all");
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-all duration-200 cursor-pointer ${
                        videoTypeFilter === "video"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-400"
                      }`}
                    >
                      🎥 Vidéos
                    </button>
                    <button
                      onClick={() => {
                        setVideoTypeFilter("short");
                        setVideoFilter("all");
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-all duration-200 cursor-pointer ${
                        videoTypeFilter === "short"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-400"
                      }`}
                    >
                      ⚡ Shorts
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Active Video card styled as transparent square card */}
                    <button
                      onClick={() => setCustomVideoOpen(!customVideoOpen)}
                      className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-250/50 rounded-xl p-3 flex items-center justify-between text-xs text-slate-700 font-semibold transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs">
                          {videoTypeFilter === "short" ? "⚡" : "🎥"}
                        </span>
                        <span className="truncate">
                          {videoFilter === "all" 
                            ? (videoTypeFilter === "short" ? "Tous les Shorts" : videoTypeFilter === "video" ? "Toutes les vidéos standard" : "Toutes les vidéos") 
                            : videos.find(v => v.id === videoFilter)?.title || "Vidéo sélectionnée"}
                        </span>
                      </div>
                      <span className={`text-slate-400 text-[9px] transition-transform duration-250 ${customVideoOpen ? "rotate-180" : ""}`}>▼</span>
                    </button>

                    {/* Animated menu of video options */}
                    <AnimatePresence>
                      {customVideoOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden flex flex-col gap-1.5 pt-1.5"
                        >
                          {/* "Toutes les vidéos" option */}
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setVideoFilter("all");
                              setCustomVideoOpen(false);
                            }}
                            className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                              videoFilter === "all"
                                ? "bg-indigo-600/10 border-indigo-600 text-indigo-950 font-bold"
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                            }`}
                          >
                            🌟 {videoTypeFilter === "short" ? "Tous les Shorts" : videoTypeFilter === "video" ? "Toutes les vidéos standard" : "Toutes les vidéos"}
                          </motion.button>
                          {/* Map over actual videos filtered by type */}
                          {videos
                            .filter(v => {
                              const isShort = v.isShort || v.title.toLowerCase().includes("short");
                              if (videoTypeFilter === "video") return !isShort;
                              if (videoTypeFilter === "short") return isShort;
                              return true;
                            })
                            .map(v => (
                              <motion.button
                                key={v.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setVideoFilter(v.id);
                                  setCustomVideoOpen(false);
                                }}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer flex flex-col gap-0.5 ${
                                  videoFilter === v.id
                                    ? "bg-indigo-600/10 border-indigo-600 text-indigo-950 font-bold"
                                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                                }`}
                              >
                                <span className="font-semibold line-clamp-1">{v.title}</span>
                                <span className="text-[9px] opacity-65">Chaîne: {v.channelTitle || "YouTube"}</span>
                              </motion.button>
                            ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Apply Button Footer */}
              <div className="px-6 pt-4 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="w-full bg-indigo-600 text-white rounded-2xl py-3 text-xs font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <span>Appliquer les filtres ({filteredComments.length})</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. SYNC CHANNEL MODAL */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setIsSyncModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Youtube size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Simuler une nouvelle chaîne YouTube
                </h3>
                <p className="text-xs text-slate-500">
                  Importez une chaîne virtuelle et générez de vrais commentaires grâce à l'IA.
                </p>
              </div>
            </div>

            <form onSubmit={handleSyncChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Nom de la chaîne YouTube
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fitness Evolution, Alice Vlogs, Cinéma Critique..."
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Thématique de la chaîne
                </label>
                <select
                  value={newChannelCategory}
                  onChange={(e) => setNewChannelCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="Technologie">Technologie, IA & Informatique</option>
                  <option value="Cuisine">Cuisine, gastronomie & recettes</option>
                  <option value="Gaming">Jeux vidéo, stream & eSport</option>
                  <option value="Mode de vie">Voyage, vlogs & lifestyle</option>
                  <option value="Divertissement">Humour, cinéma & pop culture</option>
                </select>
              </div>

              {/* API Key alert warning inside modal */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Génération intelligente :</span>
                  {aiStatus.hasApiKey ? (
                    <span> Gemini va automatiquement créer des commentaires hautement réalistes adaptés à ce sujet.</span>
                  ) : (
                    <span> Pas de clé API configurée. Des commentaires réalistes prédéfinis seront simulés.</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-indigo-100"
                >
                  {syncing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Génération...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Créer et synchroniser</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
