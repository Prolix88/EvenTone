Audio Analysis and EQ Assistant

Overview

This project is an audio analysis and EQ assistant web application designed to help audio technicians visualize frequency data, analyze musical notes and chords, and receive dynamic EQ suggestions. It includes features such as real-time frequency visualization, waveform display, spectrogram, musical pitch and chord analysis, and basic recording functionality.

Features

Real-Time Audio Analysis: Start and stop audio analysis to visualize audio input in real-time.

Frequency Visualizer: Visualize frequency data using color-coded bars.

Waveform Visualizer: See the waveform of the incoming audio.

Spectrogram: Displays an ongoing spectrogram for audio content.

EQ Assistance: Dynamic suggestions for EQ adjustments based on the detected audio profile.

Musical Analysis: Pitch detection, chord recognition, and historical note/chord tracking.

Recording Functionality: Record live audio and save it locally as a .webm file.

Getting Started

Prerequisites

A modern web browser (Chrome, Firefox, Edge) that supports the WebAudio API and media permissions.

Installation

Clone the repository:

Navigate into the project directory:

Launch a simple HTTP server to serve the HTML file locally. You can use Python's built-in server:

Open your browser and visit http://localhost:8000 to view the application.

Usage

Click Start Analysis to begin analyzing audio data from your microphone.

Use the Start Recording and Stop Recording buttons to record segments of audio.

EQ Controls allow you to make adjustments to the audio output.

Watch for real-time visualizations and EQ suggestions to enhance your audio quality.

Project Structure

index.html: Main file for HTML content and structure.

style.css: Styling for the visual interface, now extracted into a separate file for better organization.

app.js: JavaScript logic for audio analysis, visualizations, and recording, now extracted into a separate file for better maintainability.

Future Improvements

Improved performance for low-end devices.

Cross-browser testing and compatibility fixes.

Enhanced visual interface with separate CSS.

More sophisticated chord detection algorithms.

Contributing

Contributions are welcome! Feel free to fork this repository, create a branch, make your changes, and submit a pull request.

License

This project is licensed under the MIT License.

Acknowledgments

Pitchfinder.js for pitch detection.

