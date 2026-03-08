import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { getPublicMediaSlot, getPublicVideoSlot } from "@/lib/publicSiteMedia";
import { saveCmsHeroMediaSettings } from "@/lib/cms/heroMediaSettings";

export async function POST(request: Request) {
  if (!isCmsAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    heroVideoUrl?: string;
    heroVideoPosterUrl?: string;
    heroCardImageUrl?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const defaultVideo = getPublicVideoSlot("siteSignHeroBackground");
  const defaultImage = getPublicMediaSlot("siteSignHeroCardImage");

  const saved = await saveCmsHeroMediaSettings(
    {
      heroVideoUrl: body.heroVideoUrl,
      heroVideoPosterUrl: body.heroVideoPosterUrl,
      heroCardImageUrl: body.heroCardImageUrl,
    },
    {
      heroVideoUrl: defaultVideo.src,
      heroVideoPosterUrl: defaultVideo.poster,
      heroCardImageUrl: defaultImage.src,
    },
  );

  return NextResponse.json({ success: true, data: saved });
}
