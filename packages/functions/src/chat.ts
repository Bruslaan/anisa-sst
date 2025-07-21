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
                } catch (error) {
                    console.error('Image upload failed:', error);
                    return createResponse(500, {error: 'Failed to upload image'});
                }
            }

            // Call askAnisa function
            const response = await askAnisaFn({
                userId,
                prompt: message,
                imageUrl
            });

            return createResponse(200, {
                response: response.content,
                image_url: response.image_url,
                type: response.type,
                tokens: response.total_tokens,
                cost: response.cost
            });
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
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .chat-container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 800px;
            height: 600px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .chat-header {
            background: #4f46e5;
            color: white;
            padding: 20px;
            text-align: center;
            font-weight: 600;
            font-size: 18px;
        }
        
        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f8fafc;
        }
        
        .message {
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
        }
        
        .message.user {
            align-items: flex-end;
        }
        
        .message.assistant {
            align-items: flex-start;
        }
        
        .message-content {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
        }
        
        .message.user .message-content {
            background: #4f46e5;
            color: white;
        }
        
        .message.assistant .message-content {
            background: #e5e7eb;
            color: #374151;
        }
        
        .message-image {
            max-width: 300px;
            border-radius: 10px;
            margin-top: 8px;
        }
        
        .chat-input {
            display: flex;
            padding: 20px;
            background: white;
            border-top: 1px solid #e5e7eb;
            gap: 10px;
        }
        
        .input-group {
            flex: 1;
            display: flex;
            gap: 10px;
        }
        
        #messageInput {
            flex: 1;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 25px;
            outline: none;
            font-size: 14px;
        }
        
        #messageInput:focus {
            border-color: #4f46e5;
        }
        
        .file-input-wrapper {
            position: relative;
            overflow: hidden;
            display: inline-block;
        }
        
        #fileInput {
            position: absolute;
            left: -9999px;
        }
        
        .file-button, #sendButton {
            background: #4f46e5;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
        }
        
        .file-button:hover, #sendButton:hover {
            background: #3730a3;
        }
        
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        
        .typing-indicator {
            display: none;
            align-items: center;
            gap: 8px;
            color: #6b7280;
            font-style: italic;
            margin-bottom: 15px;
        }
        
        .typing-dots {
            display: flex;
            gap: 3px;
        }
        
        .typing-dot {
            width: 6px;
            height: 6px;
            background: #6b7280;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
        }
        
        .user-id-input {
            background: #f3f4f6;
            padding: 15px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        #userIdInput {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            💬 Chat with Anisa AI
        </div>
        
        <div class="user-id-input">
            <label for="userIdInput">User ID:</label>
            <input type="text" id="userIdInput" placeholder="Enter your user ID" value="demo-user">
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="message assistant">
                <div class="message-content">
                    Hello! I'm Anisa. You can send me text messages or upload images to chat with me. How can I help you today?
                </div>
            </div>
        </div>
        
        <div class="typing-indicator" id="typingIndicator">
            <span>Anisa is typing</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
        
        <div class="chat-input">
            <div class="input-group">
                <input type="text" id="messageInput" placeholder="Type your message..." />
                <div class="file-input-wrapper">
                    <input type="file" id="fileInput" accept="image/*" />
                    <button class="file-button" onclick="document.getElementById('fileInput').click()">📷</button>
                </div>
                <button id="sendButton">Send</button>
            </div>
        </div>
    </div>

    <script>
        const chatMessages = document.getElementById('chatMessages');
        const messageInput = document.getElementById('messageInput');
        const fileInput = document.getElementById('fileInput');
        const sendButton = document.getElementById('sendButton');
        const userIdInput = document.getElementById('userIdInput');
        const typingIndicator = document.getElementById('typingIndicator');
        
        let selectedImage = null;
        
        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedImage = e.target.result;
                    // Show preview or indication that image is selected
                    console.log('Image selected:', file.name);
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Add message to chat
        function addMessage(content, role, imageUrl = null) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}\`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;
            
            messageDiv.appendChild(contentDiv);
            
            if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.className = 'message-image';
                img.alt = 'Uploaded image';
                messageDiv.appendChild(img);
            }
            
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
                addMessage('📷 Image uploaded', 'user');
            }
            
            // Clear inputs
            messageInput.value = '';
            fileInput.value = '';
            
            // Show typing indicator
            setTyping(true);
            
            try {
                const response = await fetch('/chat/message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId,
                        message: message || undefined,
                        image: selectedImage || undefined
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Add assistant response
                    addMessage(data.response, 'assistant', data.image_url);
                } else {
                    addMessage(\`Error: \${data.error}\`, 'assistant');
                }
            } catch (error) {
                console.error('Error:', error);
                addMessage('Sorry, something went wrong. Please try again.', 'assistant');
            } finally {
                // Hide typing indicator
                setTyping(false);
                
                // Re-enable input
                sendButton.disabled = false;
                messageInput.disabled = false;
                document.querySelector('.chat-container').classList.remove('loading');
                
                // Clear selected image
                selectedImage = null;
                
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