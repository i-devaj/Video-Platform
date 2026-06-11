import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [videos, setvideo] = useState<any>(null);
  const [video, setvide] = useState<any>(null);
  const [loading, setloading] = useState(true);
  const [commentsHighlighted, setCommentsHighlighted] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const found = res.data?.filter((vid: any) => vid._id === id);
        setvideo(found[0]);
        setvide(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [id]);

  const handleOpenComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth" });
    setCommentsHighlighted(true);
    setTimeout(() => setCommentsHighlighted(false), 1500);
  };

  const handleSkipToNext = () => {
    if (!video || !id || video.length < 2) return;
    const currentIndex = video.findIndex((v: any) => v._id === id);
    // Wrap around: if at the end (or not found), go to the first video
    const nextIndex = currentIndex !== -1 && currentIndex < video.length - 1
      ? currentIndex + 1
      : 0;
    router.push(`/watch/${video[nextIndex]._id}`);
  };

  if (loading) {
    return <div>Loading..</div>;
  }

  if (!videos) {
    return <div>Video not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:p-4 py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-2/3 space-y-4">
            <Videopplayer
              video={videos}
              onOpenComments={handleOpenComments}
              onSkipToNext={handleSkipToNext}
            />
            <VideoInfo video={videos} />
            <div
              ref={commentsRef}
              className={`transition-all duration-500 rounded-lg ${
                commentsHighlighted ? "ring-2 ring-blue-500 p-2" : ""
              }`}
            >
              <Comments videoId={id} />
            </div>
          </div>
          <div className="w-full lg:w-1/3 space-y-4">
            <RelatedVideos videos={video} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
