// pages/api/protected-route.js
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { Auth0ManagementApi } from "../../../core/auth/auth0-management-api";
import { validation } from "../../../validation/users/editInfo";
import { prisma } from "../../../prisma-global";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  //@ts-ignore
  const searchParams = req.nextUrl.searchParams;
  //Get session
  const session = await getSession();
  // console.log("session", session);
  //Managing token
  await Auth0ManagementApi.manageToken(session);
  const id = searchParams.get("user");

  try {
    const getUserResponse = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${id}`,
      {
        method: "GET",
        headers: {
          //@ts-ignore
          Authorization: `Bearer ${session.managementToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (getUserResponse) {
      const auth0User = await getUserResponse.json();
      const localUser = await prisma.user.findUnique({
        where: {
          authId: id || "",
        },
      });

      const mergedUser = {
        ...auth0User,
        ...localUser,
      };

      return NextResponse.json({ user: mergedUser }, { status: 200 });
    } else {
      throw new Error("Failed to get user");
    }
  } catch (error) {
    console.error(error);
    //@ts-ignore
    return NextResponse.json({ error: error.message }, { status: 400 });
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
