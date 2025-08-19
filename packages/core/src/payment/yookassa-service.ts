import {v4 as uuidv4} from 'uuid';

interface YooKassaPaymentResponse {
    id: string;
    status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
    paid: boolean;
    amount: {
        value: string;
        currency: string;
    };
    confirmation: {
        type: 'redirect';
        confirmation_url: string;
    };
    created_at: string;
    description: string;
    metadata: Record<string, unknown>;
    recipient: {
        account_id: string;
        gateway_id: string;
    };
    refundable: boolean;
    test: boolean;
}

async function createPayment(amount: string, phoneNumber: string, userId: string, credits: number): Promise<YooKassaPaymentResponse> {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_API_KEY;
    const idempotenceKey = uuidv4();

    // Base64 encode credentials for Basic Auth
    const credentials = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    try {
        const response = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Idempotence-Key': idempotenceKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: {
                    value: amount,
                    currency: "RUB"
                },
                "receipt": {
                    "customer": {
                        "phone": phoneNumber.toString(),
                    },
                    "items": [
                        {
                            "payment_subject": "payment",
                            "payment_mode": "full_payment",
                            "description": "Anisa tokens",
                            "quantity": 1,
                            "amount": {
                                "value": amount,
                                "currency": "RUB"
                            },
                            "vat_code": 2
                        }

                    ]
                },
                capture: true,
                confirmation: {
                    type: "redirect",
                    return_url: "https://www.myanisa.com/api/payment/processing"
                },
                description: `Payment for Anisa ai tokens`,
                "metadata": {
                    "userID": userId,
                    "phoneNumber": phoneNumber,
                    "credits": credits,
                }
            })
        });

        const data = await response.json();
        console.log(data);
        return data as YooKassaPaymentResponse;
    } catch (error) {
        console.error('Error creating payment:', error);
        throw error;
    }
}


export default createPayment;