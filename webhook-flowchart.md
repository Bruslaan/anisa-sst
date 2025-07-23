# Webhook.ts Flow Chart

```mermaid
flowchart TD
    A[Incoming HTTP Request] --> B{Request Method?}
    
    B -->|GET| C[handleWebhookVerification]
    B -->|POST| D[handleWhatsAppMessage]
    B -->|Other| E[Return 200 'Method Not Allowed']
    
    C --> F{Valid Verification?}
    F -->|Yes| G[Return 200 with hub.challenge]
    F -->|No| H[Return 403 Forbidden]
    
    D --> I[Parse Request Body]
    I --> J{Valid WhatsApp Message?}
    J -->|No| K[Return 200 Empty Response]
    J -->|Yes| L[Extract WhatsApp Message]
    
    L --> M[Log Received Message]
    M --> N{Message Type?}
    
    N -->|Image| O[processImageMedia]
    N -->|Audio| P[Get Audio ID]
    N -->|Text| Q[No Media Processing]
    
    O --> R[Get Media URL]
    R --> S[Download Media Stream]
    S --> T[Convert to Base64]
    T --> U[Upload to Supabase]
    U --> V[Get Public URL]
    
    P --> W[Set mediaUrl to audio.id]
    Q --> X[mediaUrl = undefined]
    V --> Y[mediaUrl = publicUrl]
    
    W --> Z[Create AnisaPayload]
    X --> Z
    Y --> Z
    
    Z --> AA[Send to SQS Queue]
    AA --> BB[MessageGroupId: waMessage.from]
    BB --> CC[MessageDeduplicationId: waMessage.id]
    CC --> DD[Log 'Message sent to SQS']
    
    DD --> EE[Get Business Phone Number ID]
    EE --> FF{Phone Number ID exists?}
    FF -->|Yes| GG[Mark Message as Read]
    FF -->|No| HH[Skip Mark as Read]
    
    GG --> II[Log 'Message marked as read']
    HH --> JJ[Return 200 Success Response]
    II --> JJ
    
    JJ --> KK[Return JSON with success message and timestamp]
    
    %% Error Handling
    O -.->|Error| LL[Log Error & Throw]
    AA -.->|Error| MM[Log Error & Return 200 Empty]
    GG -.->|Error| MM
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style J fill:#fff3e0
    style N fill:#fff3e0
    style FF fill:#fff3e0
    style O fill:#f3e5f5
    style AA fill:#e8f5e8
    style GG fill:#e8f5e8
    style KK fill:#e1f5fe
```

## Key Components

### Verification Flow (GET requests)
- Validates webhook with `hub.mode`, `hub.verify_token`, and `hub.challenge`
- Returns challenge token if valid, 403 if invalid

### Message Processing Flow (POST requests)
1. **Validation**: Checks if request contains valid WhatsApp message
2. **Message Extraction**: Extracts WhatsApp message data
3. **Media Processing**: 
   - Images: Downloads, converts to base64, uploads to Supabase
   - Audio: Uses audio ID directly
   - Text: No media processing
4. **Payload Creation**: Creates standardized AnisaPayload
5. **Queue Dispatch**: Sends to SQS with deduplication
6. **Read Receipt**: Marks message as read in WhatsApp
7. **Response**: Returns success confirmation

### Error Handling
- Media processing errors are logged and thrown
- SQS/WhatsApp API errors are caught and logged, but return 200 to prevent webhook retries
- Always returns 200 status to acknowledge receipt to WhatsApp