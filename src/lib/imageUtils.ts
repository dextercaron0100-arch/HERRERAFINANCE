export const compressImage = (file: File, maxSizeMB: number = 0.04): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Set maximum dimensions
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // reasonable resolution for receipt readability
        
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject("Could not get canvas context");
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Target ~25KB base64 string
        let quality = 0.5;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        
        // Iteratively reduce quality if needed (to try to stay under ~35,000 chars)
        while (dataUrl.length > 35000 && quality > 0.05) {
          quality -= 0.05;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });

export const RECEIPT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
export const RECEIPT_MAX_SIZE_MB = 10;

export interface PreparedReceipt {
  id: string;
  file: File;
  dataUrl: string;
}

export const prepareReceiptFile = async (file: File): Promise<PreparedReceipt> => {
  if (!RECEIPT_ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`${file.name}: must be a JPG, PNG, WEBP, or PDF file.`);
  }
  if (file.size > RECEIPT_MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`${file.name}: file must be ${RECEIPT_MAX_SIZE_MB} MB or smaller.`);
  }

  const dataUrl = file.type.startsWith("image/")
    ? await compressImage(file)
    : await readFileAsDataUrl(file);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    dataUrl,
  };
};
