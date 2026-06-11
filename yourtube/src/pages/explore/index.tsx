import Head from "next/head";
import ExploreContent from "@/components/ExploreContent";

export default function ExplorePage() {
  return (
    <>
      <Head>
        <title>Explore - Yourtube</title>
        <meta name="description" content="Discover trending and recommended videos on Yourtube" />
      </Head>
      <main className="flex-1 px-4 md:px-6 py-6 overflow-y-auto">
        <ExploreContent />
      </main>
    </>
  );
}
