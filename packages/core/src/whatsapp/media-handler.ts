import axios from "axios";
import { Readable } from "openai/_shims/node-types.mjs";
import fs from "fs";
import sharp from "sharp";

const MAX_DIMENSION = 1536; // OpenAI recommends images around 768px-2048px
const MIN_DIMENSION = 250;
const GRAPH_API_TOKEN = process.env.GRAPH_API_TOKEN;

export const getTests = async (url: string) => {
  const mediastream = await axios({
    method: "GET",
    url: url,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
  });

  return mediastream.data;
};

export const downloadMediaToStream = async (url: string) => {
  const mediastream = await axios({
    method: "GET",
    url: url,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    responseType: "stream",
  });

  return mediastream.data;
};

export const getMediaURL = async (mediaID: string) => {
  const {
    data: { url },
  } = await axios({
    method: "GET",
    url: `https://graph.facebook.com/v23.0/${mediaID}/`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
  });

  return url;
};

export const downloadImageToBase64 = async (imageURL: string) => {
  const downloadedStream = await downloadMediaToStream(imageURL);
  const base64Image = await streamToBase64(downloadedStream);
  const optimizedImage = await processImageForVisionAPI(base64Image as string);

  return optimizedImage;
};

export const streamToBase64 = (stream: Readable) => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const base64String = buffer.toString("base64");
      resolve(`data:image/jpeg;base64,${base64String}`);
    });
    stream.on("error", (error) => reject(error));
  });
};

export const saveStreamToDisk = (
  stream: Readable,
  filePath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    stream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
};

export const readFromFile = (filePath: string) => {
  const readStream = fs.createReadStream(filePath);
  return readStream;
};

export const deleteFile = (filePath: string) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file", filePath, err);
    }
  });
};

export async function processImageForVisionAPI(
  base64String: string
): Promise<string> {
  try {
    // Remove data URI prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || MAX_DIMENSION;
    const originalHeight = metadata.height || MAX_DIMENSION;

    // Calculate scale factor to maintain aspect ratio
    // Use the larger dimension to determine scale factor
    const largerDimension = Math.max(originalWidth, originalHeight);
    const scaleFactor = Math.min(
      MAX_DIMENSION / largerDimension,
      1 // Don't upscale if image is smaller than MAX_DIMENSION
    );

    const newWidth = Math.max(
      MIN_DIMENSION,
      Math.round(originalWidth * scaleFactor)
    );
    const newHeight = Math.max(
      MIN_DIMENSION,
      Math.round(originalHeight * scaleFactor)
    );

    // Process image with aggressive optimization
    const processedBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, {
        fit: "inside",
        withoutEnlargement: true,
        kernel: "lanczos3", // Better quality downscaling
      })
      .webp({
        quality: 80, // Reduced quality for smaller file size
        effort: 3, // Maximum compression effort
        preset: "text", // Optimized for photos
        smartSubsample: true, // Better chroma subsampling
      })
      .toBuffer();

    // Convert back to base64 with data URI
    const finalBase64 = processedBuffer.toString("base64");
    console.log(
      "Processed image size:",
      Math.round(finalBase64.length / 1024),
      "KB"
    );

    return `data:image/webp;base64,${finalBase64}`;
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}

export async function downloadAndDeleteAudio<T>(
  mediaId: string,
  processCallback: (audioFilePath: string) => Promise<T>
): Promise<T> {
  try {
    const url = await getMediaURL(mediaId);
    const mediaStream = await downloadMediaToStream(url);
    const audioFilePath = "/tmp/" + mediaId + ".ogg";

    await saveStreamToDisk(mediaStream, audioFilePath);

    const callbackreturn = await processCallback(audioFilePath);

    deleteFile(audioFilePath);

    return callbackreturn;
  } catch (error) {
    console.error("Error downloading and transcribing audio:", error);
    throw error;
  }
}
