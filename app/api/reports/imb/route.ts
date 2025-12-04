import { NextRequest, NextResponse } from "next/server";
import { Template } from "@pdfme/common";
import { text } from "@pdfme/schemas";
import { generate } from "@pdfme/generator";
import type { Font } from "@pdfme/common";
import * as fs from "fs";
import { createClient } from "../../../../utils/supabase/server";
import { basePdfIta, schemaPdfIta } from "./basepdf_ita";
import { basePdfDe, schemaPdfDe } from "./basepdf_de";
import { DateManager } from "../../../../package/utils/dates/date-manager";
var path = require("path");

export const dynamic = "force-dynamic";

const fontDirectory = path.resolve(process.cwd(), "fonts");
const file = fs.readFileSync(
  path.join(fontDirectory, "SuisseBPIntl-Medium.ttf"),
  "utf8",
);
const font: Font = {
  suisseframe: {
    data: file,
  },
  // sans_serif: {
  //   data: fs.readFileSync("fonts/sans_serif.ttf"),
  // },
};

const template: any = {
  basePdf: basePdfIta,
  schemas: [
    {
      date: {
        type: "text",
        position: {
          x: 17.47,
          y: 122.5,
        },
        width: 45,
        height: 5.77,
        rotate: 0,
        alignment: "left",
        verticalAlignment: "top",
        fontSize: 10,
        lineHeight: 1,
        characterSpacing: 0,
        fontColor: "#000000",
        backgroundColor: "",
        opacity: 1,
        fontName: "suisseframe",
      },
      oggetto: {
        type: "text",
        position: {
          x: 86.57,
          y: 126.82,
        },
        width: 114.85,
        height: 4.44,
        rotate: 0,
        alignment: "left",
        verticalAlignment: "top",
        fontSize: 10,
        lineHeight: 1,
        characterSpacing: 0,
        fontColor: "#000000",
        backgroundColor: "",
        opacity: 1,
        fontName: "suisseframe",
      },
      order_nr: {
        type: "text",
        position: {
          x: 89.7,
          y: 131.05,
        },
        width: 111.94,
        height: 5.24,
        rotate: 0,
        alignment: "left",
        verticalAlignment: "top",
        fontSize: 10,
        lineHeight: 1,
        characterSpacing: 0,
        fontColor: "#000000",
        backgroundColor: "",
        opacity: 1,
        fontName: "suisseframe",
      },
      luogo_data: {
        type: "text",
        position: {
          x: 29.11,
          y: 258.31,
        },
        width: 45,
        height: 5.77,
        rotate: 0,
        alignment: "left",
        verticalAlignment: "top",
        fontSize: 10,
        lineHeight: 1,
        characterSpacing: 0,
        fontColor: "#000000",
        backgroundColor: "",
        opacity: 1,
        fontName: "suisseframe",
      },
      ncoprisoglia: {
        type: "text",
        position: {
          x: 119.39,
          y: 200.96,
        },
        width: 7.96,
        height: 6.3,
        rotate: 0,
        alignment: "left",
        verticalAlignment: "top",
        fontSize: 10,
        lineHeight: 1,
        characterSpacing: 0,
        fontColor: "#000000",
        backgroundColor: "",
        opacity: 1,
        fontName: "suisseframe",
      },
      nallargamento: {
        type: "text",
        position: {
          x: 119.39,
          y: 210.11,
        },
        width: 7.96,
        height: 6.3,
        rotate: 0,
        alignment: "left",
        verticalAlignment: "top",
        fontSize: 10,
        lineHeight: 1,
        characterSpacing: 0,
        fontColor: "#000000",
        backgroundColor: "",
        opacity: 1,
        fontName: "suisseframe",
      },
      nguarnizione: {
        type: "text",
        position: {
          x: 119.39,
          y: 218.52,
        },
        width: 7.96,
        height: 6.3,
        rotate: 0,
        alignment: "left",
        verticalAlignment: "top",
        fontSize: 10,
        lineHeight: 1,
        characterSpacing: 0,
        fontColor: "#000000",
        backgroundColor: "",
        opacity: 1,
        fontName: "suisseframe",
      },
      nlistevetri: {
        type: "text",
        position: {
          x: 119.39,
          y: 225.87,
        },
        width: 7.96,
        height: 6.3,
        rotate: 0,
        alignment: "left",
        verticalAlignment: "top",
        fontSize: 10,
        lineHeight: 1,
        characterSpacing: 0,
        fontColor: "#000000",
        backgroundColor: "",
        opacity: 1,
        fontName: "suisseframe",
      },
      nmaniglia: {
        type: "text",
        position: {
          x: 119.39,
          y: 234.81,
        },
        width: 7.96,
        height: 6.3,
        rotate: 0,
        alignment: "left",
        verticalAlignment: "top",
        fontSize: 10,
        lineHeight: 1,
        characterSpacing: 0,
        fontColor: "#000000",
        backgroundColor: "",
        opacity: 1,
        fontName: "suisseframe",
      },
    },
  ] as any,
};

