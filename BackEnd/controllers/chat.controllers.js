import { validationResult } from "express-validator";
import chat from '../db/models/chat_model.js'
import * as chatServices from "../services/chat.services.js"
import usermodel from '../db/models/user_model.js'
export const addChatToProjectid= async (req,res)=>{
    // let errors= validationResult(req);
    // if(!errors.isEmpty()){
    //     return res.status(400).json({errors});
    // }
    let {message}= req.body;
    let projectid= req.body.project;
    console.log(projectid);
    let loggedin_user= await usermodel.findOne({email:req.user.email});
    console.log(loggedin_user);
    let newmessage={
        email:req.user.email,
        sender:loggedin_user._id,
        project:projectid,
        message:message,
    }
    let response= await chatServices.addchat(newmessage);
    if(response.status=='error'){
        return res.status(400).json({message:"error"});
    }
    console.log(response);
    return res.status(200).json({message:response.message});
}   

export const editchat=async(req,res)=>{
    let {message,id}= req.body;
    console.log(id,message);
    try {
        let response =await chatServices.editMsg({id,userid:req.user.email,message});
        if(response.status=="error"){
            res.status(400).json({message:response.message});
        }
        res.status(200).json({message:"Message Has Been edited Successfully"});
    } catch (error) {
        res.status(400).json({message:error.message});
    }
}

export const deleteMessage=async(req,res)=>{
    let {id}= req.body;
    console.log(id,req.user.email);
    try {
        let response =await chatServices.deleteMsg({id,userid:req.user.email});
        if(response.status=="error"){
            res.status(400).json({message:response.message});
        }
        res.status(200).json({message:"Message Has Been Deleted Successfully"});
    } catch (error) {
        res.status(400).json({message:error.message});
    }
}
export const getChatById= async(req,res)=>{
    let {projectid}=req.body;
    // console.log(projectid);
    try {
        let response= await chatServices.getchat(projectid);
        if(response.status=='error'){
            return res.status(400).json({message:response.message});
        }
        // console.log(response);
        return res.json(response.chats).status(200);
    } catch (error) {
        return res.status(400).json({message:error.message});
    }
}