import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes: string[];
  dislikes: string[];
  city: string;
  language: string;
}
const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState<Map<string, string | null>>(new Map());
  const [translating, setTranslating] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const userCityRef = useRef("");

  // Resolve user city from geolocation (best-effort, never blocks posting)
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const data = await res.json();
          const addr = data?.address || {};
          userCityRef.current = addr.city || addr.town || addr.village || "";
        } catch {
          // silently keep empty
        }
      },
      () => {
        // geolocation denied / unavailable — keep empty
      }
    );
  }, []);
  const fetchedComments = [
    {
      _id: "1",
      videoid: videoId,
      userid: "1",
      commentbody: "Great video! Really enjoyed watching this.",
      usercommented: "John Doe",
      commentedon: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: "2",
      videoid: videoId,
      userid: "2",
      commentbody: "Thanks for sharing this amazing content!",
      usercommented: "Jane Smith",
      commentedon: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div>Loading history...</div>;
  }

  // Simple script-based language detection
  const detectLang = (text: string): string => {
    const scripts: [RegExp, string][] = [
      [/[\u0900-\u097F]/, "hi"],   // Devanagari → Hindi
      [/[\u0600-\u06FF]/, "ar"],   // Arabic
      [/[\u4E00-\u9FFF]/, "zh"],   // CJK → Chinese
      [/[\u0400-\u04FF]/, "ru"],   // Cyrillic → Russian
      [/[\uAC00-\uD7AF]/, "ko"],  // Hangul → Korean
      [/[\u3040-\u30FF]/, "ja"],   // Hiragana/Katakana → Japanese
      [/[\u0B80-\u0BFF]/, "ta"],   // Tamil
      [/[\u0980-\u09FF]/, "bn"],   // Bengali
      [/[\u0E00-\u0E7F]/, "th"],   // Thai
    ];
    for (const [regex, lang] of scripts) {
      if (regex.test(text)) return lang;
    }
    return "en";
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        city: userCityRef.current,
        language: detectLang(newComment),
      });
      if (res.data.comment) {
        // Reload from server so the new comment has a real MongoDB _id
        // (using a fake Date.now() id would cause 404s on edit/delete/like/dislike)
        await loadComments();
      }
      setNewComment("");
    } catch (error: any) {
      if (error?.response?.status === 400) {
        const msg = error.response.data?.message || "Comment contains invalid characters";
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
      } else {
        console.error("Error adding comment:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/comment/likecomment/${commentId}`, {
        userId: user._id,
      });
      setComments((prev) =>
        prev.map((c) => {
          if (c._id !== commentId) return c;
          const alreadyLiked = c.likes.includes(user._id);
          let newLikes = [...c.likes];
          let newDislikes = c.dislikes.filter((id) => id !== user._id);
          if (alreadyLiked) {
            newLikes = newLikes.filter((id) => id !== user._id);
          } else {
            newLikes.push(user._id);
          }
          return { ...c, likes: newLikes, dislikes: newDislikes };
        })
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislikeComment = async (commentId: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(
        `/comment/dislikecomment/${commentId}`,
        { userId: user._id }
      );
      if (res.data.removed) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        return;
      }
      setComments((prev) =>
        prev.map((c) => {
          if (c._id !== commentId) return c;
          const alreadyDisliked = c.dislikes.includes(user._id);
          let newDislikes = [...c.dislikes];
          let newLikes = c.likes.filter((id) => id !== user._id);
          if (alreadyDisliked) {
            newDislikes = newDislikes.filter((id) => id !== user._id);
          } else {
            newDislikes.push(user._id);
          }
          return { ...c, likes: newLikes, dislikes: newDislikes };
        })
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out]"
          style={{ animation: "slideDown 0.3s ease-out" }}
        >
          <div className="flex items-center gap-3 bg-red-500 text-white px-5 py-3 rounded-lg shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span className="text-sm font-medium">{toastMsg}</span>
            <button
              className="ml-2 text-white/80 hover:text-white text-lg leading-none"
              onClick={() => setToastMsg(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src="" />
                <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {comment.usercommented}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                  </span>
                </div>
                {comment.city && (
                  <p className="text-xs text-muted-foreground -mt-0.5 mb-1">
                    {comment.city}
                  </p>
                )}

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const translated = translations.get(comment._id);
                      const isTranslating = translating.has(comment._id);
                      if (isTranslating) {
                        return <div className="bg-muted animate-pulse h-4 rounded" />;
                      }
                      if (translated) {
                        return (
                          <div>
                            <p className="text-sm">{translated}</p>
                            <button
                              className="text-xs text-blue-500 hover:underline mt-1"
                              onClick={() => setTranslations((prev) => {
                                const next = new Map(prev);
                                next.set(comment._id, null);
                                return next;
                              })}
                            >
                              Show original
                            </button>
                          </div>
                        );
                      }
                      return <p className="text-sm">{comment.commentbody}</p>;
                    })()}
                    {comment.language && comment.language !== "en" && (
                      (() => {
                        const translated = translations.get(comment._id);
                        const isTranslating = translating.has(comment._id);
                        if (translated) {
                          return (
                            <span className="text-xs text-muted-foreground mt-1 block">
                              Translated to English
                            </span>
                          );
                        }
                        return (
                          <button
                            className="text-xs text-blue-500 hover:underline mt-1 block disabled:opacity-50"
                            disabled={isTranslating}
                            onClick={async () => {
                              setTranslating((prev) => new Set(prev).add(comment._id));
                              try {
                                const res = await fetch(
                                  `https://api.mymemory.translated.net/get?q=${encodeURIComponent(comment.commentbody)}&langpair=${comment.language}|en`
                                );
                                const data = await res.json();
                                const translated = data?.responseData?.translatedText;
                                setTranslations((prev) => {
                                  const next = new Map(prev);
                                  next.set(comment._id, translated || "Translation unavailable");
                                  return next;
                                });
                              } catch {
                                setTranslations((prev) => {
                                  const next = new Map(prev);
                                  next.set(comment._id, "Translation unavailable");
                                  return next;
                                });
                              } finally {
                                setTranslating((prev) => {
                                  const next = new Set(prev);
                                  next.delete(comment._id);
                                  return next;
                                });
                              }
                            }}
                          >
                            Translate
                          </button>
                        );
                      })()
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        disabled={!user}
                        onClick={() => handleLikeComment(comment._id)}
                      >
                        <ThumbsUp
                          className={`w-4 h-4 ${
                            user && comment.likes?.includes(user._id)
                              ? "fill-current"
                              : ""
                          }`}
                        />
                        {comment.likes?.length || 0}
                      </button>
                      <button
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        disabled={!user}
                        onClick={() => handleDislikeComment(comment._id)}
                      >
                        <ThumbsDown
                          className={`w-4 h-4 ${
                            user && comment.dislikes?.includes(user._id)
                              ? "fill-current"
                              : ""
                          }`}
                        />
                        {comment.dislikes?.length || 0}
                      </button>
                    </div>
                    {comment.userid === user?._id && (
                      <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                        <button onClick={() => handleEdit(comment)}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(comment._id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
