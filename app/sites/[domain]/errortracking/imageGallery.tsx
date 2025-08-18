"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@tremor/react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
function ImageGallery({ files }: { files: any }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [open, setOpen] = useState(false);
  const handlePrevClickImages = () => {
    setCurrentImage(currentImage - 1);
  };

  const handleNextClickImages = () => {
    setCurrentImage(currentImage + 1);
  };

  return (
    <div>
      {/* <a href={files[currentImage]?.url} download={true} target="_blank"> */}
      <Image
        onClick={() => setOpen(true)}
        src={files[currentImage].url}
        alt={files[currentImage].id}
        width={300}
        height={300}
      />
      {/* </a> */}
      <div className="flex flex-row gap-2 pt-2 ">
        <Button
          size="xs"
          variant="light"
          disabled={currentImage === 0}
          onClick={handlePrevClickImages}
        >
          Prec.
        </Button>
        <Button
          size="xs"
          variant="light"
          disabled={currentImage == files.length - 1 ? true : false}
          onClick={handleNextClickImages}
        >
          Pros.
        </Button>
      </div>
      {/* Carousel */}
      <Dialog open={open} onOpenChange={() => setOpen(false)}>
        <DialogContent className="sm:max-w-[600px] flex justify-center items-center border-none bg-transparent">
          <Carousel className="relative max-h-[90%] max-w-[80%] ">
            <CarouselContent>
              {files.map((file: any, index: number) => (
                <CarouselItem key={file.cloudinaryId}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex aspect-square items-center justify-center p-6">
                        <Image
                          src={file.url}
                          alt={file.id}
                          width={600}
                          height={600}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ImageGallery;
