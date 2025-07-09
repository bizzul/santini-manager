// pages/api/protected-route.js
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import { prisma } from "../../../../prisma-global";
import { NextRequest, NextResponse } from "next/server";

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_\u0600-\u06FF.]/g, "_");
}

export async function POST(req: NextRequest, res: NextResponse, context: any) {
  // const subfolder = context.params.subfolder;
  // Extract the URL from the request object
  const url = new URL(req.url);
  // Parse the pathname to get the dynamic segment
  const pathnameArray = url.pathname.split("/");
  const subfolder = pathnameArray[pathnameArray.indexOf("local-upload") + 1];

  const formData = await req.formData();
  const file = formData.get("image") as File;
  const id = formData.get("id") as string;

  try {
    const data = await file.arrayBuffer();
    const filename = sanitizeFilename(file.name);
    console.log("filename sanitized", filename);
    const pathToWriteImage = `./public/${subfolder}/${subfolder}_${filename}`; // include name and .extention, you can get the name from data.files.image object
    const pathToRead = `/${subfolder}/${subfolder}_${filename}`; // include name and .extention, you can get the name from data.files.image object
    await fs.appendFile(`${pathToWriteImage}`, Buffer.from(data));

    //store path in DB
    if (subfolder === "supplier") {
      const supplier = await prisma.supplier.update({
        where: {
          id: Number(id),
        },
        data: {
          supplier_image: pathToRead,
        },
      });
      if (supplier) {
        return NextResponse.json(
          { message: "image uploaded!", path: supplier.supplier_image },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { error: "Errore nel salvataggio in db!" },
          { status: 500 }
        );
      }
    }
    //store path in DB
    if (subfolder === "user") {
      const user = await prisma.user.update({
        where: {
          authId: id,
        },
        data: {
          picture: pathToRead,
        },
      });
      if (user) {
        return NextResponse.json(
          { message: "image changed", path: user.picture },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { error: "Errore nel salvataggio in db!" },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
