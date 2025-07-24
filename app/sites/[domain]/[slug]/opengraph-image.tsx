/* eslint-disable @next/next/no-img-element */

import { truncate } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export default async function PostOG({
  params,
}: {
  params: { domain: string; slug: string };
}) {
  const domain = decodeURIComponent(params.domain);
  const slug = decodeURIComponent(params.slug);

  const subdomain = domain.endsWith(`.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`)
    ? domain.replace(`.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`, "")
    : null;

  const supabase = await createClient();
  const response = await supabase.from('posts')
  .select('title, description, image, "user".name as "authorName", "user".image as "authorImage"')
  .eq('slug', slug)
  .eq('site.subdomain', subdomain)
  .or(`site.customDomain.eq.${domain},site.subdomain.eq.${subdomain}`)
  .limit(1);

  if (response.error) {
    return new Response("Not found", { status: 404 });
  }

  const data = response.data[0];

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const clashData = await fetch(
    new URL("@/styles/CalSans-SemiBold.otf", import.meta.url),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div tw="flex flex-col items-center w-full h-full bg-white">
       test
      </div>
    ),
    {
      width: 1200,
      height: 600,
      fonts: [
        {
          name: "Clash",
          data: clashData,
        },
      ],
      emoji: "blobmoji",
    },
  );
}
