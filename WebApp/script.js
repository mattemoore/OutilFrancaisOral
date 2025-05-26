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
    const showInstructionsBtn = document.getElementById('showInstructionsBtn');
    const instructionsModal = document.getElementById('instructionsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const questionColumn = document.getElementById('questionColumn');
    const recordingColumn = document.getElementById('recordingColumn');
      // Current question text and ID
    let currentQuestionId = questionSelect.value;
    let currentQuestionText = '';
    let questionHasBeenPosed = false; // Track if a question has been posed
    let audioIsPlaying = false; // Track if question audio is currently playing
    let currentAudio = null; // Store reference to currently playing audio      // Workflow management functions
    function updateWorkflowState() {
        const questionIndicator = questionColumn.querySelector('.workflow-indicator');
        const recordingIndicator = recordingColumn.querySelector('.workflow-indicator');
        
        if (!questionHasBeenPosed || audioIsPlaying) {
            // Step 1: User needs to pose a question or audio is still playing
            questionColumn.className = 'controls-column question-column active';
            recordingColumn.className = 'controls-column recording-column disabled';
            
            if (audioIsPlaying) {
                questionIndicator.textContent = 'LISTENING';
                recordingIndicator.textContent = 'WAIT';
            } else {
                questionIndicator.textContent = 'NEXT';
                recordingIndicator.textContent = 'NEXT';
            }
        } else {
            // Step 2: User can now record an answer
            questionColumn.className = 'controls-column question-column completed';
            recordingColumn.className = 'controls-column recording-column active';
            questionIndicator.textContent = 'DONE';
            recordingIndicator.textContent = 'NEXT';
        }
    }
    
    // Initialize workflow state
    updateWorkflowState();
    
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
            // Only allow recording if a question has been posed and audio is not playing
            if (!questionHasBeenPosed) {
                status.textContent = 'Please pose a question before recording an answer.';
                status.className = 'status error';
                return;
            }
            
            if (audioIsPlaying) {
                status.textContent = 'Please wait for the question audio to finish playing before recording.';
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
            });            if (response.ok) {
                const data = await response.json();                
                appendTranscription(data.text);                
                status.textContent = 'Transcription complete! You can now pose another question.';
                status.className = 'status success';
                
                // Reset the question and audio states
                questionHasBeenPosed = false;
                audioIsPlaying = false;
                
                // Stop any currently playing audio
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                }
                
                // Update workflow state
                updateWorkflowState();
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
    });    // Function to download transcript as a text file
    function downloadTranscript() {
        // Get all question and answer elements
        const questions = textOutput.querySelectorAll('.posed-question');
        const answers = textOutput.querySelectorAll('.user-answer');
        
        if (questions.length === 0 && answers.length === 0) {
            return; // No valid content to download
        }

        // Build formatted transcript text
        let formattedText = 'SLE Oral Practice Hub - Exam Transcript\n';
        formattedText += '='.repeat(50) + '\n\n';
        
        // Get all transcript entries in order
        const allEntries = Array.from(textOutput.children).filter(child => 
            child.classList.contains('posed-question') || child.classList.contains('user-answer')
        );
          allEntries.forEach((entry, index) => {
            if (entry.classList.contains('posed-question')) {
                const timestamp = entry.querySelector('.question-timestamp')?.textContent || '';
                const questionText = entry.textContent.replace(timestamp, '').trim();
                formattedText += `QUESTION ${timestamp}\n`;
                formattedText += `${questionText}\n\n`;
            } else if (entry.classList.contains('user-answer')) {
                const timestamp = entry.querySelector('.answer-timestamp')?.textContent || '';
                const answerText = entry.textContent.replace(timestamp, '').trim();
                formattedText += `ANSWER ${timestamp}\n`;
                formattedText += `${answerText}\n\n`;
            }
        });
        
        // Add footer
        formattedText += '='.repeat(50) + '\n';
        formattedText += `Generated on: ${new Date().toLocaleString()}\n`;
        formattedText += 'SLE Oral Practice Hub - Practice Session Complete';

        // Create a Blob with the formatted transcript text
        const blob = new Blob([formattedText], { type: 'text/plain' });

        // Create a temporary URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = url;

        // Generate a filename with current date
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
        a.download = `sle_transcript_${dateStr}_${timeStr}.txt`;

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
            status.textContent = `Question posed. Playing audio...`;
            status.className = 'status success';

            // Append the reformulated question to the transcript window
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
            }

            // Play the audio if available
            if (data.audio_base64) {
                await playQuestionAudio(data.audio_base64, data.audio_format || 'mp3');
            } else {
                // If no audio, just set the question as posed
                questionHasBeenPosed = true;
                updateWorkflowState();
            }

            // Get the text of the current question for history tracking
            const questionObj = document.querySelector(`#questionSelect option[value="${currentQuestionId}"]`);
            currentQuestionText = questionObj.textContent;

            // Restore button state
            startQuestionBtn.disabled = false;
            startQuestionBtn.innerHTML = `<span class="question-icon">▶️</span> Pose Question`;

        } catch (error) {
            console.error('Error starting question:', error);
            status.textContent = `Error: ${error.message}`;
            status.className = 'status error';

            // Restore button state
            startQuestionBtn.disabled = false;
            startQuestionBtn.innerHTML = `<span class="question-icon">▶️</span> Pose Question`;
        }
    }

    // Function to play question audio
    async function playQuestionAudio(audioBase64, format) {
        return new Promise((resolve, reject) => {
            try {
                // Stop any currently playing audio
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                }

                // Convert base64 to blob
                const audioBytes = atob(audioBase64);
                const arrayBuffer = new ArrayBuffer(audioBytes.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                for (let i = 0; i < audioBytes.length; i++) {
                    uint8Array[i] = audioBytes.charCodeAt(i);
                }
                
                const blob = new Blob([arrayBuffer], { type: `audio/${format}` });
                const audioUrl = URL.createObjectURL(blob);
                
                // Create and configure audio element
                currentAudio = new Audio(audioUrl);
                audioIsPlaying = true;
                updateWorkflowState();
                
                // Update status
                status.textContent = 'Playing question audio... Please listen carefully.';
                status.className = 'status success';
                
                // Set up event listeners
                currentAudio.addEventListener('ended', () => {
                    audioIsPlaying = false;
                    questionHasBeenPosed = true;
                    updateWorkflowState();
                    
                    // Clean up the object URL
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                    
                    // Update status
                    status.textContent = 'Question audio finished. You may now record your answer.';
                    status.className = 'status success';
                    
                    resolve();
                });
                
                currentAudio.addEventListener('error', (e) => {
                    audioIsPlaying = false;
                    updateWorkflowState();
                    
                    // Clean up the object URL
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                    
                    // Still allow user to proceed even if audio fails
                    questionHasBeenPosed = true;
                    updateWorkflowState();
                    
                    console.error('Audio playback error:', e);
                    status.textContent = 'Audio playback failed, but you can still proceed to record your answer.';
                    status.className = 'status warning';
                    
                    resolve(); // Resolve rather than reject to allow user to continue
                });
                
                // Start playback
                currentAudio.play().catch(error => {
                    console.error('Error playing audio:', error);
                    audioIsPlaying = false;
                    questionHasBeenPosed = true;
                    updateWorkflowState();
                    
                    // Clean up the object URL
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                    
                    status.textContent = 'Could not play audio automatically. You can still proceed to record your answer.';
                    status.className = 'status warning';
                    
                    resolve(); // Resolve to allow user to continue
                });
                
            } catch (error) {
                console.error('Error setting up audio:', error);
                audioIsPlaying = false;
                questionHasBeenPosed = true;
                updateWorkflowState();
                
                status.textContent = 'Audio setup failed, but you can still proceed to record your answer.';
                status.className = 'status warning';
                
                resolve(); // Resolve to allow user to continue
            }
        });
    }// Event listener for start question button
    startQuestionBtn.addEventListener('click', poseQuestion);
    
    // Modal event listeners
    showInstructionsBtn.addEventListener('click', () => {
        instructionsModal.classList.add('show');
    });
    
    closeModalBtn.addEventListener('click', () => {
        instructionsModal.classList.remove('show');
    });
    
    // Close modal when clicking outside of it
    instructionsModal.addEventListener('click', (event) => {
        if (event.target === instructionsModal) {
            instructionsModal.classList.remove('show');
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && instructionsModal.classList.contains('show')) {
            instructionsModal.classList.remove('show');
        }
    });
});
