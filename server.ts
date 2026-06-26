import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { YTComment } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ==========================================
// DATASETS & MEMORY STATE
// ==========================================

const CHANNELS = [
  {
    id: "tech_craft",
    name: "TechCraft France",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60",
    subscriberCount: 245000
  },
  {
    id: "cuisine_sophie",
    name: "La Cuisine de Sophie",
    avatar: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&auto=format&fit=crop&q=60",
    subscriberCount: 89000
  },
  {
    id: "levelup_gaming",
    name: "LevelUp Gaming",
    avatar: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=150&auto=format&fit=crop&q=60",
    subscriberCount: 512000
  }
];

const VIDEOS = [
  // TechCraft
  {
    id: "v_tech_1",
    channelId: "tech_craft",
    title: "J'ai testé l'IA de Google pendant 30 jours (Incroyable !)",
    thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&auto=format&fit=crop&q=60",
    publishedAt: "2026-06-20T14:00:00Z",
    viewCount: 45200,
    commentCount: 154
  },
  {
    id: "v_tech_2",
    channelId: "tech_craft",
    title: "Pourquoi TOUT LE MONDE achète ce clavier mécanique ?",
    thumbnail: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&auto=format&fit=crop&q=60",
    publishedAt: "2026-06-15T16:30:00Z",
    viewCount: 18900,
    commentCount: 68
  },
  // Cuisine de Sophie
  {
    id: "v_cook_1",
    channelId: "cuisine_sophie",
    title: "Le secret pour réussir ses Macarons à TOUS les coups !",
    thumbnail: "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=400&auto=format&fit=crop&q=60",
    publishedAt: "2026-06-22T09:00:00Z",
    viewCount: 12500,
    commentCount: 42
  },
  {
    id: "v_cook_2",
    channelId: "cuisine_sophie",
    title: "Tarte Tatin express : Prête en seulement 20 minutes !",
    thumbnail: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=400&auto=format&fit=crop&q=60",
    publishedAt: "2026-06-10T10:00:00Z",
    viewCount: 34100,
    commentCount: 95
  },
  // LevelUp Gaming
  {
    id: "v_game_1",
    channelId: "levelup_gaming",
    title: "J'AI ENFIN BATTU LE BOSS LE PLUS DUR DE ELDEN RING !",
    thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=60",
    publishedAt: "2026-06-23T18:00:00Z",
    viewCount: 102000,
    commentCount: 412,
    isShort: false
  },
  // Shorts (Short format videos)
  {
    id: "v_tech_3",
    channelId: "tech_craft",
    title: "L'astuce Windows 11 cachée que personne ne connaît ! 💻 #shorts",
    thumbnail: "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=400&auto=format&fit=crop&q=60",
    publishedAt: "2026-06-24T12:00:00Z",
    viewCount: 98400,
    commentCount: 35,
    isShort: true
  },
  {
    id: "v_cook_3",
    channelId: "cuisine_sophie",
    title: "L'erreur de cuisson que tout le monde fait ! 🍳 #shorts",
    thumbnail: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=60",
    publishedAt: "2026-06-23T11:00:00Z",
    viewCount: 45000,
    commentCount: 18,
    isShort: true
  },
  {
    id: "v_game_2",
    channelId: "levelup_gaming",
    title: "Ce secret caché sur Elden Ring va vous souffler ! 🎮 #shorts",
    thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop&q=60",
    publishedAt: "2026-06-24T17:00:00Z",
    viewCount: 154000,
    commentCount: 88,
    isShort: true
  }
];

