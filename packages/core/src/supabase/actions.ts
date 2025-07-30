import {v4 as uuidv4} from 'uuid';
import supabase from "./client";
import {Message, User} from "./types";


export async function getOrCreateUser(phoneNumber: string): Promise<User> {
    try {
        const {data: existingUser, error: fetchError} = await supabase()
            .from('users')
            .select('*')
            .eq('user_id', phoneNumber)
            .single();

        if (fetchError) {
            if (fetchError.code !== 'PGRST116') {
                throw fetchError;
            }
        }

        if (existingUser) {
            return existingUser;
        }

        // If no existing user, create a new one
        console.debug(`No existing user found for phone number: ${phoneNumber}`);
        // Create new user with default credits
        const DEFAULT_CREDITS = 100;
        const {data: newUser, error: insertError} = await supabase()
            .from("users")
            .insert({
                user_id: phoneNumber,
                credits: DEFAULT_CREDITS,
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        if (!newUser) {
            throw new Error('No user created and no error returned');
        }

        return newUser;
    } catch (error) {
        console.error('Error in getOrCreateUser:', error);
        throw error;
    }
}


export async function saveMessageToDatabase(
    userId: string,
    message: Omit<Message, 'user_id'>
) {
    const {data, error} = await supabase()
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

        const {data, error} = await supabase().storage
            .from(bucketName)
            .upload(`uploads/${filename}`, buffer, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
            });

        if (error) {
            throw error;
        }

        const {
            data: {publicUrl},
        } = supabase().storage.from(bucketName).getPublicUrl(`uploads/${filename}`);

        return {
            path: data.path,
            publicUrl,
        };
    } catch (error) {
        throw error;
    }
}

export async function saveImageURLToDatabase(
    userId: string,
    imageURL: string,
    role: 'user' | 'system' | 'assistant'
) {
    const {data, error} = await supabase()
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
    const {data, error} = await supabase()
        .from('messages')
        .upsert(messages.map((message) => ({...message, user_id: userID})))
        .select();

    if (error) {
        throw error;
    }
    return data;
}

export async function getMessageHistory(userId: string, limit: number = 15) {
    const {data, error} = await supabase()
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false})
        .limit(limit);

    if (error) throw error;
    return data.reverse();
}

export async function getLastImageUrls(userId: string, limit: number = 3) {
    const {data, error} = await supabase()
        .from('images')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false})
        .limit(limit);

    if (error) throw error;
    return data.reverse();
}
