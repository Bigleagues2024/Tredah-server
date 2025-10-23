import { sendResponse, uploadToCloudinary } from "../middleware/utils.js";

export async function upload(req, res) {
  const { media, medias } = req.files || {};
  console.log('FILES', req.files);

  if (!media?.[0] && !medias?.[0]) {
    return sendResponse(res, 400, false, null, 'Provide a media file or medias file');
  }

  try {
    let fileUrl;

    // Single media upload
    if (media?.[0]) {
      const result = await uploadToCloudinary(
        media[0]?.buffer,
        'media',
        media[0]?.mimetype?.split('/')[0] // ✅ Fixed here
      );
      fileUrl = result?.secure_url;
    }

    // Multiple media uploads
    let mediaFilesUrls = [];
    if (medias?.length) {
      mediaFilesUrls = await Promise.all(
        medias.map(async (file, index) => {
          try {
            const result = await uploadToCloudinary(
              file.buffer,
              'media',
              file.mimetype?.split('/')[0]
            );
            return result?.secure_url;
          } catch (err) {
            console.error(`Error uploading file ${index}:`, err);
            return null;
          }
        })
      );

      mediaFilesUrls = mediaFilesUrls.filter(Boolean);
    }

    sendResponse(res, 200, true, { fileUrl, mediaFilesUrls }, 'File(s) uploaded successfully');
  } catch (error) {
    console.log('UNABLE TO UPLOAD FILES', error);
    sendResponse(res, 500, false, null, 'Unable to upload files');
  }
}