// In-memory comment storage
let commentsDatabase: YTComment[] = [
  // TechCraft France Comments
  {
    id: "c_1",
    videoId: "v_tech_1",
    videoTitle: "J'ai testé l'IA de Google pendant 30 jours (Incroyable !)",
    authorName: "Lucas Martin",
    authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60",
    content: "Franchement super vidéo ! Tu penses que ça peut remplacer le travail de développeur junior d'ici 2 ans ? Je m'inquiète un peu pour mes études...",
    publishedAt: "2026-06-24T08:12:00Z",
    likeCount: 42,
    sentiment: "question",
    category: "Question",
    language: "fr",
    isReplied: false,
    tags: ["Important", "IA Dev"],
    notes: "Lucas semble un peu inquiet pour son avenir, lui faire une réponse rassurante."
  },
  {
    id: "c_2",
    videoId: "v_tech_1",
    videoTitle: "J'ai testé l'IA de Google pendant 30 jours (Incroyable !)",
    authorName: "Sarah Connor",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60",
    content: "This video is extremely insightful. Even though my French is basic, I could follow easily. AI tools are getting crazy indeed!",
    publishedAt: "2026-06-24T07:45:00Z",
    likeCount: 15,
    sentiment: "positive",
    category: "Félicitation",
    language: "en",
    translation: "Cette vidéo est extrêmement perspicace. Même si mon français est basique, j'ai pu suivre facilement. Les outils d'IA deviennent vraiment fous !",
    isReplied: false,
    tags: ["International"],
    notes: ""
  },
  {
    id: "c_3",
    videoId: "v_tech_1",
    videoTitle: "J'ai testé l'IA de Google pendant 30 jours (Incroyable !)",
    authorName: "Kévin Du77",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60",
    content: "C'est du placement de produit déguisé votre vidéo là... Marre de la pub partout sur cette chaîne.",
    publishedAt: "2026-06-23T22:30:00Z",
    likeCount: 3,
    sentiment: "negative",
    category: "Critique",
    language: "fr",
    isReplied: false,
    tags: ["Critique"],
    notes: ""
  },
  {
    id: "c_4",
    videoId: "v_tech_1",
    videoTitle: "J'ai testé l'IA de Google pendant 30 jours (Incroyable !)",
    authorName: "Thomas Leroy",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60",
    content: "Excellent montage ! Toujours au top, les explications sont d'une clarté incroyable. Merci pour ce travail.",
    publishedAt: "2026-06-23T19:15:00Z",
    likeCount: 112,
    sentiment: "positive",
    category: "Félicitation",
    language: "fr",
    isReplied: true,
    replyText: "Merci infiniment Thomas ! Vos commentaires réguliers font extrêmement chaud au cœur. On continue !",
    replyPublishedAt: "2026-06-23T20:00:00Z",
    tags: [],
    notes: ""
  },
  {
    id: "c_5",
    videoId: "v_tech_2",
    videoTitle: "Pourquoi TOUT LE MONDE achète ce clavier mécanique ?",
    authorName: "Alice Dubois",
    authorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=60",
    content: "Tu as un lien pour acheter le modèle blanc avec les switchs tactiles marron ? Merci !",
    publishedAt: "2026-06-16T10:05:00Z",
    likeCount: 8,
    sentiment: "question",
    category: "Question",
    language: "fr",
    isReplied: false,
    tags: ["Lien d'affiliation"],
    notes: ""
  },
  {
    id: "c_6",
    videoId: "v_tech_2",
    videoTitle: "Pourquoi TOUT LE MONDE achète ce clavier mécanique ?",
    authorName: "Marc V.",
    authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60",
    content: "Gagner de l'argent sur internet facilement sans travailler cliquez sur mon profil !!!",
    publishedAt: "2026-06-16T08:00:00Z",
    likeCount: 0,
    sentiment: "spam",
    category: "Spam",
    language: "fr",
    isReplied: false,
    tags: ["Spam", "À supprimer"],
    notes: ""
  },

  // Cuisine de Sophie Comments
  {
    id: "c_7",
    videoId: "v_cook_1",
    videoTitle: "Le secret pour réussir ses Macarons à TOUS les coups !",
    authorName: "Nathalie Durand",
    authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60",
    content: "Bonjour Sophie ! Est-ce qu'on peut remplacer la poudre d'amande par de la poudre de noisette ? Mon fils est allergique aux amandes... Merci beaucoup !",
    publishedAt: "2026-06-23T11:20:00Z",
    likeCount: 22,
    sentiment: "question",
    category: "Question",
    language: "fr",
    isReplied: false,
    tags: ["Ingrédients", "Allergie"],
    notes: "Répondre rapidement que oui, la poudre de noisette fonctionne à merveille."
  },
  {
    id: "c_8",
    videoId: "v_cook_1",
    videoTitle: "Le secret pour réussir ses Macarons à TOUS les coups !",
    authorName: "Jean-Pierre",
    authorAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=60",
    content: "J'ai suivi votre recette à la lettre cet après-midi, et c'est une vraie réussite ! Mes premiers macarons parfaits. Ma femme n'en revient pas !",
    publishedAt: "2026-06-22T20:10:00Z",
    likeCount: 54,
    sentiment: "positive",
    category: "Félicitation",
    language: "fr",
    isReplied: false,
    tags: ["Succès"],
    notes: ""
  },
  {
    id: "c_9",
    videoId: "v_cook_2",
    videoTitle: "Tarte Tatin express : Prête en seulement 20 minutes !",
    authorName: "Chloé Petit",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60",
    content: "20 minutes au four mais combien de temps de préparation réelle ? Ça a l'air un peu plus long quand même.",
    publishedAt: "2026-06-11T14:22:00Z",
    likeCount: 14,
    sentiment: "neutral",
    category: "Critique",
    language: "fr",
    isReplied: true,
    replyText: "Bonjour Chloé ! La préparation prend environ 10 minutes (peler les pommes et étaler la pâte), le reste se fait au four ! C'est vraiment très rapide.",
    replyPublishedAt: "2026-06-12T09:00:00Z",
    tags: [],
    notes: ""
  },

  // LevelUp Gaming Comments
  {
    id: "c_10",
    videoId: "v_game_1",
    videoTitle: "J'AI ENFIN BATTU LE BOSS LE PLUS DUR DE ELDEN RING !",
    authorName: "GamerPro99",
    authorAvatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=60",
    content: "Franchement tu as trop géré sur la phase 2 ! Quel build tu utilises pour avoir autant de dégâts de foudre ?",
    publishedAt: "2026-06-24T05:30:00Z",
    likeCount: 89,
    sentiment: "question",
    category: "Question",
    language: "fr",
    isReplied: false,
    tags: ["Build Elden"],
    notes: ""
  },
  {
    id: "c_11",
    videoId: "v_game_1",
    videoTitle: "J'AI ENFIN BATTU LE BOSS LE PLUS DUR DE ELDEN RING !",
    authorName: "DarkSoulFan",
    authorAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=60",
    content: "Lol you summon mimic tear, that doesn't count as beating the boss. Try solo without summon next time.",
    publishedAt: "2026-06-24T02:15:00Z",
    likeCount: -4,
    sentiment: "negative",
    category: "Critique",
    language: "en",
    translation: "Mdr tu as invoqué la larme imitatrice, ça ne compte pas comme battre le boss. Essaie en solo sans invocation la prochaine fois.",
    isReplied: false,
    tags: ["Toxic"],
    notes: ""
  },
  {
    id: "c_short_1",
    videoId: "v_tech_3",
    videoTitle: "L'astuce Windows 11 cachée que personne ne connaît ! 💻 #shorts",
    authorName: "Jean-Paul B.",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60",
    content: "Incroyable cette astuce ! Je savais même pas qu'on pouvait faire Win + V pour voir l'historique du presse-papier !",
    publishedAt: "2026-06-24T12:05:00Z",
    likeCount: 15,
    sentiment: "positive",
    category: "Félicitation",
    language: "fr",
    isReplied: false,
    tags: ["Astuce Windows"],
    notes: ""
  },
  {
    id: "c_short_2",
    videoId: "v_cook_3",
    videoTitle: "L'erreur de cuisson que tout le monde fait ! 🍳 #shorts",
    authorName: "Julie Petit",
    authorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=60",
    content: "Mais oui tellement vrai ! C'est pour ça que mes omelettes étaient toujours sèches !",
    publishedAt: "2026-06-23T11:15:00Z",
    likeCount: 34,
    sentiment: "positive",
    category: "Félicitation",
    language: "fr",
    isReplied: false,
    tags: ["Cuisine"],
    notes: ""
  },
  {
    id: "c_short_3",
    videoId: "v_game_2",
    videoTitle: "Ce secret caché sur Elden Ring va vous souffler ! 🎮 #shorts",
    authorName: "GamerPro99",
    authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=60",
    content: "C'est sérieux ? Est-ce qu'on peut encore y accéder après la mise à jour 1.10 ?",
    publishedAt: "2026-06-24T17:12:00Z",
    likeCount: 77,
    sentiment: "question",
    category: "Question",
    language: "fr",
    isReplied: false,
    tags: ["Secret Elden"],
    notes: ""
  }
];

