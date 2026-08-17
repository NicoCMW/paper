import type { Asset } from "../domain/model";

export type YoutubeSampleVideo = {
  id: string;
  title: string;
  channel: string;
  views: string;
  age: string;
  duration: string;
  samplePath: string;
};

export type YoutubePreviewVideo = YoutubeSampleVideo & {
  asset?: Asset;
  isTarget?: boolean;
};

// This catalog is deliberately independent from the Canvas. A preview is a
// YouTube context, so its neighbours must never be borrowed from the user's
// current Canvas selection.
export const YOUTUBE_SAMPLE_CATALOG: YoutubeSampleVideo[] = [
  { id: "alex-hormozi-ai-business", title: "How to Use AI in Your Business in 2026", channel: "Alex Hormozi", views: "2.4M views", age: "3 months ago", duration: "18:42", samplePath: "/youtube-samples/alex-hormozi-ai-business.jpg" },
  { id: "dan-martell-ai-business", title: "Building a business with AI", channel: "Dan Martell", views: "186K views", age: "1 year ago", duration: "14:08", samplePath: "/youtube-samples/dan-martell-ai-business.jpg" },
  { id: "alex-hormozi-ai-revolution", title: "Get RICH in the A.I. Revolution", channel: "The Game w/ Alex Hormozi", views: "1.1M views", age: "3 years ago", duration: "17:38", samplePath: "/youtube-samples/alex-hormozi-ai-revolution.jpg" },
  { id: "networkchuck-ai-hard-way", title: "You've Been Using AI the Hard Way (Use This Instead)", channel: "NetworkChuck", views: "2M views", age: "9 months ago", duration: "33:43", samplePath: "/youtube-samples/networkchuck-ai-hard-way.jpg" },
  { id: "networkchuck-private-ai", title: "Run your own AI (but private)", channel: "NetworkChuck", views: "1.8M views", age: "2 years ago", duration: "18:27", samplePath: "/youtube-samples/networkchuck-private-ai.jpg" },
  { id: "leila-hormozi-ai-business", title: "Effects of AI on Business", channel: "Leila Hormozi", views: "742K views", age: "1 year ago", duration: "21:06", samplePath: "/youtube-samples/leila-hormozi-ai-business.jpg" },
  { id: "garyvee-business-advice", title: "Watch This Before You Make Another Decision", channel: "GaryVee", views: "4.8M views", age: "6 years ago", duration: "5:50", samplePath: "/youtube-samples/garyvee-business-advice.jpg" },
  { id: "earn-your-leisure-ai", title: "Artificial Intelligence Explained: How to Make Money with AI", channel: "Earn Your Leisure", views: "392K views", age: "2 years ago", duration: "1:47:53", samplePath: "/youtube-samples/earn-your-leisure-ai.jpg" },
  { id: "networkchuck-prompts", title: "Your Prompts Are Bad. Here's How to Fix Them", channel: "NetworkChuck", views: "622K views", age: "6 months ago", duration: "12:14", samplePath: "/youtube-samples/networkchuck-prompts.jpg" },
];

const mix = (value: number) => {
  let result = value >>> 0;
  result ^= result >>> 16;
  result = Math.imul(result, 0x45d9f3b) >>> 0;
  result ^= result >>> 16;
  return result >>> 0;
};

function seededShuffle<T>(values: T[], seed: number): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = mix(seed + index * 0x9e3779b9) % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

/**
 * Creates a complete, deterministic YouTube context from one Canvas target.
 * The caller only supplies a target, title, and seed; catalog selection and
 * target placement stay behind this small interface.
 */
export function createYoutubePreviewVideos(target: Asset, title: string, seed: number): YoutubePreviewVideo[] {
  const samples = seededShuffle(YOUTUBE_SAMPLE_CATALOG, seed).slice(0, 8);
  const videos: YoutubePreviewVideo[] = samples.map((sample) => ({ ...sample }));
  const targetVideo: YoutubePreviewVideo = {
    id: target.id,
    title: title.trim() || target.name.replace(/\.[^.]+$/, ""),
    channel: "Your Channel",
    views: "123K views",
    age: "1 hour ago",
    duration: "12:34",
    samplePath: "",
    asset: target,
    isTarget: true,
  };
  const targetIndex = mix(seed ^ 0xa5a5a5a5) % (videos.length + 1);
  videos.splice(targetIndex, 0, targetVideo);
  return videos;
}
