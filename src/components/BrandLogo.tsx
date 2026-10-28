import React from "react";

interface BrandLogoProps {
  slug: string;
  name?: string;
  className?: string;
  size?: number;
}

export function BrandLogo({ slug, name = "", className = "h-8 w-8", size = 32 }: BrandLogoProps) {
  const normalized = slug.toLowerCase().replace(/[^a-z0-9]/g, "");

  switch (normalized) {
    case "flipkart":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Flipkart"
        >
          <rect width="100" height="100" rx="22" fill="#2874F0" />
          {/* Shopping Bag with speedlines */}
          <path
            d="M32 30h36c3.3 0 6 2.7 6 6v36c0 3.3-2.7 6-6 6H32c-3.3 0-6-2.7-6-6V36c0-3.3 2.7-6 6-6z"
            fill="#FFE11B"
          />
          <path
            d="M42 30V24c0-4.4 3.6-8 8-8s8 3.6 8 8v6"
            fill="none"
            stroke="#FFE11B"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Flipkart 'f' */}
          <path
            d="M57 42h-7v-3c0-1.7 1.3-3 3-3h4v-5h-5c-4.4 0-8 3.6-8 8v3h-4v5h4v18h6V47h6l1-5z"
            fill="#2874F0"
          />
        </svg>
      );

    case "amazon":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Amazon"
        >
          <rect width="100" height="100" rx="22" fill="#232F3E" />
          {/* Amazon 'a' */}
          <text
            x="50"
            y="52"
            fill="#FFFFFF"
            fontSize="38"
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            textAnchor="middle"
          >
            a
          </text>
          {/* Amazon smile arrow */}
          <path
            d="M26 62c14 10 34 10 48 0"
            fill="none"
            stroke="#FF9900"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path d="M72 58l4 6-7 1" fill="#FF9900" />
        </svg>
      );

    case "myntra":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Myntra"
        >
          <rect width="100" height="100" rx="22" fill="#FFFFFF" stroke="#E5336A" strokeWidth="2" />
          {/* Myntra M logo petals */}
          <path d="M22 68l16-36 12 18-12 18H22z" fill="#FF3F6C" />
          <path d="M38 32l12 28 12-28 16 36H62l-12-18-12 18" fill="#F26A1B" />
          <path d="M50 60l12-18 16 26H62l-12-8z" fill="#9C27B0" opacity="0.9" />
          <path d="M38 32l12 18-6 10-18-8 12-20z" fill="#FFC107" opacity="0.8" />
        </svg>
      );

    case "ajio":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Ajio"
        >
          <rect width="100" height="100" rx="22" fill="#2C4152" />
          <text
            x="50"
            y="58"
            fill="#FFFFFF"
            fontSize="26"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            letterSpacing="2"
            textAnchor="middle"
          >
            AJIO
          </text>
        </svg>
      );

    case "shopsy":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Shopsy"
        >
          <rect width="100" height="100" rx="22" fill="#7B2CBF" />
          <path
            d="M32 36h36c2 0 4 2 4 4v32c0 2-2 4-4 4H32c-2 0-4-2-4-4V40c0-2 2-4 4-4z"
            fill="#FFFFFF"
          />
          <path
            d="M42 36v-6c0-4.4 3.6-8 8-8s8 3.6 8 8v6"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4"
          />
          <text
            x="50"
            y="62"
            fill="#7B2CBF"
            fontSize="28"
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            textAnchor="middle"
          >
            S
          </text>
        </svg>
      );

    case "nykaa":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Nykaa"
        >
          <rect width="100" height="100" rx="22" fill="#FC2779" />
          <text
            x="50"
            y="56"
            fill="#FFFFFF"
            fontSize="22"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            letterSpacing="1"
            textAnchor="middle"
          >
            NYKAA
          </text>
        </svg>
      );

    case "tatacliq":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Tata CLiQ"
        >
          <rect width="100" height="100" rx="22" fill="#0F223D" />
          <circle cx="50" cy="46" r="22" fill="none" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="63" cy="59" r="6" fill="#E53935" />
          <text
            x="50"
            y="82"
            fill="#FFFFFF"
            fontSize="12"
            fontFamily="system-ui, sans-serif"
            fontWeight="800"
            letterSpacing="2"
            textAnchor="middle"
          >
            CLIQ
          </text>
        </svg>
      );

    case "croma":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Croma"
        >
          <rect width="100" height="100" rx="22" fill="#121212" />
          <text
            x="46"
            y="58"
            fill="#00E9BF"
            fontSize="21"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            letterSpacing="1.5"
            textAnchor="middle"
          >
            croma
          </text>
          <circle cx="78" cy="43" r="3.5" fill="#00E9BF" />
        </svg>
      );

    case "jiomart":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="JioMart"
        >
          <rect width="100" height="100" rx="22" fill="#0078AD" />
          <text
            x="50"
            y="48"
            fill="#FFFFFF"
            fontSize="26"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            textAnchor="middle"
          >
            Jio
          </text>
          <text
            x="50"
            y="70"
            fill="#FFCC00"
            fontSize="16"
            fontFamily="system-ui, sans-serif"
            fontWeight="800"
            letterSpacing="1"
            textAnchor="middle"
          >
            Mart
          </text>
        </svg>
      );

    case "samsung":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Samsung"
        >
          <rect width="100" height="100" rx="22" fill="#1428A0" />
          <ellipse cx="50" cy="50" rx="42" ry="24" fill="#034EA2" />
          <text
            x="50"
            y="56"
            fill="#FFFFFF"
            fontSize="13"
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            letterSpacing="1"
            textAnchor="middle"
          >
            SAMSUNG
          </text>
        </svg>
      );

    case "mamaearth":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Mamaearth"
        >
          <rect width="100" height="100" rx="22" fill="#00AFEF" />
          <path
            d="M50 24c-12 0-22 10-22 22 0 14 18 28 22 30 4-2 22-16 22-30 0-12-10-22-22-22z"
            fill="#FFFFFF"
            opacity="0.25"
          />
          <text
            x="50"
            y="54"
            fill="#FFFFFF"
            fontSize="14"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            textAnchor="middle"
          >
            mama
          </text>
          <text
            x="50"
            y="70"
            fill="#A6E22E"
            fontSize="13"
            fontFamily="system-ui, sans-serif"
            fontWeight="800"
            textAnchor="middle"
          >
            earth
          </text>
        </svg>
      );

    case "dominos":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Domino's"
        >
          <rect width="100" height="100" rx="22" fill="#006491" />
          {/* Domino tile */}
          <g transform="rotate(45 50 50)">
            <rect x="36" y="22" width="28" height="26" rx="4" fill="#E31837" />
            <rect x="36" y="52" width="28" height="26" rx="4" fill="#006491" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="50" cy="35" r="3.5" fill="#FFFFFF" />
            <circle cx="43" cy="60" r="3" fill="#FFFFFF" />
            <circle cx="57" cy="70" r="3" fill="#FFFFFF" />
          </g>
        </svg>
      );

    case "boat":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="boAt"
        >
          <rect width="100" height="100" rx="22" fill="#E01E2E" />
          {/* Sailboat icon */}
          <path d="M48 24v28l18 8-18-36z" fill="#FFFFFF" />
          <path d="M44 32v20l-12 5 12-25z" fill="#FFFFFF" opacity="0.8" />
          <path d="M26 64h48l-8 10H34l-8-10z" fill="#FFFFFF" />
          <text
            x="50"
            y="88"
            fill="#FFFFFF"
            fontSize="10"
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            letterSpacing="1"
            textAnchor="middle"
          >
            boAt
          </text>
        </svg>
      );

    case "puma":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="Puma"
        >
          <rect width="100" height="100" rx="22" fill="#000000" />
          {/* Jumping Puma Silhouette */}
          <path
            d="M30 62c6-3 10-6 13-11 2-4 3-8 3-12 0-3 3-5 6-4 3 1 5 4 4 7 4-3 9-4 13-3 2 1 4 3 5 5 1-2 1-5 0-7 2 2 3 5 3 7 1-1 3-2 5-1 1 1 1 3 0 4 2 0 4 1 5 3-4 1-8 2-12 1-3 4-7 7-12 9-5 2-10 2-15 0-4 3-9 4-14 2z"
            fill="#FFFFFF"
          />
          <text
            x="50"
            y="82"
            fill="#FFFFFF"
            fontSize="13"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            letterSpacing="2"
            textAnchor="middle"
          >
            PUMA
          </text>
        </svg>
      );

    case "makemytrip":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`${className} shrink-0`}
          aria-label="MakeMyTrip"
        >
          <rect width="100" height="100" rx="22" fill="#EB2026" />
          <text
            x="50"
            y="48"
            fill="#FFFFFF"
            fontSize="18"
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            textAnchor="middle"
          >
            make
          </text>
          <text
            x="50"
            y="66"
            fill="#FFE600"
            fontSize="16"
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            textAnchor="middle"
          >
            my trip
          </text>
        </svg>
      );

    default:
      return (
        <div
          className={`${className} shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-[#134024] to-[#1ba34e] font-display font-black text-white shadow-sm`}
          style={{ width: size, height: size, fontSize: size * 0.45 }}
        >
          {(name || slug).charAt(0).toUpperCase()}
        </div>
      );
  }
}
