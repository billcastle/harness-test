import { ImageResponse } from "next/og";

const SIZES = [192, 512];

export const dynamicParams = false;
export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

// Full-bleed square with the mark inside the maskable safe zone, so one image serves both icon purposes.
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#4f46e5", color: "#ffffff", fontSize: size * 0.5, fontWeight: 700 }}>
        E
      </div>
    ),
    { width: size, height: size },
  );
}
