import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public marketing + webhook paths. These never need a Supabase auth
// round-trip, so we skip middleware entirely and let the CDN serve them.
// Before this, every landing-page hit did an us-east-1 round-trip on the
// render path, which timed out for visitors on slower routes to us-east
// (Nigerian consumer ISPs, parts of APAC) while testing from Starlink
// hid the problem.
const PUBLIC_PREFIXES = [
  "/features",
  "/pricing",
  "/compare",
  "/guides",
  "/launch",
  "/privacy",
  "/terms",
  "/data-deletion",
  "/api/webhooks",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function updateSession(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Wrap getUser so a stale/invalid refresh token doesn't throw. We treat
  // any failure as "no user for this request" but deliberately do NOT
  // clear the sb-* cookies — Supabase rotates refresh tokens single-use,
  // so a concurrent refresh from another tab or request can race us and
  // leave our in-flight request holding a stale token. Clearing cookies
  // on that would log the user out mid-OAuth round-trip (e.g. returning
  // from twitter.com during an X reconnect). If the session is genuinely
  // dead, the next request still lands on /login via the protected-path
  // check below; if it was just a race, the winning worker has already
  // written fresh cookies and the next request picks them up.
  //
  // Also race against a 2.5s timeout: if Supabase is slow or the Vercel
  // edge has a bad path to us-east-1, we'd rather treat the request as
  // anonymous and let the page render than hang until the browser gives
  // up with ERR_CONNECTION_TIMED_OUT.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] =
    null;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("supabase-getuser-timeout")), 2500)
    );
    const res = await Promise.race([supabase.auth.getUser(), timeout]);
    if (!res.error) {
      user = res.data.user;
    }
  } catch {
    // swallow — same reasoning as above
  }

  // Protected routes — redirect unauthenticated users to login
  const protectedPaths = ["/dashboard", "/projects", "/settings", "/playground", "/admin"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Admin routes — only users with role='admin' can access
  if (user && request.nextUrl.pathname.startsWith("/admin")) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    } catch {
      // If role check fails, redirect to dashboard rather than 500
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (
    user &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup" ||
      request.nextUrl.pathname === "/forgot-password")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
