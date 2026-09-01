import axios from "../config/axios.js";
import React, { useState,useContext } from "react";
import { Input } from "./Input";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import FloatingDockDesktop from "./FloatingDockDesktop";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext.jsx";

import { useGoogleLogin } from "@react-oauth/google";

const Signup = () => {
  const navigate = useNavigate();
  const  {user,setUser}  = useContext(UserContext);

  const [showPassword, setShowPassword] = useState(false);
  const [showconfirmpassword, setShowconfirmpassword] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confirmpassword: "",
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
    if (formData.password !== formData.confirmpassword) {
      alert("Passwords do not match!");
      return;
    }
    // console.log(import.meta.env.VITE_API_URL);
    console.log("Form submitted:", formData);

    axios
      .post("/users/register", formData)
      .then((res) => {
        console.log(res.data);
        localStorage.setItem("token", res.data.token);
        setUser(res.data);
        navigate("/");
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log(tokenResponse)
      console.log("Access Token:", tokenResponse.access_token);

      // Fetch user info from Google API
      try {
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
        //backend token
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
        console.error("Error fetching user data:", error);
      }
    },
    onError: () => console.log("Login Failed"),
    scope: "email profile", 
  });

  const togglePasswordVisibility = (type) => {
    if (type === "password") {
      setShowPassword(!showPassword);
    } else {
      setShowconfirmpassword(!showconfirmpassword);
    }
  };

  return (
    <div className="select-none ">
      <FloatingDockDesktop
        visibleItems={{
          home: true,
        }}
        className="fixed top-15 left-[90%] "
      />
      <div className="bg-gradient-to-br from-[#014860] to-[#02091B] min-h-screen flex items-center justify-center p-4 font-serif ">
        <div className="w-full max-w-md rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Create Account
            </h2>
            <p className="text-sm text-gray-300">
              Join Collab Code - Your Digital Workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="firstname"
                  type="text"
                  placeholder="First Name"
                  value={formData.firstname}
                  onChange={handleInputChange}
                  className="bg-[#02091B] border-[#00BEDE] text-white"
                  required
                />
              </div>
              <div>
                <Input
                  id="lastname"
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastname}
                  onChange={handleInputChange}
                  className="bg-[#02091B] border-[#00BEDE] text-white"
                  required
                />
              </div>
            </div>

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
                onClick={() => togglePasswordVisibility("password")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="relative">
              <Input
                id="confirmpassword"
                type={showconfirmpassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={formData.confirmpassword}
                onChange={handleInputChange}
                className="bg-[#02091B] border-[#00BEDE] text-white pr-12"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirmpassword")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showconfirmpassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-[#00607A] hover:bg-[#004052] text-white py-3 rounded-lg transition-colors duration-300 font-semibold"
            >
              Create Account
            </button>

            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="px-4 text-gray-400 text-sm">or</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full bg-[#00607A] hover:bg-[#004052]  text-white py-3 rounded-lg transition-colors duration-300 font-semibold flex items-center justify-center"
            >
              <FaGoogle className="mr-2" /> Continue with Google
            </button>
          </form>

          <div className="text-center text-sm text-gray-300 mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-[#00BEDE] hover:underline">
              Log In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
