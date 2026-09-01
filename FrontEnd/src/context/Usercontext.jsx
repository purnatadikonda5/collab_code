import { createContext, useEffect, useState } from "react";
import PropTypes from "prop-types"; // Add this import
import axios from "@/config/axios";
export const UserContext = createContext();


 const Context = ({ children }) => {
  // Destructure children from props
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // To prevent flickering

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log(token);
    if (token) {
      axios
        .get("users/auth/me") 
        .then((res) => {
          // console.log("i am the data",res.data.user);
          setUser(res.data.user);
        })
        .catch((err) => {
          console.error("Error fetching user:", err);
          localStorage.removeItem("token"); // Remove invalid token
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);
  if (loading) {
    return <div>Loading...</div>; // Prevent rendering until loading is done
  }
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
Context.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Context;
