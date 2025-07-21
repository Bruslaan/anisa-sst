import { v4 as uuidv4 } from 'uuid';
import supabase from "./client";
import {Message} from "./types";

export async function saveMessageToDatabase(
  userId: string,
  message: Omit<Message, 'user_id'>
) {
  const { data, error } = await supabase()
    .from('messages')
    .insert({
      ...message,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadBase64Image(
  base64String: string,
  bucketName = 'images'
) {
  try {
    const base64WithoutPrefix = base64String.replace(
      /^data:image\/\w+;base64,/,
      ''
    );

    const buffer = Buffer.from(base64WithoutPrefix, 'base64');

    const filename = `${uuidv4()}.jpg`;

    const { data, error } = await supabase().storage
      .from(bucketName)
      .upload(`uploads/${filename}`, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase().storage.from(bucketName).getPublicUrl(`uploads/${filename}`);

    return {
      path: data.path,
      publicUrl,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function saveImageURLToDatabase(
  userId: string,
  imageURL: string,
  role: 'user' | 'system' | 'assistant'
) {
  const { data, error } = await supabase()
    .from('images')
    .insert({
      image_url: imageURL,
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveMessagesToDatabase(
  userID: string,
  messages: Omit<Message, 'user_id'>[]
) {
  const { data, error } = await supabase()
    .from('messages')
    .upsert(messages.map((message) => ({ ...message, user_id: userID })))
    .select();

  if (error) {
    console.error('Error creating messages', error);
    throw error;
  }
  return data;
}

export async function getMessageHistory(userId: string, limit: number = 15) {
  const { data, error } = await supabase()
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.reverse();
}

export async function getLastImageUrls(userId: string, limit: number = 3) {
  const { data, error } = await supabase()
    .from('images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.reverse();
}
