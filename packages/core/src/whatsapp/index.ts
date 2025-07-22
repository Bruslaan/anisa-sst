import { WhatsappMessage, WhatsappMessagePayload } from "./wa-types";
import {
  isAWhatsappMessage as IsAWhatsappMessage,
  getBusinessPhoneNumberId as GetBusinessPhoneNumberId,
  extractWAMessage as ExtractWAMessage,
  getMediaURL as GetMediaURL,
  streamToBase64 as StreamToBase64,
  downloadMediaToStream as DownloadMediaToStream,
  markAsRead as MarkAsRead,
  reply as Reply,
  replyWithCallToAction2 as ReplyWithCallToAction2,
  replyWithCallToAction as ReplyWithCallToAction,
  sendMessage as SendMessage,
  sendImage as SendImage,
  uploadMedia as UploadMedia,
  sendAudio as SendAudio,
  sendInteractiveButtons as SendInteractiveButtons,
  sendListMessage as SendListMessage,
} from "./helper";
import {
  downloadAndDeleteAudio as DownloadAndDeleteAudio,
  downloadImageToBase64 as DownloadImageToBase64,
  saveStreamToDisk as SaveStreamToDisk,
  readFromFile as ReadFromFile,
  deleteFile as DeleteFile,
  processImageForVisionAPI as ProcessImageForVisionAPI,
} from "./media-handler";

export namespace Whatsapp {
  export type WaMessage = WhatsappMessage;
  export type MessagePayload = WhatsappMessagePayload;

  export const isWAMessage = IsAWhatsappMessage;
  export const getBusinessPhoneNumberId = GetBusinessPhoneNumberId;
  export const extractWaMessage = ExtractWAMessage;
  export const getMediaURL = GetMediaURL;
  export const streamToBase64 = StreamToBase64;
  export const downloadMediaToStream = DownloadMediaToStream;
  export const markAsRead = MarkAsRead;
  export const reply = Reply;
  export const replyWithCallToAction2 = ReplyWithCallToAction2;
  export const replyWithCallToAction = ReplyWithCallToAction;
  export const sendMessage = SendMessage;
  export const sendImage = SendImage;
  export const uploadMedia = UploadMedia;
  export const sendAudio = SendAudio;
  export const sendInteractiveButtons = SendInteractiveButtons;
  export const sendListMessage = SendListMessage;
  export const downloadAndDeleteAudio = DownloadAndDeleteAudio;
  export const downloadImageToBase64 = DownloadImageToBase64;
  export const saveStreamToDisk = SaveStreamToDisk;
  export const readFromFile = ReadFromFile;
  export const deleteFile = DeleteFile;
  export const processImageForVisionAPI = ProcessImageForVisionAPI;
}
