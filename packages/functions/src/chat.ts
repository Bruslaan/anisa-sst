import type {APIGatewayProxyEventV2, APIGatewayProxyResult} from 'aws-lambda';
import {Anisa} from "@ANISA/core";
import {Supabase} from "@ANISA/core";
import askAnisaFn = Anisa.askAnisaFn;
import uploadBase64Image = Supabase.uploadBase64Image;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

const createResponse = (
    statusCode: number,
    body: any,
    contentType: string = 'application/json'
): APIGatewayProxyResult => ({
    statusCode,
    headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
});


export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return createResponse(200, '');
    }

    try {
        // Serve the chat interface
        if (method === 'GET' && path === '/chat') {
            return createResponse(200, getChatHTML(), 'text/html');
        }

        // Handle chat API requests
        if (method === 'POST' && path === '/chat/message') {
            const body = JSON.parse(event.body || '{}');
            const {userId, message, image} = body;

            if (!userId) {
                return createResponse(400, {error: 'userId is required'});
            }

            let imageUrl: string | undefined;

            // Handle image upload if provided
            if (image && image.startsWith('data:image/')) {
                console.log('Uploading image for user:', userId);
                try {
                    const uploadResult = await uploadBase64Image(image);
                    imageUrl = uploadResult.publicUrl;
                    console.log('Image uploaded successfully:', uploadResult.publicUrl);
                } catch (error) {
                    console.error('Image upload failed:', error);
                    return createResponse(500, {error: 'Failed to upload image'});
                }
            }

            // Call askAnisa function with extended timeout handling
            console.log('Calling askAnisa for user:', userId, 'with message:', message ? 'text' : 'image only');
            const startTime = Date.now();
            
            try {
                const response = await askAnisaFn({
                    userId,
                    prompt: message,
                    imageUrl
                });
                
                const processingTime = Date.now() - startTime;
                console.log(`askAnisa completed in ${processingTime}ms`);

                return createResponse(200, {
                    response: response.content,
                    image_url: response.image_url,
                    type: response.type,
                    tokens: response.total_tokens,
                    cost: response.cost,
                    processing_time_ms: processingTime
                });
            } catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`askAnisa failed after ${processingTime}ms:`, error);
                throw error;
            }
        }

        return createResponse(404, {error: 'Not found'});

    } catch (error) {
        console.error('Chat handler error:', error);
        return createResponse(500, {
            error: 'Internal server error',
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

const getChatHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat with Anisa</title>
    <style>
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: #e5ddd5;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .chat-container {
            background: #ffffff;
            width: 100%;
            max-width: 480px;
            height: 700px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-radius: 0;
            overflow: hidden;
        }
        
        @media (max-width: 768px) {
            .chat-container {
                height: 100vh;
                max-width: 100%;
                border-radius: 0;
            }
            body {
                padding: 0;
            }
        }
        
        .chat-header {
            background: #075e54;
            color: white;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .header-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #25d366;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: white;
        }
        
        .header-info h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 500;
        }
        
        .header-info p {
            margin: 0;
            font-size: 13px;
            opacity: 0.8;
        }
        
        .chat-messages {
            flex: 1;
            padding: 8px;
            overflow-y: auto;
            background-image: 
                radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
            background-color: #e5ddd5;
        }
        
        .message {
            margin-bottom: 8px;
            display: flex;
            flex-direction: column;
        }
        
        .message.user {
            align-items: flex-end;
        }
        
        .message.assistant {
            align-items: flex-start;
        }
        
        .message-bubble {
            max-width: 85%;
            padding: 8px 12px;
            border-radius: 8px;
            word-wrap: break-word;
            position: relative;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .message.user .message-bubble {
            background: #dcf8c6;
            color: #303030;
            border-bottom-right-radius: 3px;
        }
        
        .message.assistant .message-bubble {
            background: #ffffff;
            color: #303030;
            border-bottom-left-radius: 3px;
        }
        
        .message-image {
            max-width: 100%;
            border-radius: 8px;
            margin-top: 4px;
            display: block;
        }
        
        .message-stats {
            font-size: 10px;
            color: #667781;
            margin-top: 2px;
            text-align: right;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .message.assistant .message-stats {
            text-align: left;
        }
        
        .message-time {
            font-size: 11px;
            color: #667781;
            margin-top: 2px;
            text-align: right;
            opacity: 0.7;
        }
        
        .chat-input {
            display: flex;
            padding: 8px;
            background: #f0f0f0;
            align-items: flex-end;
            gap: 8px;
        }
        
        .input-container {
            flex: 1;
            background: white;
            border-radius: 24px;
            display: flex;
            align-items: center;
            padding: 0 4px;
            min-height: 40px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .file-button {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: #54656f;
            transition: background 0.2s;
            position: relative;
            overflow: hidden;
        }
        
        .file-button:hover {
            background: #f5f6f6;
        }
        
        .file-button.has-image {
            border: 2px solid #25d366;
            border-radius: 8px;
            width: 40px;
            height: 40px;
            background-size: cover;
            background-position: center;
        }
        
        .file-button.has-image::after {
            content: '';
            position: absolute;
            top: -2px;
            right: -2px;
            width: 16px;
            height: 16px;
            background: #25d366;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
        }
        
        .file-button.has-image::after {
            content: '✓';
        }
        
        #fileInput {
            position: absolute;
            opacity: 0;
            width: 100%;
            height: 100%;
            cursor: pointer;
        }
        
        #messageInput {
            flex: 1;
            border: none;
            outline: none;
            padding: 9px 12px;
            font-size: 15px;
            background: transparent;
            resize: none;
            min-height: 22px;
            max-height: 100px;
            line-height: 22px;
        }
        
        #messageInput::placeholder {
            color: #667781;
        }
        
        #sendButton {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: #25d366;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: background 0.2s;
        }
        
        #sendButton:hover {
            background: #128c7e;
        }
        
        #sendButton:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        
        .typing-indicator {
            display: none;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        
        .typing-bubble {
            background: #ffffff;
            padding: 12px 16px;
            border-radius: 8px;
            border-bottom-left-radius: 3px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .typing-dots {
            display: flex;
            gap: 3px;
        }
        
        .typing-dot {
            width: 6px;
            height: 6px;
            background: #667781;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
        }
        
        .user-id-input {
            background: #075e54;
            padding: 12px 20px;
            color: white;
            display: flex;
            gap: 12px;
            align-items: center;
            font-size: 14px;
        }
        
        #userIdInput {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            font-size: 14px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }
        
        #userIdInput::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        
        .image-preview-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .image-preview {
            max-width: 90%;
            max-height: 80%;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .preview-actions {
            margin-top: 20px;
            display: flex;
            gap: 12px;
        }
        
        .preview-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 20px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .preview-btn.cancel {
            background: #666;
            color: white;
        }
        
        .preview-btn.confirm {
            background: #25d366;
            color: white;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <div class="header-avatar">🤖</div>
            <div class="header-info">
                <h3>Anisa AI</h3>
                <p>Online - AI Assistant</p>
            </div>
        </div>
        
        <div class="user-id-input">
            <label for="userIdInput">👤 User ID:</label>
            <input type="text" id="userIdInput" placeholder="Enter your user ID" value="demo-user">
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="message assistant">
                <div class="message-bubble">
                    <div>Hello! I'm Anisa. You can send me text messages or upload images to chat with me. How can I help you today?</div>
                    <div class="message-time" id="initialTime"></div>
                </div>
            </div>
        </div>
        
        <div class="typing-indicator" id="typingIndicator">
            <div class="typing-bubble">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <span>Anisa is typing...</span>
            </div>
        </div>
        
        <div class="chat-input">
            <div class="input-container">
                <div class="file-button" id="fileButton">
                    <input type="file" id="fileInput" accept="image/*" />
                    <span>📎</span>
                </div>
                <input type="text" id="messageInput" placeholder="Type a message" />
            </div>
            <button id="sendButton">➤</button>
        </div>
    </div>

    <script>
        const chatMessages = document.getElementById('chatMessages');
        const messageInput = document.getElementById('messageInput');
        const fileInput = document.getElementById('fileInput');
        const fileButton = document.getElementById('fileButton');
        const sendButton = document.getElementById('sendButton');
        const userIdInput = document.getElementById('userIdInput');
        const typingIndicator = document.getElementById('typingIndicator');
        
        let selectedImage = null;
        
        // Set initial time
        document.getElementById('initialTime').textContent = formatTime(new Date());
        
        function formatTime(date) {
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });
        }
        
        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedImage = e.target.result;
                    
                    // Update button to show image preview
                    fileButton.classList.add('has-image');
                    fileButton.style.backgroundImage = \`url(\${e.target.result})\`;
                    fileButton.querySelector('span').style.display = 'none';
                    
                    console.log('Image selected:', file.name);
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Reset file button
        function resetFileButton() {
            fileButton.classList.remove('has-image');
            fileButton.style.backgroundImage = '';
            fileButton.querySelector('span').style.display = 'block';
            fileInput.value = '';
            selectedImage = null;
        }
        
        // Add message to chat
        function addMessage(content, role, imageUrl = null, stats = null) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}\`;
            
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'message-bubble';
            
            const contentDiv = document.createElement('div');
            contentDiv.textContent = content;
            bubbleDiv.appendChild(contentDiv);
            
            if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.className = 'message-image';
                img.alt = 'Uploaded image';
                bubbleDiv.appendChild(img);
            }
            
            // Add time
            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            timeDiv.textContent = formatTime(new Date());
            bubbleDiv.appendChild(timeDiv);
            
            // Add stats for assistant messages
            if (role === 'assistant' && stats) {
                const statsDiv = document.createElement('div');
                statsDiv.className = 'message-stats';
                
                let statsText = '';
                if (stats.tokens) {
                    statsText += \`🔤 \${stats.tokens} tokens\`;
                }
                if (stats.cost) {
                    statsText += statsText ? \` • 💰 $\${stats.cost.toFixed(4)}\` : \`💰 $\${stats.cost.toFixed(4)}\`;
                }
                if (stats.processing_time_ms) {
                    statsText += statsText ? \` • ⏱️ \${(stats.processing_time_ms/1000).toFixed(1)}s\` : \`⏱️ \${(stats.processing_time_ms/1000).toFixed(1)}s\`;
                }
                
                statsDiv.textContent = statsText;
                bubbleDiv.appendChild(statsDiv);
            }
            
            messageDiv.appendChild(bubbleDiv);
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Show/hide typing indicator
        function setTyping(isTyping) {
            typingIndicator.style.display = isTyping ? 'flex' : 'none';
            if (isTyping) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
        
        // Send message
        async function sendMessage() {
            const message = messageInput.value.trim();
            const userId = userIdInput.value.trim();
            
            if (!userId) {
                alert('Please enter a user ID');
                return;
            }
            
            if (!message && !selectedImage) {
                return;
            }
            
            // Disable input
            sendButton.disabled = true;
            messageInput.disabled = true;
            document.querySelector('.chat-container').classList.add('loading');
            
            // Add user message
            if (message) {
                addMessage(message, 'user');
            }
            
            if (selectedImage) {
                addMessage('📷 Image attached', 'user');
            }
            
            // Clear inputs
            messageInput.value = '';
            resetFileButton();
            
            // Show typing indicator
            setTyping(true);
            
            try {
                // Create AbortController for longer timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout
                
                const response = await fetch('/chat/message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId,
                        message: message || undefined,
                        image: selectedImage || undefined
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                const data = await response.json();
                
                console.log("Response data:", data);
                
                if (response.ok) {
                    // Add assistant response with stats
                    const stats = {
                        tokens: data.tokens,
                        cost: data.cost,
                        processing_time_ms: data.processing_time_ms
                    };
                    addMessage(data.response, 'assistant', data.image_url, stats);
                } else {
                    addMessage(\`Error: \${data.error || 'Unknown error'}\`, 'assistant');
                }
            } catch (error) {
                console.error('Error:', error);
                if (error.name === 'AbortError') {
                    addMessage('Request timed out. The operation took too long. Please try again.', 'assistant');
                } else {
                    addMessage('Sorry, something went wrong. Please try again.', 'assistant');
                }
            } finally {
                // Hide typing indicator
                setTyping(false);
                
                // Re-enable input
                sendButton.disabled = false;
                messageInput.disabled = false;
                document.querySelector('.chat-container').classList.remove('loading');
                
                // Already cleared by resetFileButton()
                
                // Focus input
                messageInput.focus();
            }
        }
        
        // Event listeners
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Focus input on load
        messageInput.focus();
    </script>
</body>
</html>
`;