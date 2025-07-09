import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

function ImageUploader({ onChange, setPreview, preview, file }: any) {
  // const [preview, setPreview] = useState(null);
  // console.log(preview);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length) {
      const file = acceptedFiles[0];

      const reader = new FileReader();

      reader.onload = function () {
        //@ts-ignore
        setPreview(reader.result);
        onChange(file);
      };

      reader.readAsDataURL(file);
    } else {
      setPreview(null);
      onChange(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpg": [".jpg", ".jpeg"],
    },
    onDrop,
  });

  function handleRemove() {
    setPreview(null);
    onChange(null);
  }

  return (
    <div {...getRootProps()} className="border border-black p-2 rounded-md">
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Trascina qui</p>
      ) : (
        <p>Trascina qui un&apos;immagine, o clicca per selezionarne una</p>
      )}
      {file && (
        <div>
          {/* <img src={preview} alt="Preview" /> */}
          <button className="font-bold " onClick={handleRemove}>
            Cambia
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
