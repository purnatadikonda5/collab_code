import React, { useContext, useState } from "react";
import axios from "../config/axios.js";

import { Input } from "./Input";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import FloatingDockDesktop from "./FloatingDockDesktop";
import { useNavigate } from "react-router-dom";
import { UserContext } from "@/context/Usercontext.jsx";

import { useGoogleLogin } from "@react-oauth/google";
import { Divide } from "lucide-react";


const Login = () => {
  const {setUser} = useContext(UserContext);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    axios
      .post("/users/login", formData)
      .then((res) => {
        // console.log("response : " ,res);
        // console.log("response data : " ,res.data);
        // console.log("response token  : " ,res.data.token);
        localStorage.setItem("token", res.data.token);
        setUser(res.data.response);
        navigate("/");
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("google response token(line  51) : " ,tokenResponse);
      console.log("Access Token:", tokenResponse.access_token);

      // Fetch user info from Google API

      try {
        console.log("Fetching user data...");
        const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        const data = await res.json();
        console.log("User Data:", data);
        
         const userDetails = {
          email: data.email,           
          firstname: data.given_name,  
          lastname: data.family_name,  
        };
        console.log(userDetails);
        const { email, firstname, lastname } = userDetails;
        // backend token
      axios
          .post(
            "/users/google-register",
        { 
          email,
          firstname,
          lastname,
        },
        { withCredentials: true } // Important for cookies
      )
      .then((res) => {
        console.log("Backend Response:", res.data);

        // Store token in localStorage (if needed)
        localStorage.setItem("token", res.data.token);

        // Set user state
        setUser(res.data.response);

        // Redirect user
        navigate("/");
      })
      .catch((err) => {
        console.error("Error:", err.response?.data || err.message);
      });

      } catch (error) {
        // console.log("hi i am error");
        console.error("Error fetching user data:", error);
      }
    },
    onError: () => console.log("Login Failed"),
    scope: "email profile", 
  });

  return (
    <div className="select-none">
      <FloatingDockDesktop
        visibleItems={{
          home: true,
        }}
        className="fixed top-15 left-[90%] "
      />
      <div className="bg-gradient-to-br from-[#02091B] to-[#014860] min-h-screen flex items-center justify-center p-4 font-serif">
        <div className="w-full max-w-md rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Log In</h2>
            <p className="text-sm text-gray-300">Welcome back to Collab Code</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              className="bg-[#02091B] border-[#00BEDE] text-white"
              required
            />

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Your Password"
                value={formData.password}
                onChange={handleInputChange}
                className="bg-[#02091B] border-[#00BEDE] text-white pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-[#00607A] hover:bg-[#004052] text-white py-3 rounded-lg transition-colors duration-300 font-semibold"
            >
              Log In
            </button>

            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="px-4 text-gray-400 text-sm">or</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full bg-[#00607A] hover:bg-[#004052] text-white py-3 rounded-lg transition-colors duration-300 font-semibold flex items-center justify-center"
            >
              <FaGoogle className="mr-2" /> Continue with Google
            </button>
          </form>

          <div className="text-center text-sm text-gray-300 mt-6">
            Don't have an account?{" "}
            <a href="/signup" className="text-[#00BEDE] hover:underline">
              Sign Up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
