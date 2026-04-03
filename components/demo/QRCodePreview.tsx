"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

export function QRCodePreview({
    value,
    title,
    filename = "demo-qr",
}: {
    value: string;
    title?: string;
    filename?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);

    const getSvgElement = () => {
        return containerRef.current?.querySelector("svg") || null;
    };

    const downloadSvg = () => {
        const svg = getSvgElement();
        if (!svg) return;

        const svgMarkup = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `${filename}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const downloadPng = () => {
        const svg = getSvgElement();
        if (!svg) return;

        const svgMarkup = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const img = new Image();
        const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            context?.drawImage(img, 0, 0);

            const pngUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = pngUrl;
            link.download = `${filename}.png`;
            link.click();
            URL.revokeObjectURL(url);
        };

        img.src = url;
    };

    return (
        <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white p-4 text-slate-900 shadow-lg">
            <div ref={containerRef}>
                <QRCodeSVG value={value} size={180} includeMargin />
            </div>
            {title && <p className="text-sm font-medium text-slate-700">{title}</p>}
            <div className="flex gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    onClick={downloadSvg}
                >
                    Scarica SVG
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    onClick={downloadPng}
                >
                    Scarica PNG
                </Button>
            </div>
        </div>
    );
}
