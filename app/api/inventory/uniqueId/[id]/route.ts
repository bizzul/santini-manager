// pages/api/protected-route.js
import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../../../../../prisma-global";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    let userId = null;
    if (session) {
      userId = session.user.sub;
    }
    //@ts-ignore
    const id = params.id;
    const quantity = await req.json();

    //Fetch a single client address
    const product = await prisma.product.findUnique({
      where: {
        inventoryId: Number(id),
      },
    });

    if (product) {
      // Calculate new total price based on changes to unit price or quantity
      let totalPrice = product.unit_price * product.quantity;
      if (quantity) {
        totalPrice = product.unit_price * Number(quantity);
      }

      const productData = await prisma.product.update({
        where: {
          inventoryId: Number(id),
        },
        data: {
          quantity: Number(quantity),
          total_price: totalPrice,
        },
      });

      // Create a new Action record to track the user action
      const newAction = await prisma.action.create({
        data: {
          type: "edit_product",
          data: {
            name: productData.name,
            prevQuantity: product.quantity,
            newQuantity: productData.quantity,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
          Product: { connect: { id: productData.id } },
        },
      });

      if (newAction) {
        return NextResponse.json({ client: productData, status: 200 });
      }
    }
  } catch (err) {
    console.log("error", err);
    return NextResponse.json({ error: err, status: 500 });
  }
}
