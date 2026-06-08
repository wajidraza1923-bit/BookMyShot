const cloudinary = require("cloudinary").v2;

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder (e.g. "bookmyshot/avatars")
 * @param {string} options.resourceType - "image" or "video"
 * @param {string} [options.publicId] - Optional custom public_id
 * @returns {Promise<{url: string, publicId: string, format: string}>}
 */
async function uploadBuffer(buffer, options = {}) {
  if (!isConfigured()) {
    console.warn("[Cloudinary] Not configured — skipping upload");
    return { url: "", publicId: "", format: "" };
  }

  const { folder = "bookmyshot", resourceType = "image", publicId } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: resourceType,
      quality: "auto",
      fetch_format: "auto",
    };
    if (publicId) uploadOptions.public_id = publicId;

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error("[Cloudinary] Upload error:", error.message);
        return reject(error);
      }
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
      });
    });

    stream.end(buffer);
  });
}

/**
 * Upload a base64 data URL to Cloudinary
 * @param {string} dataUrl - Base64 data URL (data:image/png;base64,...)
 * @param {Object} options - Upload options
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadBase64(dataUrl, options = {}) {
  if (!isConfigured()) {
    console.warn("[Cloudinary] Not configured — returning original data");
    return { url: dataUrl, publicId: "" };
  }

  const { folder = "bookmyshot", resourceType = "image" } = options;

  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: resourceType,
      quality: "auto",
      fetch_format: "auto",
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error("[Cloudinary] Base64 upload error:", error.message);
    throw error;
  }
}

/**
 * Delete a file from Cloudinary by public_id
 * @param {string} publicId - Cloudinary public_id
 * @param {string} resourceType - "image" or "video"
 */
async function deleteFile(publicId, resourceType = "image") {
  if (!isConfigured() || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error("[Cloudinary] Delete error:", error.message);
  }
}

/**
 * Check if a URL is a Cloudinary URL
 */
function isCloudinaryUrl(url) {
  return url && url.includes("res.cloudinary.com");
}

module.exports = {
  cloudinary,
  isConfigured,
  uploadBuffer,
  uploadBase64,
  deleteFile,
  isCloudinaryUrl,
};
