import { Route } from "@/types/Routes";

const landingRoute: Route[] = [
  {
    url: "/",
    label: "الرئيسية",
  },
  {
    url: "/about",
    label: "عن المنصة",
  },
  {
    url: "/organizations",
    label: "المنظمات",
  },
  {
    url: "/initiatives",
    label: "المبادرات",
  },
  {
    url: "/contact",
    label: "تواصل معنا",
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authRoutes: Record<string, any> = {
  signup: {
    signupOrganization: {
      url: "/signup/organization",
      label: "منظمة",
    },
    signupIndividual: {
      url: "/signup/user",
      label: "مستخدم",
    },
    label: "انضم الآن",
  },
  login: {
    url: "/login",
    label: "تسجيل الدخول",
  },
};

const forMiddleware = {
  publicRoutes: [
    "/",
    "/organizations",
    "/organizations/:id",
    "/initiatives",
    "/contact",
    "/about",
    "/privacy-policy",
    "/terms",
    "/organization-guide",
    "/volunteer-guide",
    "/faq",
    "/how-it-works",
    "/assistance",
  ],
  authRoutes: ["/signup", "/login", "/forgot-password", "/reset-password"],
  api: {
    authPrefix: "/api/auth",
    organizationPrefix: "/api/organizations",
    initiativePrefix: "/api/initiatives",
    participantPrefix: "/api/participants",
    // Endpoints that must bypass the auth check entirely:
    //   /api/health   — Docker HEALTHCHECK (liveness probe)
    //   /api/cron/*   — Ofelia → app cron triggers (Bearer CRON_SECRET
    //                   guards these inside the route, not in the proxy)
    healthPrefix: "/api/health",
    cronPrefix: "/api/cron",
  },
};

const AUTHORIZED_REDIRECTION = "/initiatives";

export { landingRoute, authRoutes, forMiddleware, AUTHORIZED_REDIRECTION };
