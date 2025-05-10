import { Response, Request } from "express";
import { generateUploadUrl, uploadImageFromUrl } from "../utils/bucket";
 

export const getFileUploadUrl = (req: Request, res: Response) => {
  generateUploadUrl()
    .then((url) => {
      res.status(200).json({
        uploadURL: url,
      });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

// export const upload =async(req,res)=>{
//   console.log("api called",req.body);
//     try {
//       const {url} = req.body;
//       console.log("url in upload",url);
//      const response = await uploadImageFromUrl(url);
//      console.log('response',response);
     
//      if(response){
//       res.send({url:response});
//      }
//     } catch (error) {
//       res.send({error:error});
//     }
     
// }

export const uploadImageToS3 =async(url:string,iataCode:string)=>{
  console.log("api called",url);
  
    // try {
      // const {url} = url;
     const response = await uploadImageFromUrl(url);
     console.log('response',response);
     
    //  if(response){
      return response;
      // res.send({url:response});
    //  }
    // } catch (error) {
    //   console.log("error in uploading image",error);
    // }
     
}

const validateImageUrl = (url) => {
  try {
    new URL(url);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = validExtensions.some(ext => url.toLowerCase().endsWith(ext));
    if (!hasValidExtension) throw new Error('Invalid image file extension');
    return true;
  } catch (error) {
    return false;
  }
};

export const upload = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !validateImageUrl(url)) {
      return res.status(400).json({ error: 'Valid image URL is required' });
    }

    const s3Url = await uploadImageFromUrl(url);
    return res.status(201).json({ url: s3Url });

  } catch (error) {
    console.error('Upload error:', error);
    const statusCode = error.response?.status || 500;
    const message = error.message || 'Failed to process image upload';
    return res.status(statusCode).json({ error: message });
  }
};
