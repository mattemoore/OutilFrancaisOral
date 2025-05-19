document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const recordButton = document.getElementById('recordButton');
    const buttonText = recordButton.querySelector('.button-text');
    const recordingStatus = document.getElementById('recordingStatus');
    const timer = document.getElementById('timer');
    const textOutput = document.getElementById('textOutput');
    const status = document.getElementById('status');
    const downloadTranscriptBtn = document.getElementById('downloadTranscriptBtn');

    // API endpoint
    const API_URL = 'http://localhost:8000/transcribe/';

    // Recording variables
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let timerInterval;
    let recordingTime = 0;

    // Event listener for record button
    recordButton.addEventListener('click', toggleRecording);

    // Function to toggle recording
    async function toggleRecording() {
        if (!isRecording) {
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
            textOutput.innerHTML = '<p class="placeholder">Recording in progress...</p>';
            status.textContent = '';
            status.className = 'status';
            
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
                const data = await response.json();
                displayTranscription(data.text);
                status.textContent = 'Transcription complete!';
                status.className = 'status success';
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
    }    // Display transcription result
    function displayTranscription(text) {
        if (text && text.trim()) {
            textOutput.innerHTML = `<p>${text}</p>`;
            
            // Enable download button
            downloadTranscriptBtn.disabled = false;
        } else {
            textOutput.innerHTML = '<p class="placeholder">No speech detected or transcribable content.</p>';
            
            // Disable download button
            downloadTranscriptBtn.disabled = true;
        }
    }
    
    // Event listener for download transcript button
    downloadTranscriptBtn.addEventListener('click', downloadTranscript);
    
    // Function to download transcript as a text file
    function downloadTranscript() {
        // Get the transcript text
        const transcriptText = textOutput.textContent.trim();
        
        if (!transcriptText || transcriptText === 'Recording will appear here...' || 
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
});
