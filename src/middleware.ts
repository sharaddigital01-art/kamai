import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/earnings", "/links"];
const AUTH_COOKIE = "kamai_auth_user";

function isAuthorizedAdmin(email?: string | null, role?: string | null): boolean {
  if (role === "ADMIN") return true;
  if (!email) return false;
  const envEmails = process.env.ADMIN_EMAILS || "admin@earnkaro.com,admin@earnkaro.local,admin@gmail.com";
  const list = envEmails
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // 1. Remember referral code
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && /^[0-9a-zA-Z]{6,12}$/.test(ref)) {
    response.cookies.set("kamai_ref", ref, { maxAge: 60 * 60 * 24 * 30, sameSite: "lax", path: "/" });
  }

  // 2. Check session from application cookie
  let sessionUser: { id?: string; email?: string; role?: string } | null = null;
  const authCookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (authCookie) {
    try {
      sessionUser = JSON.parse(decodeURIComponent(authCookie));
    } catch {
      // invalid cookie
    }
  }

  // 3. Supabase Auth cookie refresh & check
  let supabaseUser: { id: string; email?: string } | null = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key && !url.includes("YOUR-PROJECT") && !key.includes("your-anon-key")) {
    try {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
            for (const { name, value } of list) request.cookies.set(name, value);
            const carry = response.cookies.getAll();
            response = NextResponse.next({ request });
            for (const c of carry) response.cookies.set(c);
            for (const { name, value, options } of list) response.cookies.set(name, value, options);
          },
        },
      });

      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        supabaseUser = {
          id: data.user.id,
          email: data.user.email,
        };
      }
    } catch {
      // Supabase server client error
    }
  }

  const currentUser = sessionUser || supabaseUser;

  // 4. Protection for /admin route
  if (pathname.startsWith("/admin")) {
    // If not logged in at all, redirect to login with next=/admin
    if (!currentUser) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "?next=/admin";
      return NextResponse.redirect(loginUrl);
    }

    // Check if user is an authorized admin
    const isAdmin = isAuthorizedAdmin(currentUser.email, sessionUser?.role);
    if (!isAdmin) {
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/";
      deniedUrl.search = "?error=access-denied";
      return NextResponse.redirect(deniedUrl);
    }
  }

  // 5. Protection for user-only private pages
  if (!currentUser && PROTECTED.some((p) => pathname.startsWith(p))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  // Skip static assets, the redirect hot path (/r/*) and webhooks: no auth work needed there.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|r/|api/postback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
