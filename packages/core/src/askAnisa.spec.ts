import {test} from "vitest"
import console from "node:console";
import {askAnisa} from "./askAnisa";

test("askAnisa", async () => {

    const response = await askAnisa({
        userId: 'example-user-id',
        prompt: 'hi how are you',
    });

    console.log('Response from Anisa:', response);
})