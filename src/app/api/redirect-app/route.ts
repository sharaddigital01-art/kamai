import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const target = searchParams.get("url") || "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opening Deal...</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    body {
      background-color: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      border-top-color: #3b82f6;
      animation: spin 0.8s ease-in-out infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .text {
      font-size: 16px;
      font-weight: 500;
    }
    a.fallback-btn {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 20px;
      background: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="text">Opening Deal...</div>
  <div id="fallback" style="display:none;">
    <p style="font-size:14px;color:#94a3b8;margin-top:8px;">If it didn't open automatically, tap below:</p>
    <a id="targetLink" class="fallback-btn" href="#">Continue to Deal</a>
  </div>

  <script>
    (function() {
      const serverTarget = ${JSON.stringify(target)};
      const params = new URLSearchParams(window.location.search);
      const clientTarget = params.get('url');
      const target = serverTarget || clientTarget || "";

      if (target) {
        const linkEl = document.getElementById('targetLink');
        if (linkEl) linkEl.href = target;
        setTimeout(function() {
          const fallbackEl = document.getElementById('fallback');
          if (fallbackEl) fallbackEl.style.display = 'block';
        }, 1500);

        if (window.Telegram && window.Telegram.WebApp) {
          try {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            window.Telegram.WebApp.openLink(target);
            setTimeout(function() {
              window.Telegram.WebApp.close();
            }, 300);
          } catch (e) {
            window.location.replace(target);
          }
        } else {
          window.location.replace(target);
        }
      } else {
        document.querySelector('.text').textContent = 'No destination URL provided.';
        document.querySelector('.spinner').style.display = 'none';
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