// ==========================================
// API ENDPOINTS
// ==========================================

// Get all channels
app.get("/api/channels", (req, res) => {
  res.json(CHANNELS);
});

// Get videos by channel ID
app.get("/api/videos", (req, res) => {
  const { channelId } = req.query;
  if (!channelId) {
    return res.status(400).json({ error: "Missing channelId" });
  }
  const filteredVideos = VIDEOS.filter(v => v.channelId === channelId);
  res.json(filteredVideos);
});

// Get comments for a channel or specific video
app.get("/api/comments", (req, res) => {
  const { channelId, videoId } = req.query;
  
  let filtered = [...commentsDatabase];

  if (videoId) {
    filtered = filtered.filter(c => c.videoId === videoId);
  } else if (channelId) {
    // Find all videos for this channel
    const channelVideoIds = VIDEOS.filter(v => v.channelId === channelId).map(v => v.id);
    filtered = filtered.filter(c => channelVideoIds.includes(c.videoId));
  }

  res.json(filtered);
});

// Submit/save a reply to a comment
app.post("/api/reply", (req, res) => {
  const { commentId, replyText } = req.body;
  if (!commentId || !replyText) {
    return res.status(400).json({ error: "commentId and replyText are required" });
  }

  const commentIndex = commentsDatabase.findIndex(c => c.id === commentId);
  if (commentIndex === -1) {
    return res.status(404).json({ error: "Comment not found" });
  }

  // Update comment in memory
  commentsDatabase[commentIndex] = {
    ...commentsDatabase[commentIndex],
    isReplied: true,
    replyText: replyText,
    replyPublishedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    comment: commentsDatabase[commentIndex]
  });
});

