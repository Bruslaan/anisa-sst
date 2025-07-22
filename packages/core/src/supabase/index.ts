import supabase from "./client";
import {
  saveMessageToDatabase as SaveMessageToDatabase,
  uploadBase64Image as UploadBase64Image,
  saveImageURLToDatabase as SaveImageURLToDatabase,
  saveMessagesToDatabase as SaveMessagesToDatabase,
  getMessageHistory as GetMessageHistory,
  getLastImageUrls as GetLastImageUrls,
} from "./actions";

import { Message as IMessage } from "./types";

export namespace Supabase {
  export const client = supabase;
  export type Message = IMessage;
  export const saveMessageToDatabase = SaveMessageToDatabase;
  export const uploadBase64Image = UploadBase64Image;
  export const saveImageURLToDatabase = SaveImageURLToDatabase;
  export const saveMessagesToDatabase = SaveMessagesToDatabase;
  export const getMessageHistory = GetMessageHistory;
  export const getLastImageUrls = GetLastImageUrls;
}
