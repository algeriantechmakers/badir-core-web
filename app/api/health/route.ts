import { NextResponse } from "next/server";

/**
 * Liveness probe for the container healthcheck (Docker / Portainer).
 * Intentionally does not touch the database: it answers "is the server up",
 * not "is every dependency reachable". The release this image was built from
 * is stamped by the Dockerfile (ARG APP_VERSION) and echoed here so that
 * `/api/health` doubles as a build provenance check.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok", version: process.env.APP_VERSION ?? "unknown" },
    { status: 200 },
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
