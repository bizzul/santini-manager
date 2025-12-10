import { createClient } from "../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //@ts-ignore
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("user");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, {
        status: 400,
      });
    }

    // Get user from Supabase auth
    const { data: authUser, error: getUserError } = await supabase.auth.admin
      .getUserById(id);
    if (getUserError) {
      // Fallback to getting user from users table
      const { data: localUser, error: localUserError } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (localUserError) {
        throw localUserError;
      }

      return NextResponse.json({ user: localUser }, { status: 200 });
    }

    // Get local user data
    const { data: localUser, error: localUserError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (localUserError && localUserError.code !== "PGRST116") {
      throw localUserError;
    }

    const mergedUser = {
      ...authUser.user,
      ...localUser,
    };

    return NextResponse.json({ user: mergedUser }, { status: 200 });
  } catch (error) {
    logger.error(error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 400 });
  }
}

// Delete User From Auth0
// async function handleDelete(session: any, userId: any, res: any) {
//   try {
//     // console.log(userId);
//     const deleteUserResponse = await fetch(
//       `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
//       {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${session.managementToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     if (deleteUserResponse.status === 204) {
//       const user = await prisma.user.findUnique({
//         where: {
//           authId: userId,
//         },
//       });

//       if (user) {
//         //Removing client
//         await prisma.user.delete({
//           where: {
//             authId: userId,
//           },
//         });
//         return res.status(200).json({ result: "user deleted successfully" });
//       } else {
//         return res.status(400).json({ error: "Error deleting user" });
//       }
//     }
//   } catch (error) {
//     console.error(error);
//     //@ts-ignore
//     return res.status(400).json({ error: error.message });
//   }
// }

// // Update a single user in Auth0
// async function handlePatch(session: any, userId: any, res: any, req: any) {
//   const data = validation.safeParse(req.body); //? <---Veryfing body against validation schema
//   // console.log(data);
//   if (data.success) {
//     const userEdit = {
//       email: req.body.email,
//       given_name: req.body.given_name,
//       family_name: req.body.family_name,
//       user_metadata: {
//         sigla: req.body.initials,
//       },
//     };

//     try {
//       const updateUserResponse = await fetch(
//         `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
//         {
//           method: "PATCH",
//           headers: {
//             Authorization: `Bearer ${session.managementToken}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(userEdit),
//         }
//       );

//       if (updateUserResponse.ok) {
//         const updatedUser = await updateUserResponse.json();
//         //Fetch a single client address
//         const findPrismaUser = await prisma.user.findUnique({
//           where: {
//             authId: userId,
//           },
//         });

//         if (findPrismaUser) {
//           const updateUser = await prisma.user.update({
//             where: {
//               authId: userId,
//             },
//             data: {
//               roles: {
//                 set:
//                   req.body.incarico?.map((c: any) => ({ id: Number(c) })) || [],
//               },
//               email: updatedUser.email,
//               authId: updatedUser.user_id,
//               given_name: updatedUser.given_name,
//               family_name: updatedUser.family_name,
//               enabled: req.body.enabled,
//               initials: updatedUser.user_metadata.sigla,
//               //picture: updatedUser.picture,
//             },
//           });
//           if (updateUser) {
//             res.status(200).json({ user: updatedUser });
//           } else {
//             res.status(400).json({ error: "Failed to update the user data" });
//           }
//         }
//       } else {
//         // console.log(updateUserResponse);
//         throw new Error("Failed to update user");
//       }
//     } catch (error: any) {
//       console.error(error);
//       const errorMessage = error.message || "An error occurred";
//       res.status(400).json({ error: errorMessage });
//     }
//   } else {
//     res.status(404).json({ error: "Invalid validation" });
//   }
// }
