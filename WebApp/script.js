// Global error handler
window.onerror = function (message, source, lineno, colno, error) {
    console.log('Global error caught:', message, 'at line:', lineno);
    return false;
};

document.addEventListener('DOMContentLoaded', () => {    // DOM elements
    const recordButton = document.getElementById('recordButton');
    const buttonText = recordButton.querySelector('.button-text');
    const recordingStatus = document.getElementById('recordingStatus');
    const timer = document.getElementById('timer');
    const textOutput = document.getElementById('textOutput');
    const status = document.getElementById('status');
    const downloadTranscriptBtn = document.getElementById('downloadTranscriptBtn');
    const questionSelect = document.getElementById('questionSelect');
    const startQuestionBtn = document.getElementById('startQuestionBtn');
    const instructionsSection = document.getElementById('instructionsSection');
    const toggleInstructionsBtn = document.getElementById('toggleInstructionsBtn');
    const instructionsContent = document.getElementById('instructionsContent');
    
    // Current question text and ID
    let currentQuestionId = questionSelect.value;
    let currentQuestionText = '';
    let questionHasBeenPosed = false; // Track if a question has been posed
    
    // API endpoints
    const API_URL = 'http://localhost:8000/process-answer/';
    const START_QUESTION_API_URL = 'http://localhost:8000/pose-question/';

    // Helper function to scroll transcript to bottom
    function scrollTranscriptToBottom() {
        textOutput.scrollTop = textOutput.scrollHeight;
    }
    
    // Recording variables
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let timerInterval;
    let recordingTime = 0;

    // Event listener for record button
    recordButton.addEventListener('click', toggleRecording);    // Function to toggle recording
    async function toggleRecording() {
        if (!isRecording) {
            // Only allow recording if a question has been posed
            if (!questionHasBeenPosed) {
                status.textContent = 'Please pose a question before recording an answer.';
                status.className = 'status error';
                return;
            }
            startRecording();
        } else {
            stopRecording();
        }
    }

    // Start recording
    async function startRecording() {
        try {
            // Reset
            audioChunks = [];
            recordingTime = 0;
            updateTimer();

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create media recorder
            mediaRecorder = new MediaRecorder(stream);

            // Start recording
            mediaRecorder.start();
            isRecording = true;
            
            // Update UI
            recordButton.classList.add('recording');
            buttonText.textContent = 'Stop Recording';
            recordingStatus.textContent = 'Recording...';
            // Use status bar instead of transcript window for recording status
            status.textContent = 'Recording in progress...';
            status.className = 'status recording';

            // Start timer
            timerInterval = setInterval(() => {
                recordingTime++;
                updateTimer();
            }, 1000);

            // Event handlers for media recorder
            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', () => {
                // Stop all tracks in the stream
                stream.getTracks().forEach(track => track.stop());
            });

        } catch (error) {
            console.error('Error accessing microphone:', error);
            status.textContent = 'Error accessing microphone. Please ensure your browser has permission.';
            status.className = 'status error';
        }
    }

    // Stop recording
    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;

            // Update UI
            recordButton.classList.remove('recording');
            buttonText.textContent = 'Start Recording';
            recordingStatus.textContent = '';
            status.textContent = 'Processing audio...';
            status.className = 'status loading';

            // Stop timer
            clearInterval(timerInterval);

            // Send audio to API after a short delay to ensure all data is collected
            setTimeout(() => {
                sendAudioToAPI();
            }, 500);
        }
    }

    // Update timer display
    function updateTimer() {
        const minutes = Math.floor(recordingTime / 60).toString().padStart(2, '0');
        const seconds = (recordingTime % 60).toString().padStart(2, '0');
        timer.textContent = `${minutes}:${seconds}`;
    }

    // Send audio to API
    async function sendAudioToAPI() {
        try {
            // Create audio blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            // Create form data
            const formData = new FormData();
            formData.append('audio_file', audioBlob, 'recording.webm');

            // Send to API
            status.textContent = 'Sending to API...';

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();                appendTranscription(data.text);
                status.textContent = 'Transcription complete! You can now pose another question.';
                status.className = 'status success';
                // Reset the question has been posed flag
                questionHasBeenPosed = false;
                // Notify user to pose another question
            } else {
                const errorData = await response.json();
                const errorMessage = errorData.detail || `API returned ${response.status}`;
                status.textContent = `Error: ${errorMessage}`;
                status.className = 'status error';
                textOutput.innerHTML = '<p class="placeholder">An error occurred during transcription.</p>';
            }
        } catch (error) {
            console.error('Error sending audio to API:', error);
            status.textContent = `Error: ${error.message}`;
            status.className = 'status error';
            textOutput.innerHTML = '<p class="placeholder">An error occurred during transcription.</p>';
        }
    }
    
    // Display transcription result
    function appendTranscription(text) {
        if (text && text.trim()) {
            // Check if there's already content in the text output
            const currentContent = textOutput.innerHTML;
            const hasContent = currentContent && !currentContent.includes('placeholder');

            // Create the answer element with the current timestamp
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const answerElement = `<div class="user-answer"><span class="answer-timestamp">[${timeStr}]</span> ${text}</div>`;            if (hasContent) {
                // Append to existing content
                textOutput.innerHTML = textOutput.innerHTML + answerElement;
            } else {
                // Replace any placeholder content
                textOutput.innerHTML = answerElement;
            }

            // Scroll to bottom to show the latest content
            scrollTranscriptToBottom();

            // Enable download button
            downloadTranscriptBtn.disabled = false;
        } else {
            // Only replace with placeholder if there is no existing content
            if (!textOutput.innerHTML || textOutput.innerHTML.includes('placeholder')) {
                textOutput.innerHTML = '<p class="placeholder">No speech detected or transcribable content.</p>';

                // Disable download button
                downloadTranscriptBtn.disabled = true;
            }
        }
    }
    
    // Event listener for download transcript button
    downloadTranscriptBtn.addEventListener('click', downloadTranscript);

    // Event listener for question selection
    questionSelect.addEventListener('change', () => {
        currentQuestionId = questionSelect.value;
        const questionObj = document.querySelector(`#questionSelect option[value="${currentQuestionId}"]`);
        currentQuestionText = questionObj.textContent;
        console.log(`Current question updated: ${currentQuestionText}`);
    });

    // Function to download transcript as a text file
    function downloadTranscript() {
        // Get the transcript text
        const transcriptText = textOutput.textContent.trim();        if (!transcriptText || transcriptText === 'Exam transcript will appear here...' ||
            transcriptText === 'No speech detected or transcribable content.') {
            return; // No valid text to download
        }

        // Create a Blob with the transcript text
        const blob = new Blob([transcriptText], { type: 'text/plain' });

        // Create a temporary URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = url;

        // Generate a filename with current date
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
        a.download = `transcript_${dateStr}_${timeStr}.txt`;

        // Append to body, click, and remove
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    // Function to pose a question by sending it to the API
    async function poseQuestion() {
        console.log(`Posing question: ${currentQuestionText}`);
        try {
            // Update the current question ID
            currentQuestionId = questionSelect.value;

            // Update button state
            startQuestionBtn.disabled = true;
            startQuestionBtn.innerHTML = `<span class="question-icon">⏳</span> Processing...`;

            // Send the question ID to the API
            const response = await fetch(`${START_QUESTION_API_URL}${currentQuestionId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error starting question: ${response.statusText}`);
            }
            
            // Get the response data
            const data = await response.json();
            
            // Display the response in the status
            status.textContent = `Question posed.`;
            status.className = 'status success';              // Append the reformulated question to the transcript window
            if (data.reformulated_question) {
                // Check if there's already content in the text output
                const currentContent = textOutput.innerHTML;
                const hasContent = currentContent && !currentContent.includes('placeholder');
                
                // Create the question element with timestamp
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const questionElement = `<div class="posed-question"><span class="question-timestamp">[${timeStr}]</span> ${data.reformulated_question}</div>`;
                  if (hasContent) {
                    // Append the question to the existing content
                    textOutput.innerHTML = textOutput.innerHTML + questionElement;
                } else {
                    // Replace any placeholder content
                    textOutput.innerHTML = questionElement;
                }
                
                // Scroll to bottom to show the latest content
                scrollTranscriptToBottom();
                
                // Enable download button since we now have content
                downloadTranscriptBtn.disabled = false;
                
                // Set the flag to indicate a question has been posed
                questionHasBeenPosed = true;
            }                // Get the text of the current question for history tracking
            const questionObj = document.querySelector(`#questionSelect option[value="${currentQuestionId}"]`);
            currentQuestionText = questionObj.textContent;

            // Restore button state
            startQuestionBtn.disabled = false;
            startQuestionBtn.innerHTML = `<span class="question-icon">▶️</span> Pose Question`;

        } catch (error) {            console.error('Error starting question:', error);
            status.textContent = `Error: ${error.message}`;
            status.className = 'status error';

            // Restore button state
            startQuestionBtn.disabled = false;
            startQuestionBtn.innerHTML = `<span class="question-icon">▶️</span> Pose Question`;
        }
    }    // Event listener for start question button
    startQuestionBtn.addEventListener('click', poseQuestion);
    
    // Event listener for toggle instructions button
    toggleInstructionsBtn.addEventListener('click', () => {
        const isCollapsed = instructionsSection.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            instructionsSection.classList.remove('collapsed');
            toggleInstructionsBtn.textContent = '−';
            toggleInstructionsBtn.title = 'Collapse instructions';
        } else {
            // Collapse
            instructionsSection.classList.add('collapsed');
            toggleInstructionsBtn.textContent = '+';
            toggleInstructionsBtn.title = 'Expand instructions';
        }
    });
});
