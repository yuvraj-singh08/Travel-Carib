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
export const upload =async(req,res)=>{
  console.log("api called",req.body);
    try {
      const {url} = req.body;
     const response = await uploadImageFromUrl(url);
     console.log('response',response);
     
     if(response){
      res.send({url:response});
     }
    } catch (error) {
      res.send({error:error});
    }
     
}

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

// your existing config
