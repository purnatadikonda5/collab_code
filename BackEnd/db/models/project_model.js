import mongoose, { Schema } from "mongoose";
const  projectSchema = new mongoose.Schema({
    name : {
        type : String ,
        lowercase : true, 
        required : true,
        unique : true,
        trim : true,
    },
    description : {
        type : String ,
        lowercase : true,
        required : true,
        trim : true,
    },
     fileTree : {
        type : Schema.Types.Mixed,
        default : {}
    },
    users  : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "user"
    }]
})
export default mongoose.model("project",projectSchema);   