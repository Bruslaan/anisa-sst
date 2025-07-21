import {test} from "vitest"
import console from "node:console";
import {askAnisa} from "./askAnisa";

test("askAnisa", async () => {

    const response = await askAnisa({
        userId: 'example-user-id',
        prompt: 'But keet the previous girl infront of the macbook'

    });

    console.log('Response from Anisa:', response);
}, 180000)