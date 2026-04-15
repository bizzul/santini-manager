import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

type AssistanceLevel = "basic_tutorial" | "smart_support" | "advanced_support";

const ALLOWED_LEVELS: AssistanceLevel[] = [
  "basic_tutorial",
  "smart_support",
  "advanced_support",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userContext = await getUserContext();
    if (!userContext || userContext.role !== "superadmin") {
      return NextResponse.json(
        { error: "Only superadmin can update assistance level" },
        { status: 403 }
      );
    }

    const { assistanceLevel } = await req.json();
    if (!ALLOWED_LEVELS.includes(assistanceLevel)) {
      return NextResponse.json(
        { error: "Invalid assistance level" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("User")
      .update({ assistance_level: assistanceLevel })
      .eq("authId", userId);

    if (error) {
      return NextResponse.json(
        { error: `Failed to update assistance level: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assistanceLevel,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to update assistance level: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
