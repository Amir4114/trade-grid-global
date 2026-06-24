"use client";

import { useMemo, useState } from "react";
import { Bot, Send } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import AIRecommendationCard from "@/components/marketplace/AIRecommendationCard";
import SectionHeader from "@/components/marketplace/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockSourcingResponse } from "@/lib/marketplace/data";

export default function AISourcingPage() {
  const [query, setQuery] = useState("I need frozen chicken suppliers for UAE");
  const [submittedQuery, setSubmittedQuery] = useState(query);
  const recommendations = useMemo(() => mockSourcingResponse(submittedQuery), [submittedQuery]);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="AI Sourcing" title="Describe what you need. Get a sourcing path." description="Mock AI responses are wired through a replaceable recommendation function for future OpenAI integration." />
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-950 text-white"><Bot className="size-5" /></div>
              <div>
                <h2 className="font-semibold">Trade Grid Sourcing Assistant</h2>
                <p className="text-sm text-neutral-600">Supplier recommendations, product matches, and RFQ suggestions.</p>
              </div>
            </div>
          </div>
          <div className="space-y-5 p-5">
            <div className="ml-auto max-w-2xl rounded-lg bg-neutral-950 p-4 text-white">
              {submittedQuery}
            </div>
            <div className="max-w-3xl rounded-lg bg-neutral-100 p-4 text-sm leading-6 text-neutral-700">
              I found a practical sourcing route based on your request. Start with verified suppliers, compare matching products, then post an RFQ to collect firm pricing and lead times.
            </div>
            <div className="space-y-3">
              {recommendations.map((recommendation) => <AIRecommendationCard key={recommendation.id} recommendation={recommendation} />)}
            </div>
          </div>
          <form
            className="flex gap-3 border-t border-neutral-200 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedQuery(query);
            }}
          >
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11" placeholder="Tell the assistant what you need" />
            <Button type="submit" className="h-11 px-4">
              <Send />
              Ask
            </Button>
          </form>
        </div>
      </section>
      <Footer />
    </main>
  );
}