export const POST = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    const inputData = await req.json();
    const taskNumber = inputData.data.task
      ? Number(inputData.data.task)
      : undefined;
    const data = inputData.data.imballaggioData;
    const items = inputData.data.imballaggioData[0];
    const todayDate = new Date();

    const { data: task, error: taskError } = await supabase
      .from("Task")
      .select(`
        *,
        clients:clientId(*)
      `)
      .eq("id", taskNumber)
      .single();

    if (taskError) throw taskError;

    console.log("task", task);

    let inputs = [];

    if (data.length === 0) {
      inputs = [
        {
          ncoprisoglia: "-",
          nallargamento: "-",
          nguarnizione: "-",
          nlistevetri: "-",
          nmaniglia: "-",
          date: `${DateManager.formatEUDate(todayDate)}`,
          // luogo_data: `Ambri, ${DateManager.formatEUDate(todayDate)}`,
          order_nr: `${task?.unique_code}`,
        },
      ];
    } else {
      inputs = [
        items.items.reduce(
          (acc: any, item: any) => {
            acc.ncoprisoglia = item.name === "Coprisoglia"
              ? `${item.number}`
              : acc.ncoprisoglia;
            acc.nallargamento = item.name === "Allargamenti telaio"
              ? `${item.number}`
              : acc.nallargamento;
            acc.nguarnizione = item.name === "Guarnizione esterna"
              ? `${item.number}`
              : acc.nguarnizione;
            acc.nlistevetri = item.name === "Liste vetri"
              ? `${item.number}`
              : acc.nlistevetri;
            acc.nmaniglia = item.name === "Maniglia e viti"
              ? `${item.number}`
              : acc.nmaniglia;

            return acc;
          },
          {
            ncoprisoglia: "-",
            nallargamento: "-",
            nguarnizione: "-",
            nlistevetri: "-",
            nmaniglia: "-",
            // Add these fields with the respective values
            date: `${DateManager.formatEUDate(todayDate)}`,
            // luogo_data: `Ambri, ${DateManager.formatEUDate(todayDate)}`,
            order_nr: `${task?.unique_code}`,
          },
        ),
      ];
    }

    // Set headers to indicate a file download
    const headers = new Headers();
    headers.append(
      "Content-Disposition",
      `attachment; filename="Report_Bollettino_Progetto.pdf"`,
    );
    const plugins = { text };

    let pdf: Uint8Array;
    switch (task?.clients?.client_language) {
      case "Italiano":
        template.basePdf = basePdfIta; // Use the Italian template
        template.schemas = schemaPdfIta;
        pdf = await generate({ template, plugins, inputs });
        break;
      case "Tedesco":
        template.basePdf = basePdfDe; // Use the German template
        template.schemas = schemaPdfDe;
        pdf = await generate({ template, plugins, inputs });
        break;
      // Add additional cases for other languages
      default:
        // Handle the default case, maybe defaulting to English or Italian, or any default template
        template.basePdf = basePdfIta; // Defaulting to Italian, for example
        pdf = await generate({ template, plugins, inputs });
        break;
    }
    //@ts-ignore
    const blob = new Blob([pdf.buffer], { type: "application/pdf" });

    return new Response(blob, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error: any) {
    console.log("errroreee", error);
    return NextResponse.json({
      error: "PDF Generation Failed",
      message: error.message,
    });
  }
};
