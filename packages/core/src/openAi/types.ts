export type ResponseStructureOutput = {
    type: 'text' | 'image' ;
    content?: string;
    image_url?: string;
    total_tokens?: number | undefined;
    cost?: number | undefined;
};
