import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
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
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] =
    null;
  try {
    const res = await supabase.auth.getUser();
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
