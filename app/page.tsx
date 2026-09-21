import Contact from "@/components/pages/landing/Contact";
import Hero from "@/components/pages/landing/Hero";
import LastInitiatives from "@/components/pages/landing/LastInitiatives";
import LastInitiativesSkeleton from "@/components/pages/landing/LastInitiativesSkeleton";
import Partners from "@/components/pages/landing/Partners";
import Stats from "@/components/pages/landing/Stats";
import Testimonials from "@/components/pages/landing/Testimonials";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={<LastInitiativesSkeleton />}>
        <LastInitiatives />
      </Suspense>
      <Stats />
      <Testimonials />
      <Partners />
      <Contact />
    </>
  );
}