// Update tags or notes for a comment
app.post("/api/comments/update", (req, res) => {
  const { commentId, tags, notes } = req.body;
  if (!commentId) {
    return res.status(400).json({ error: "commentId is required" });
  }

  const commentIndex = commentsDatabase.findIndex(c => c.id === commentId);
  if (commentIndex === -1) {
    return res.status(404).json({ error: "Comment not found" });
  }

  if (tags !== undefined) {
    commentsDatabase[commentIndex].tags = tags;
  }
  if (notes !== undefined) {
    commentsDatabase[commentIndex].notes = notes;
  }

  res.json({
    success: true,
    comment: commentsDatabase[commentIndex]
  });
});

// Add a simulated custom youtube channel / sync and generate comments using Gemini
app.post("/api/channels/sync", async (req, res) => {
  const { channelName, category } = req.body;
  if (!channelName) {
    return res.status(400).json({ error: "channelName is required" });
  }

  const newChannelId = `custom_${Date.now()}`;
  const newChannel = {
    id: newChannelId,
    name: channelName,
    avatar: "https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=150&auto=format&fit=crop&q=60",
    subscriberCount: Math.floor(Math.random() * 80000) + 1200
  };

  const newVideos = [
    {
      id: `v_${newChannelId}_1`,
      channelId: newChannelId,
      title: `Mon premier vlog sur ${category || "les technologies"} !`,
      thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&auto=format&fit=crop&q=60",
      publishedAt: new Date().toISOString(),
      viewCount: 1520,
      commentCount: 3
    }
  ];

  CHANNELS.push(newChannel);
  VIDEOS.push(...newVideos);

  // Generate realistic comments using Gemini or fallback
  const ai = getGeminiClient();
  let generatedComments = [];

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Génère 3 commentaires YouTube très réalistes pour une vidéo intitulée "${newVideos[0].title}" sur la chaîne "${channelName}".
        Renvoie la réponse uniquement sous forme d'un tableau JSON valide, sans balise markdown de code, contenant des objets avec ces champs exacts:
        - authorName (string, nom français réaliste)
        - content (string, le texte du commentaire en français ou en anglais pour l'un d'eux, parlant du sujet)
        - publishedAt (string, date récente, ex: "2026-06-24T05:00:00Z")
        - likeCount (number, entre 0 et 30)
        - sentiment (string: "positive", "neutral", "negative", "question" ou "spam")
        - category (string: "Question", "Félicitation", "Critique", "Spam" ou "Autre")
        Assure-toi que le JSON est parfaitement valide.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                authorName: { type: Type.STRING },
                content: { type: Type.STRING },
                publishedAt: { type: Type.STRING },
                likeCount: { type: Type.INTEGER },
                sentiment: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["authorName", "content", "publishedAt", "likeCount", "sentiment", "category"]
            }
          }
        }
      });

      const parsed = JSON.parse(response.text.trim());
      generatedComments = parsed.map((c: any, index: number) => ({
        id: `c_custom_${Date.now()}_${index}`,
        channelId: newChannelId,
        videoId: newVideos[0].id,
        videoTitle: newVideos[0].title,
        authorName: c.authorName,
        authorAvatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=100&auto=format&fit=crop&q=60`,
        content: c.content,
        publishedAt: c.publishedAt,
        likeCount: c.likeCount,
        sentiment: c.sentiment || "positive",
        category: c.category || "Félicitation",
        language: "fr",
        isReplied: false,
        tags: [],
        notes: ""
      }));
    } catch (e) {
      console.error("Failed to generate custom comments with Gemini:", e);
    }
  }

  // Fallback if Gemini failed or is not available
  if (generatedComments.length === 0) {
    generatedComments = [
      {
        id: `c_custom_${Date.now()}_1`,
        channelId: newChannelId,
        videoId: newVideos[0].id,
        videoTitle: newVideos[0].title,
        authorName: "Nicolas Bernard",
        authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60",
        content: "Super vidéo ! Le concept est top, j'ai hâte de voir les prochains épisodes.",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        likeCount: 5,
        sentiment: "positive",
        category: "Félicitation",
        language: "fr",
        isReplied: false,
        tags: [],
        notes: ""
      },
      {
        id: `c_custom_${Date.now()}_2`,
        channelId: newChannelId,
        videoId: newVideos[0].id,
        videoTitle: newVideos[0].title,
        authorName: "Julie Petit",
        authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60",
        content: "Est-ce que tu pourras faire une vidéo sur les coulisses de ton montage ? Merci d'avance !",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        likeCount: 2,
        sentiment: "question",
        category: "Question",
        language: "fr",
        isReplied: false,
        tags: ["Idée vidéo"],
        notes: ""
      }
    ];
  }

  commentsDatabase.push(...generatedComments);

  res.json({
    success: true,
    channel: newChannel,
    videos: newVideos,
    comments: generatedComments
  });
});

// Single comment analyze and reply drafting using Gemini AI
app.post("/api/comments/analyze", async (req, res) => {
  const { content, authorName, videoTitle } = req.body;
  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  const ai = getGeminiClient();
  
  if (!ai) {
    // Rule-based fallback simulator if no Gemini API Key
    const isEn = /the|and|is|you|to|not|my/i.test(content);
    const translation = isEn ? "Traduction simulée en français de votre message." : undefined;
    
    // Simple draft creator
    let draft = "Merci pour votre commentaire !";
    if (content.includes("?")) {
      draft = "Bonjour, merci pour votre question ! Je prépare un retour détaillé à ce sujet très rapidement.";
    }

    return res.json({
      success: true,
      sentiment: content.includes("?") ? "question" : "positive",
      category: content.includes("?") ? "Question" : "Félicitation",
      translation: translation,
      replyDraft: draft,
      isSimulated: true
    });
  }

  try {
    const videoTitleStr = videoTitle || "vidéo YouTube";

    const prompt = `Analyse le commentaire YouTube suivant et fournis des informations d'organisation structurées.
    
    Vidéo: "${videoTitleStr}"
    Auteur: "${authorName || "Inconnu"}"
    Commentaire: "${content}"

    Tâches requises:
    1. Détermine le sentiment du commentaire: "positive", "neutral", "negative", "question", ou "spam".
    2. Détermine la catégorie: "Question", "Félicitation", "Critique", "Spam", "Urgent", ou "Autre".
    3. Identifie la langue d'origine (ex: "fr", "en", "es").
    4. Si la langue n'est pas le français, traduis fidèlement le commentaire en français. Sinon, laisse la traduction vide.
    5. Génère un projet de réponse (replyDraft) en français, professionnel, poli, engageant et chaleureux, adapté au ton d'un créateur YouTube qui s'adresse à sa communauté. S'il s'agit d'un spam, le projet doit être "[Spam détecté - Aucune réponse recommandée]".

    Renvoie UNIQUEMENT un objet JSON valide avec les propriétés suivantes:
    {
      "sentiment": "positive" | "neutral" | "negative" | "question" | "spam",
      "category": "Question" | "Félicitation" | "Critique" | "Spam" | "Urgent" | "Autre",
      "language": "string",
      "translation": "string ou vide",
      "replyDraft": "string"
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING },
            category: { type: Type.STRING },
            language: { type: Type.STRING },
            translation: { type: Type.STRING },
            replyDraft: { type: Type.STRING }
          },
          required: ["sentiment", "category", "language", "replyDraft"]
        }
      }
    });

    const result = JSON.parse(response.text.trim());

    res.json({
      success: true,
      ...result,
      isSimulated: false
    });
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Single comment translate to creator's language (French)
app.post("/api/comments/translate", async (req, res) => {
  const { content, targetLanguage = "fr" } = req.body;
  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  const ai = getGeminiClient();
  const langName = targetLanguage === "fr" ? "français" : targetLanguage;

  if (!ai) {
    // Simulation fallback if no Gemini key
    const isAlreadyFr = !(/the|and|is|you|to|not|my|love|awesome|great/i.test(content));
    const translation = isAlreadyFr 
      ? content 
      : `[Traduction simulée en ${langName}] : ${content} (Traduit automatiquement)`;
    
    return res.json({
      success: true,
      language: isAlreadyFr ? "fr" : "en",
      translation: translation,
      isSimulated: true
    });
  }

  try {
    const prompt = `Traduis le commentaire YouTube suivant en ${langName}.
    
    Commentaire d'origine: "${content}"
    
    Renvoie UNIQUEMENT un objet JSON valide avec les propriétés suivantes:
    {
      "language": "la langue d'origine détectée (ex: 'en', 'es', 'ja', 'fr')",
      "translation": "la traduction fidèle en ${langName}"
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING },
            translation: { type: Type.STRING }
          },
          required: ["language", "translation"]
        }
      }
    });

    const result = JSON.parse(response.text.trim());

    res.json({
      success: true,
      ...result,
      isSimulated: false
    });
  } catch (error: any) {
    console.error("Gemini translation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk analyze comments
app.post("/api/comments/bulk-analyze", async (req, res) => {
  const { comments } = req.body;
  if (!comments || !Array.isArray(comments)) {
    return res.status(400).json({ error: "comments array is required" });
  }

  const results = [];
  const ai = getGeminiClient();

  for (const comment of comments) {
    if (!ai) {
      // Simple fallback simulation
      results.push({
        id: comment.id,
        sentiment: comment.content.includes("?") ? "question" : "positive",
        category: comment.content.includes("?") ? "Question" : "Félicitation",
        replyDraft: `Merci beaucoup pour votre commentaire ${comment.authorName} !`
      });
      continue;
    }

    try {
      const prompt = `Analyse brièvement ce commentaire de "${comment.authorName}" sur la vidéo "${comment.videoTitle || "vidéo"}":
      "${comment.content}"
      
      Renvoie UNIQUEMENT un objet JSON:
      {
        "sentiment": "positive" | "neutral" | "negative" | "question" | "spam",
        "category": "Question" | "Félicitation" | "Critique" | "Spam" | "Urgent" | "Autre",
        "replyDraft": "Projet de réponse poli et chaleureux en français"
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentiment: { type: Type.STRING },
              category: { type: Type.STRING },
              replyDraft: { type: Type.STRING }
            },
            required: ["sentiment", "category", "replyDraft"]
          }
        }
      });

      const result = JSON.parse(response.text.trim());
      results.push({
        id: comment.id,
        ...result
      });
    } catch (e) {
      console.error(`Bulk analysis failed for comment ${comment.id}:`, e);
    }
  }

  res.json({
    success: true,
    results
  });
});

// Help/health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
  });
});

// ==========================================
// VITE DEV SERVER & STATIC MIDDLEWARE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[YouTube Comment Studio] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
