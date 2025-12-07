import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getUserContext } from "@/lib/auth-utils";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ siteId: string }> },
) {
    try {
        const supabase = await createClient();
        const { siteId } = await params;

        // Check if user is authenticated and has permission
        const userContext = await getUserContext();
        if (!userContext) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Only allow superadmin to upload site images
        if (userContext.role !== "superadmin") {
            return NextResponse.json(
                {
                    error:
                        "Unauthorized: Only superadmins can upload site images",
                },
                { status: 403 },
            );
        }

        // Get the current site data to check if there's an existing image
        const { data: site, error: siteError } = await supabase
            .from("sites")
            .select("image")
            .eq("id", siteId)
            .single();

        if (siteError) {
            return NextResponse.json(
                { error: "Site not found" },
                { status: 404 },
            );
        }

        const formData = await req.formData();
        const file = formData.get("image") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No image file provided" },
                { status: 400 },
            );
        }

        // Validate file type
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
                { status: 400 },
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File size exceeds 5MB limit" },
                { status: 400 },
            );
        }

        const fileExt = file.type.split("/")[1];
        const fileName = `${siteId}/${uuidv4()}.${fileExt}`;

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("site-images")
            .upload(fileName, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json(
                { error: "Failed to upload image: " + uploadError.message },
                { status: 500 },
            );
        }

        // Get public URL for the uploaded file
        const {
            data: { publicUrl },
        } = supabase.storage.from("site-images").getPublicUrl(fileName);

        // Delete old file if it exists
        if (site.image) {
            const oldFileName = site.image.split("/").pop();
            if (oldFileName) {
                // Extract the full path from the URL
                const urlParts = site.image.split("/site-images/");
                if (urlParts.length > 1) {
                    const oldPath = urlParts[1];
                    await supabase.storage.from("site-images").remove([
                        oldPath,
                    ]);
                }
            }
        }

        // Update site with new image URL
        const { error: updateError } = await supabase
            .from("sites")
            .update({ image: publicUrl })
            .eq("id", siteId);

        if (updateError) {
            console.error("Update error:", updateError);
            return NextResponse.json(
                { error: "Failed to update site: " + updateError.message },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            imageUrl: publicUrl,
            message: "Image uploaded successfully",
        });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ siteId: string }> },
) {
    try {
        const supabase = await createClient();
        const { siteId } = await params;

        // Check if user is authenticated and has permission
        const userContext = await getUserContext();
        if (!userContext) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Only allow superadmin to delete site images
        if (userContext.role !== "superadmin") {
            return NextResponse.json(
                {
                    error:
                        "Unauthorized: Only superadmins can delete site images",
                },
                { status: 403 },
            );
        }

        // Get the current site data
        const { data: site, error: siteError } = await supabase
            .from("sites")
            .select("image")
            .eq("id", siteId)
            .single();

        if (siteError) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }

        if (site.image) {
            // Extract the full path from the URL
            const urlParts = site.image.split("/site-images/");
            if (urlParts.length > 1) {
                const imagePath = urlParts[1];
                await supabase.storage.from("site-images").remove([imagePath]);
            }
        }

        // Update site to remove image reference
        const { error: updateError } = await supabase
            .from("sites")
            .update({ image: null })
            .eq("id", siteId);

        if (updateError) {
            return NextResponse.json(
                { error: "Failed to update site: " + updateError.message },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "Image deleted successfully",
        });
    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 },
        );
    }
}

