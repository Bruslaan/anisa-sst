import fs from "fs";
import {client} from "./client";
import {ResponseUsage} from "openai/resources/responses/responses.mjs";

export async function transcribeAudio(filePath: string): Promise<string> {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const transcription = await client().audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "gpt-4o-mini-transcribe",
        });

        return transcription.text;
    } catch (error) {
        throw error;
    }
}

export const calculateCostText = (usage?: ResponseUsage) => {
    if (!usage) return 0;
    return (
        (0.1 / 1000000) * (usage.input_tokens || 0) +
        (0.2 / 1000000) * (usage.output_tokens || 0)
    );
};
