export type ResponseStructureOutput = {
    type: 'text' | 'image' | 'function_call';
    content?: string;
    image_url?: string;
    total_tokens?: number | undefined;
    cost?: number | undefined;
};
