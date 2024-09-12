// ==UserScript==
// @name         WZU Captcha Solver (Grayscale Preprocessing)
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  A script to solve captchas on WZU portal with grayscale preprocessing to improve OCR accuracy
// @author       Your Name
// @match        https://sso.wzu.edu.tw/Portal/login.htm
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@5.0.1/dist/tesseract.min.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Function to preprocess images (convert to grayscale)
    function preprocessImageToGrayscale(img) {
        // Create a canvas element to manipulate image data
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to match the image size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Get the image data from the canvas
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // Convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Convert to grayscale using luminosity formula
            const grayscale = 0.3 * r + 0.59 * g + 0.11 * b;

            // Set the RGB channels to the grayscale value
            data[i] = data[i + 1] = data[i + 2] = grayscale;
        }

        // Put the modified image data back onto the canvas
        ctx.putImageData(imageData, 0, 0);

        return canvas.toDataURL(); // Return the processed image as a data URL
    }

    // Function to solve captcha
    function solveCaptcha() {
        // Select all captcha images inside the span with id "table1"
        const captchaImages = document.querySelectorAll('span#table1 img');

        if (captchaImages.length === 0) {
            console.log('No captcha images found.');
            return;
        }

        // Array to store recognized characters and their respective indices
        let recognizedCharacters = [];

        // Convert NodeList to Array to use promise-based loop and ensure order is maintained
        const imagePromises = Array.from(captchaImages).map((img, index) => {
            // Preprocess the image to grayscale before OCR
            const processedImageSrc = preprocessImageToGrayscale(img);

            // Create a new Image element for Tesseract
            const processedImage = new Image();
            processedImage.src = processedImageSrc;

            return new Promise((resolve) => {
                processedImage.onload = () => {
                    // Use Tesseract to recognize text in each processed captcha image
                    Tesseract.recognize(
                        processedImage,  // Preprocessed Image element
                        'eng',  // Language
                        {
                            logger: (m) => console.log(`Processing Image ${index + 1}:`, m), // Logging progress
                        }
                    ).then(({ data: { text } }) => {
                        let recognizedText = text.trim().toLowerCase();  // Convert recognized text to lowercase

                        // Filter to keep only lowercase letters and numbers
                        recognizedText = recognizedText.replace(/[^a-z0-9]/g, '');

                        // Ensure only one character is stored (in case OCR returns multiple characters)
                        const singleCharacter = recognizedText.charAt(0);

                        console.log(`Recognized text for image ${index + 1}:`, singleCharacter);

                        // Store the recognized character with its index
                        recognizedCharacters.push({ index: index, character: singleCharacter });
                        resolve();
                    }).catch((err) => {
                        console.error(`Error during OCR for image ${index + 1}:`, err);
                        resolve();
                    });
                };
            });
        });

        // Execute all promises and proceed once all are resolved
        Promise.all(imagePromises).then(() => {
            // Sort characters by their original image order index
            recognizedCharacters.sort((a, b) => a.index - b.index);

            // Combine characters into the final captcha solution
            let captchaSolution = recognizedCharacters.map(item => item.character).join('');

            console.log('Final Captcha Solution:', captchaSolution);  // Output the complete captcha solution

            // Automatically fill in the captcha input field
            const captchaInput = document.querySelector('input[name="SYSTEM_MAGICNUMBERTEXT"]');  // Selector for captcha input field
            if (captchaInput) {
                captchaInput.value = captchaSolution;  // Fill in the captcha solution
                console.log('Captcha filled with solution:', captchaSolution);

                // Remove automatic login click; the user must click manually
                console.log('Please click the login button manually.');
            } else {
                console.log('Captcha input field not found.');
            }
        });
    }

    // Wait for the page to load fully and then wait for 1 second before running the solveCaptcha function
    window.onload = () => {
        setTimeout(solveCaptcha, 1000);  // 1000 milliseconds = 1 second
    };
})();
