import { createFileRoute } from "@tanstack/react-router";

/**
 * Digital Asset Links for the Google Play (Trusted Web Activity) app.
 * Fill ANDROID_PACKAGE_NAME and ANDROID_SHA256_FINGERPRINTS (comma-separated)
 * from the Play Console → App integrity → App signing key certificate.
 * Until both are set, this returns an empty list, which is harmless.
 */
export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: async () => {
        const pkg = process.env["ANDROID_PACKAGE_NAME"];
        const fps = (process.env["ANDROID_SHA256_FINGERPRINTS"] ?? "")
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);

        const body =
          pkg && fps.length
            ? [
                {
                  relation: ["delegate_permission/common.handle_all_urls"],
                  target: {
                    namespace: "android_app",
                    package_name: pkg,
                    sha256_cert_fingerprints: fps,
                  },
                },
              ]
            : [];

        return new Response(JSON.stringify(body), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
