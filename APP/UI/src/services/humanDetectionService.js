// Human Detection Service using HUM face-api models from /models

let isModelsLoaded = false;
let isLoadingModels = false;

export async function loadHumanModels(modelsPath = "/models") {
  if (isModelsLoaded) return true;
  if (isLoadingModels) return false;

  const faceapi = window.faceapi;
  if (!faceapi) {
    console.warn("faceapi script not loaded yet");
    return false;
  }

  isLoadingModels = true;
  try {
    // Load TinyFaceDetector and AgeGender model from the HUM models folder
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
      faceapi.nets.ageGenderNet.loadFromUri(modelsPath),
    ]);
    isModelsLoaded = true;
    console.log("HUM Face & Gender Detection models loaded successfully from:", modelsPath);
    return true;
  } catch (err) {
    console.error("Failed to load HUM face detection models:", err);
    // Fallback: try loading from CDN if local static is unreachable
    try {
      const cdnPath = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(cdnPath),
        faceapi.nets.ageGenderNet.loadFromUri(cdnPath),
      ]);
      isModelsLoaded = true;
      return true;
    } catch (e2) {
      console.error("Failed CDN fallback for models:", e2);
      return false;
    }
  } finally {
    isLoadingModels = false;
  }
}

export async function detectHumanPresence(videoElement) {
  const faceapi = window.faceapi;
  if (!faceapi || !isModelsLoaded || !videoElement || videoElement.readyState < 2) {
    return null;
  }

  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const result = await faceapi.detectSingleFace(videoElement, options).withAgeAndGender();

    if (result) {
      const isMale = result.gender === "male";
      const honorific = isMale ? "Sir" : "Mam";
      return {
        detected: true,
        gender: result.gender,
        genderProbability: result.genderProbability,
        age: Math.round(result.age),
        honorific: honorific,
        box: result.detection.box,
      };
    }
    return { detected: false };
  } catch (err) {
    console.warn("Face detection error:", err);
    return null;
  }
}
