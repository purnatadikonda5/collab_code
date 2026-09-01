import { validationResult } from "express-validator";
import * as userservice from "../services/user.services.js";
import usermodel from '../db/models/user_model.js';
export const getuser =(req,res)=>{
  if(!req.user){
    return res.status(400).json({message:"invalid token"});
  } 
  else {
    console.log(req.user);
    return res.status(200).json({user:req.user});
  }
}

export const logincontroller = async (req, res) => {
  console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    else {
        const response = await userservice.loginuser(req.body);
        // console.log(response);

        if (response.status === "error") {
            res.status(401).send(response.message);
        }
        else {
            const token = response.generateJWT();
            res.cookie("token",token);
            delete response._doc.password;
            res.status(200).json({ response, token });
        }
    }
}
export const createusercontroller = async (req, res) => {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    else {
        try {

            const user = await userservice.createuser(req.body);
            const token = user.generateJWT();
            delete user._doc.password;

            res.cookie("token", token, { httpOnly: false });

            res.status(201).json({ user, token });
             
        }
        catch (err) {
            res.status(400).send(err.message);
        }
    }
}



export const googlecontroller = async (req, res) => {
    const { email, firstname, lastname } = req.body;
    const response = await userservice.googleuser(email, firstname, lastname);
    // console.log("gcontroller  "+response); // edbug
    if (response.status === "error") {
      return res.status(400).send(response.message);
    }
    const token = response.generateJWT();
    delete response._doc.password;
    res.cookie("token", token, { httpOnly: false });
    res.status(201).json({ response, token });
  }


export const getallusers = async (req, res) => {
  console.log(req.user);
    try {
      const loggedin_user = req.user?.email;
      if (!loggedin_user) {
        return res.status(401).send("User not logged in.");
      }
      const user = await usermodel.findOne({ email: loggedin_user });
      if (!user) {
        return res.status(404).send("Logged-in user not found.");
      }
      const response = await userservice.allusersexceptid({user_id:user._id}); 
      
      if (response.status === "error") {
        return res.status(400).send(response.message);
      }
  
    //   console.log("The response:", response);
      return res.status(200).send(response.allusers);
  
    } catch (error) {
      return res.status(500).send(error.message); // Changed to 500 for server-side error
  }
};
export const profilecontroller = async (req, res) => {
    res.status(200).json({
        user: req.user
    })
}
export const allusersexceptid = async(userid) =>{
    try {
      if(!userid){
         throw new Error(" project services didnot recieve the userid, may be you are not logged in ");
      }
      const allusers = await usermodel.find({
        _id : { $ne : userid}
      })
    //   console.log(" all users : " , allusers);
      
      return {
        "status" : "success",
        "allusers" : allusers
      };
    } catch (error) {
      return {
       "status" : "error",
       "message" : error.message
      }
    }
   
  }

export const usersexceptinproject=async (req,res)=>{
  let project_id= req.params.id;
  let response= await userservice.allusersExceptInProjectid({project_id});
  if(response.status=='error'){
    res.json(response.message).status(401);
  }
  else return res.json(response.allusers).status(200);
}
export const logoutcontroller = async (req, res) => {
    try {
        const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
        redisclient.set(token,'logout','EX',60*60*24);
        res.status(200).json({
            message : "user logged out successfully"
        })
    }
    catch (err) {
        console.log(err);
        res.status(400).send(err);
    }
}
