import project_model from "../db/models/project_model.js";
import usermodel from "../db/models/user_model.js";

export async function createuser({ firstname , lastname,email, password, confirmpassword }) {
    if (!email || !password || !firstname) {
        throw new Error('All details must be present');
    }
    if(password !== confirmpassword){
        throw new Error('password and confirm password must be same');
    }

    const user = await usermodel.create({
        firstname,
        lastname,
        email,
        password: await usermodel.hashpassword(password)
    })
    return user;
}


export async function loginuser({ email, password }) {
    try {
        const user = await usermodel.findOne({ email: email }).select("+password");
        if (!user) {
            throw new Error("Invalid credentials");
        }

        const isMatch = await user.isvalidpassword(password);
        if (!isMatch) {
            throw new Error("Invalid credentials");
        }
        return user; 

    } catch (err) {
        return { status: "error", message: err.message };
    }
}

export async function googleuser(email, firstname, lastname) {
    try {
    // console.log(email, firstname, lastname);
        const user = await usermodel.findOne({ email });
        if (user){
            return user;
        }
        else{
            const newuser = await usermodel.create({
                firstname,
                lastname,
                email,
                password:'googleuser'
            })
            return newuser;
        }
    } catch (error) {
        return { status: "error", message: error.message };
    }
}

export const allusersexceptid = async ({ user_id }) => {
    // console.log(user_id);
    try {
      const allusers = await usermodel.find({ _id: { $ne: user_id } });
      return { status: "success", allusers };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  };

export const allusersExceptInProjectid = async ({ project_id }) => {
    console.log(project_id);
    try {
    let project= await project_model.findOne({_id:project_id});
    if(!project){
        return { status: "error", message: error.message };
    }
      let allusers = await usermodel.find({});
      let reqUsers= [];
      allusers.map((user)=>{
        let ff=false;
        project.users.map((projectuser)=>{
            if(projectuser.toString()==user._id.toString()){
                ff=true;
            }
        })
        if(!ff)reqUsers.push(user);
      })
    allusers=reqUsers;
    // console.log(allusers,reqUsers);
      return { status: "success", allusers };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  };
  