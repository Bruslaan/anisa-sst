import supabase from "./client";

export async function getUserCredits(userId: string): Promise<number> {
    const {data, error} = await supabase()
        .from("users")
        .select("credits")
        .eq("id", userId)
        .single();

    if (error) throw error;
    return data.credits;
}

export async function decrementCredits(userId: string, credits: number = 1): Promise<number> {

    const currentCredits = await getUserCredits(userId);

    const remainingCredits = Math.max(0, currentCredits - credits);
    const {data, error} = await supabase()
        .from("users")
        .update({credits: remainingCredits}) // TODO: for now it is simple decrement of one credit. Ofc we need to think how to imporve based on tool cost.
        .eq("id", userId)
        .select("credits")
        .single();

    console.log("decrementCredits", {userId, credits, currentCredits, remainingCredits});

    if (error) throw error;
    return data.credits;
}

export async function addCredits(
    userId: string,
    amount: number,
    paymentId?: string,
): Promise<number> {
    // Get current credits
    const currentCredits = await getUserCredits(userId);

    // Update with new credits and payment ID if provided
    const updateData: { credits: number; payment_id?: string } = {
        credits: currentCredits + amount,
    };

    if (paymentId) {
        updateData.payment_id = paymentId;
    }

    const {data, error} = await supabase()
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select("credits")
        .single();

    if (error) throw error;
    return data.credits;
}
