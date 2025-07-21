export type Message = {
    id?: string | undefined;
    user_id: string;
    content?: string | undefined;
    role: 'user' | 'assistant' | 'developer' | 'system';
    media_url?:
        | {
        url: string;
        type: 'image' | 'video' | 'audio' | 'file';
    }
        | undefined;
    created_at?: string | undefined;
};
