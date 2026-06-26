import React from "react";
import { 
  Search, 
  MessageSquare, 
  CheckCircle, 
  HelpCircle, 
  AlertTriangle, 
  Heart,
  Filter,
  Ban,
  Clock,
  ThumbsUp
} from "lucide-react";
import { YTComment, YTVideo } from "../types";

interface CommentListProps {
  comments: YTComment[];
  videos: YTVideo[];
  activeComment: YTComment | null;
  onSelectComment: (comment: YTComment) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sentimentFilter: string;
  setSentimentFilter: (sentiment: string) => void;
  videoFilter: string;
  setVideoFilter: (videoId: string) => void;
}

export default function CommentList({
  comments,
  videos,
  activeComment,
  onSelectComment,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sentimentFilter,
  setSentimentFilter,
  videoFilter,
  setVideoFilter
}: CommentListProps) {

  // Apply filters
  const filteredComments = comments.filter((comment) => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === "" || 
      comment.authorName.toLowerCase().includes(query) ||
      comment.content.toLowerCase().includes(query) ||
      (comment.notes && comment.notes.toLowerCase().includes(query)) ||
      comment.tags.some(t => t.toLowerCase().includes(query));

    // 2. Status Filter
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "pending" && !comment.isReplied) ||
      (statusFilter === "replied" && comment.isReplied);

    // 3. Sentiment Filter
    const matchesSentiment = sentimentFilter === "all" || 
      comment.sentiment === sentimentFilter ||
      comment.category?.toLowerCase() === sentimentFilter.toLowerCase();

    // 4. Video Filter
    const matchesVideo = videoFilter === "all" || comment.videoId === videoFilter;

    return matchesSearch && matchesStatus && matchesSentiment && matchesVideo;
  });

  // Helpers for Badges
  const getSentimentBadge = (sentiment?: string, category?: string) => {
    switch (sentiment) {
      case "positive":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <Heart size={10} className="fill-emerald-400/20 text-emerald-400" />
            {category || "Positif"}
          </span>
        );
      case "question":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <HelpCircle size={10} />
            {category || "Question"}
          </span>
        );
      case "negative":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
            <AlertTriangle size={10} />
            {category || "Critique"}
          </span>
        );
      case "spam":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
            <Ban size={10} />
            Spam
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {category || "Neutre"}
          </span>
        );
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    return `Il y a ${diffDays} j`;
  };

  return (
    <div className="bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-100" id="comment-sidebar">
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-slate-800 space-y-3 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher auteur, mot-clé, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
            id="comment-search-input"
          />
        </div>

        {/* Video Filter Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Filtrer par vidéo</label>
          <select
            value={videoFilter}
            onChange={(e) => setVideoFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-red-500 rounded-lg text-xs font-medium focus:outline-none text-slate-300"
            id="video-filter-select"
          >
            <option value="all">Toutes les vidéos</option>
            {videos.map((vid) => (
              <option key={vid.id} value={vid.id}>
                {vid.title.substring(0, 45)}...
              </option>
            ))}
          </select>
        </div>

        {/* Reply Status Toggle Buttons */}
        <div className="flex space-x-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={() => setStatusFilter("all")}
            className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all ${
              statusFilter === "all" 
                ? "bg-slate-800 text-slate-100 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all ${
              statusFilter === "pending" 
                ? "bg-amber-950/40 text-amber-400 border border-amber-900/40 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setStatusFilter("replied")}
            className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all ${
              statusFilter === "replied" 
                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Répondus
          </button>
        </div>

        {/* Sentiment Category Filter Pills */}
        <div className="flex flex-wrap gap-1 pt-1" id="sentiment-filters">
          {[
            { value: "all", label: "Tous types" },
            { value: "positive", label: "Positifs" },
            { value: "question", label: "Questions" },
            { value: "negative", label: "Critiques" },
            { value: "spam", label: "Spams" }
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setSentimentFilter(pill.value)}
              className={`px-2 py-1 text-[10px] font-medium rounded-full border transition-all ${
                sentimentFilter === pill.value
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : "bg-slate-950 text-slate-400 border-slate-800/80 hover:text-slate-200"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comments List Panel */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50" id="comment-list-container">
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <MessageSquare size={32} className="mx-auto text-slate-600 animate-pulse" />
            <p className="text-xs">Aucun commentaire ne correspond à vos filtres.</p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const isActive = activeComment?.id === comment.id;
            return (
              <div
                key={comment.id}
                onClick={() => onSelectComment(comment)}
                className={`p-4 transition-all cursor-pointer select-none text-left relative ${
                  isActive 
                    ? "bg-slate-800/80 border-l-4 border-red-500" 
                    : "hover:bg-slate-800/30 bg-slate-900/40"
                }`}
                id={`comment-item-${comment.id}`}
              >
                <div className="flex items-start space-x-3">
                  {/* Author Avatar */}
                  <img
                    src={comment.authorAvatar}
                    alt={comment.authorName}
                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-700"
                  />

                  {/* Comment Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 truncate pr-1">
                        {comment.authorName}
                      </span>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {getRelativeTime(comment.publishedAt)}
                      </span>
                    </div>

                    {/* Comment Content Preview */}
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {comment.content}
                    </p>

                    {/* Metadata indicators */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      {/* Sentiment Badge */}
                      {getSentimentBadge(comment.sentiment, comment.category)}

                      {/* Reply Status Badge */}
                      {comment.isReplied ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                          <CheckCircle size={8} /> Répondu
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                          <Clock size={8} /> En attente
                        </span>
                      )}

                      {/* Likes indicator */}
                      {comment.likeCount > 0 && (
                        <span className="px-1 py-0.5 text-[9px] text-slate-400 flex items-center gap-0.5">
                          <ThumbsUp size={8} /> {comment.likeCount}
                        </span>
                      )}

                      {/* Tags Indicator */}
                      {comment.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 text-[9px] font-medium bg-slate-800 text-slate-400 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800/60 text-center text-[10px] text-slate-500 font-mono shrink-0">
        Affichage : {filteredComments.length} sur {comments.length} commentaires
      </div>
    </div>
  );
}
