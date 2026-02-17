
import { headers } from "next/headers";

export interface IpInfo {
    ip: string;
    city?: string;
    region?: string;
    country?: string;
    pincode?: string;
    latitude?: string;
    longitude?: string;
    isp?: string;
}

// Step 1: Extract IP from request headers
export function getIpFromHeaders(): string {
    const headersList = headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const cfIp = headersList.get("cf-connecting-ip"); // Cloudflare

    if (forwarded) {
        return forwarded.split(",")[0].trim(); // First IP in chain is the real one
    }
    if (realIp) return realIp;
    if (cfIp) return cfIp;

    return "unknown";
}

// Step 2: Look up geo-location for that IP (free service, no API key needed)
export async function getIpGeoInfo(ip: string): Promise<IpInfo> {
    if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1") {
        return { ip };
    }

    try {
        // Using ip-api.com (free, no key needed, 45 req/min limit)
        // Note: http might be blocked in some secure environments, but ip-api free is http.
        // For production with https requirement, you might need a paid key or different service.
        // However, for MVP logic:
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,zip,lat,lon,isp`);
        const data = await res.json();

        if (data.status === "success") {
            return {
                ip,
                city: data.city,
                region: data.regionName,
                country: data.country,
                pincode: data.zip,
                latitude: data.lat?.toString(),
                longitude: data.lon?.toString(),
                isp: data.isp,
            };
        }
    } catch (err) {
        console.error("IP lookup failed:", err);
    }

    return { ip }; // Return at least the IP even if geo fails
}
