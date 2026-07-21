"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { tracker } from "@/lib/tracker";
import { useDwellTime } from "@/hooks/useDwellTime";
import { Markdown } from "@/lib/markdown";
import { relativeTime, formatCount } from "@/lib/relativeTime";
import { ActionBar } from "@/components/feed/ActionBar";

interface Article {
  id: string;
  title: string;
  body: string;
  source_name: string;
  thumbnail_url: string | null;
  category: string;
  published_at: string;
  fake_likes: number | null;
  fake_comments: number | null;
  fake_views: number | null;
  position_in_feed: number;
  related: {
    id: string;
    title: string;
    source_name: string;
    thumbnail_url: string | null;
    published_at: string;
  }[];
}

export default function ArticlePage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const closed = useRef(false);

  useDwellTime(article ? article.id : null);

  useEffect(() => {
    closed.current = false;
    setArticle(null);
    setError(null);
    // Direct loads (refresh on article) still need the tracker initialized.
    try {
      const st = JSON.parse(localStorage.getItem(`nl_state_${slug}`) ?? "null");
      if (st?.session_id) {
        tracker.init({
          endpoint: `/api/exp/${slug}/events`,
          sessionId: st.session_id,
        });
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/exp/${slug}/article/${id}`);
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          router.replace(`/exp/${slug}/feed`);
          return;
        }
        if (!res.ok) throw new Error(`article_${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setArticle(data);
        tracker.track("article_opened", {
          article_id: data.id,
          position_in_feed: data.position_in_feed,
        });
      } catch {
        if (!cancelled) setError("This story could not be loaded.");
      }
    })();

    const onPop = () => {
      if (!closed.current) {
        closed.current = true;
        tracker.track("article_closed", {
          article_id: id,
          close_method: "browser_back",
        });
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", onPop);
    };
  }, [slug, id, loadAttempt, router]);

  const goBack = () => {
    if (!closed.current) {
      closed.current = true;
      tracker.track("article_closed", {
        article_id: id,
        close_method: "back_button",
      });
    }
    if (sessionStorage.getItem(`nl_scroll_${slug}`) !== null) router.back();
    else router.push(`/exp/${slug}/feed`);
  };

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-gray-600">{error}</p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
        >
          Try again
        </button>
      </main>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="nz-skeleton space-y-3 rounded-xl bg-white p-5">
          <div className="h-6 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-1/3 rounded bg-gray-100" />
          <div className="h-40 w-full rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  const views = formatCount(article.fake_views);

  return (
    <main className="mx-auto max-w-xl pb-16">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-gray-200 bg-white/95 px-3 py-2.5 backdrop-blur">
        <button
          type="button"
          onClick={goBack}
          className="rounded-full px-2 py-1 text-lg leading-none hover:bg-gray-100"
          aria-label="Back"
        >
          ←
        </button>
        <span className="text-sm font-medium text-gray-500">
          {article.source_name}
        </span>
      </div>

      <article className="bg-white px-5 py-6">
        <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-gray-500">
          {article.category}
        </span>
        <h1 className="nz-serif mt-3 text-2xl font-bold leading-tight">
          {article.title}
        </h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">
            {article.source_name}
          </span>
          <span>·</span>
          <span>{relativeTime(article.published_at)}</span>
          {views && (
            <>
              <span>·</span>
              <span>{views} views</span>
            </>
          )}
        </div>
        {article.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.thumbnail_url}
            alt=""
            className="mt-4 aspect-[16/9] w-full rounded-lg object-cover"
          />
        )}
        <Markdown
          text={article.body}
          className="nz-serif mt-5 text-[16px] text-gray-800"
          onLinkClick={(url, label) =>
            tracker.track("article_link_clicked", {
              article_id: article.id,
              link_url: url,
              link_text: label,
            })
          }
        />
        <div className="mt-6 border-t border-gray-100 pt-4">
          <ActionBar targetId={article.id} eventType="article_reaction" />
        </div>
      </article>

      {article.related.length > 0 && (
        <section className="mt-2 bg-white px-5 py-4">
          <h2 className="mb-3 text-sm font-bold text-gray-700">
            Related stories
          </h2>
          {article.related.map((r) => (
            <button
              key={r.id}
              type="button"
              className="flex w-full items-center gap-3 border-b border-gray-100 py-2.5 text-left last:border-0"
              onClick={() => {
                if (!closed.current) {
                  closed.current = true;
                  tracker.track("article_closed", {
                    article_id: article.id,
                    close_method: "related_story",
                  });
                }
                tracker.track("card_clicked", {
                  card_id: r.id,
                  click_target: "related",
                });
                router.push(`/exp/${slug}/article/${r.id}`);
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="nz-serif line-clamp-2 text-sm font-semibold">
                  {r.title}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {r.source_name} · {relativeTime(r.published_at)}
                </p>
              </div>
              {r.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.thumbnail_url}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded-md object-cover"
                />
              )}
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
